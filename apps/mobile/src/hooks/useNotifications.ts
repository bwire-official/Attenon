import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AppNotification {
    id: string;
    user_id: string;
    type: 'attendance_session_started' | 'student_attended' | 'system';
    title: string;
    message: string;
    data: any;
    is_read: boolean;
    created_at: string;
}

/**
 * Hook to manage in-app notifications using Supabase Realtime.
 * NO POLLING - uses real-time subscriptions.
 */
export function useNotifications(userId: string | null) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchNotifications = useCallback(async () => {
        if (!userId) return;

        try {
            // Fetch notifications list (limited)
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Fetch true unread count
            const { count, error: countError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (countError) throw countError;

            setNotifications(data || []);
            setUnreadCount(count || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const markAsRead = async (notificationId: string) => {
        const current = notifications.find(n => n.id === notificationId);
        if (current?.is_read) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId);

            if (error) throw error;

            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        if (!userId) return;
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);

            if (error) throw error;

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        fetchNotifications();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`notifications-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    console.log('[Realtime] Notification change:', payload);
                    if (payload.eventType === 'INSERT') {
                        const newNotification = payload.new as AppNotification;
                        setNotifications(prev => [newNotification, ...prev]);
                        setUnreadCount(prev => prev + 1);
                    } else {
                        // Re-fetch on updates/deletes for simplicity
                        fetchNotifications();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId, fetchNotifications]);

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications
    };
}
