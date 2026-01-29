import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface ActiveSession {
    id: string;
    class_id: string;
    started_at: string;
    expires_at: string;
    duration_minutes: number;
    is_active: boolean;
    course_code?: string;
    course_title?: string;
    attended_count?: number;
    total_enrolled?: number;
}

// Hook to subscribe to active attendance sessions for an instructor using Supabase Realtime.
// Supports MULTIPLE active sessions.
export function useActiveSession(instructorId: string | null) {
    const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});
    const [sessionExpired, setSessionExpired] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSessionsRef = useRef<ActiveSession[]>([]);

    // Calculate time remaining for all sessions
    const updateTimeRemaining = useCallback((sessions: ActiveSession[]) => {
        const now = Date.now();
        const newTimes: Record<string, number> = {};

        sessions.forEach(session => {
            if (!session.expires_at) {
                newTimes[session.id] = 0;
                return;
            }

            const expiresAt = new Date(session.expires_at).getTime();
            const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            newTimes[session.id] = remaining;

            // Detect when timer hits 0 and notify (for the first one that expires)
            if (remaining === 0) {
                const wasTracked = lastSessionsRef.current.find(s => s.id === session.id);
                if (wasTracked && !sessionExpired) {
                    setSessionExpired(session.id);
                }
            }
        });

        setTimeRemaining(newTimes);

        // Filter out expired sessions from the UI
        const activeSessions = sessions.filter(s => newTimes[s.id] > 0);
        if (activeSessions.length !== sessions.length) {
            setActiveSessions(activeSessions);
        }
    }, [sessionExpired]);

    // Start countdown timer
    useEffect(() => {
        if (activeSessions.length > 0) {
            lastSessionsRef.current = activeSessions;
            updateTimeRemaining(activeSessions);
            timerRef.current = setInterval(() => {
                updateTimeRemaining(activeSessions);
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [activeSessions, updateTimeRemaining]);

    // Clear expired session flag after it's been consumed
    const clearExpiredSession = useCallback(() => {
        setSessionExpired(null);
    }, []);

    // Fetch and subscribe to active sessions
    useEffect(() => {
        if (!instructorId) {
            setActiveSessions([]);
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchActiveSessions = async () => {
            try {
                const now = new Date().toISOString();

                const { data, error } = await supabase
                    .from('attendance_sessions')
                    .select(`
                        id,
                        class_id,
                        started_at,
                        expires_at,
                        duration_minutes,
                        is_active,
                        classes!inner (
                            course_code,
                            title,
                            instructor_id
                        )
                    `)
                    .eq('is_active', true)
                    .eq('classes.instructor_id', instructorId)
                    .gt('expires_at', now)
                    .order('started_at', { ascending: false });

                if (isMounted) {
                    if (error) {
                        console.error('Error fetching active sessions:', error);
                        setActiveSessions([]);
                    } else if (data && data.length > 0) {
                        const sessions: ActiveSession[] = data.map((item: any) => ({
                            id: item.id,
                            class_id: item.class_id,
                            started_at: item.started_at,
                            expires_at: item.expires_at,
                            duration_minutes: item.duration_minutes,
                            is_active: item.is_active,
                            course_code: item.classes?.course_code,
                            course_title: item.classes?.title,
                        }));
                        setActiveSessions(sessions);
                    } else {
                        setActiveSessions([]);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('Active sessions fetch error:', err);
                if (isMounted) setLoading(false);
            }
        };

        fetchActiveSessions();

        // Subscribe to realtime changes on attendance_sessions
        const channel = supabase
            .channel(`active-sessions-${instructorId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendance_sessions',
                },
                (payload) => {
                    console.log('[Realtime] Session change:', payload);
                    fetchActiveSessions();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [instructorId]);

    // Format time remaining as MM:SS for a specific session
    const formatTimeRemaining = useCallback((sessionId?: string) => {
        // If no sessionId provided and there's only one session, use that
        const id = sessionId || (activeSessions.length === 1 ? activeSessions[0].id : null);
        if (!id) return '00:00';

        const remaining = timeRemaining[id] || 0;
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, [timeRemaining, activeSessions]);

    // For backward compatibility, also expose the first session as activeSession
    const activeSession = activeSessions.length > 0 ? activeSessions[0] : null;

    return {
        activeSession, // First active session (backward compatibility)
        activeSessions, // All active sessions
        loading,
        timeRemaining: activeSession ? timeRemaining[activeSession.id] || 0 : 0, // For single session (backward compat)
        timeRemainingMap: timeRemaining, // For multiple sessions
        formatTimeRemaining,
        sessionExpired,
        clearExpiredSession,
        hasActiveSessions: activeSessions.length > 0,
    };
}
