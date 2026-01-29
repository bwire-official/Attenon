import { useEffect, useState, useCallback } from 'react';
import { supabase, AttendanceLog, Profile } from '../lib/supabase';

export interface SessionAttendee extends AttendanceLog {
    profile: Profile;
}

/**
 * Hook to subscribe to students marking attendance in a specific session.
 * NO POLLING - uses real-time subscriptions.
 */
export function useSessionAttendance(sessionId: string | null) {
    const [attendees, setAttendees] = useState<SessionAttendee[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAttendees = useCallback(async () => {
        if (!sessionId) return;

        try {
            const { data, error } = await supabase
                .from('attendance_logs')
                .select(`
                    *,
                    profiles (*)
                `)
                .eq('session_id', sessionId)
                .order('timestamp', { ascending: false });

            if (error) throw error;

            const mapped = (data || []).map((log: any) => ({
                ...log,
                profile: log.profiles,
            }));

            setAttendees(mapped);
        } catch (err) {
            console.error('Error fetching session attendees:', err);
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) {
            setAttendees([]);
            setLoading(false);
            return;
        }

        fetchAttendees();

        // Subscribe to real-time changes
        const channel = supabase
            .channel(`session-logs-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'attendance_logs',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    console.log('[Realtime] New attendance log:', payload);
                    // Re-fetch to get profile info (Supabase Realtime doesn't support Joins in payload)
                    fetchAttendees();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, fetchAttendees]);

    return {
        attendees,
        loading,
        refresh: fetchAttendees
    };
}
