import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface PendingSession {
    id: string;
    class_id: string;
    started_at: string;
    expires_at: string;
    duration_minutes: number;
    course_code: string;
    course_title: string;
}

/**
 * Hook to subscribe to pending attendance sessions for a student using Supabase Realtime.
 * NO POLLING - uses real-time subscriptions.
 */
export function usePendingAttendance(studentId: string | null) {
    const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({});
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Update time remaining for all sessions
    const updateTimeRemaining = useCallback((sessions: PendingSession[]) => {
        const now = Date.now();
        const newTimes: Record<string, number> = {};

        sessions.forEach(session => {
            const expiresAt = new Date(session.expires_at).getTime();
            const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            newTimes[session.id] = remaining;
        });

        setTimeRemaining(newTimes);

        // Filter out expired sessions
        const activeSessions = sessions.filter(s => newTimes[s.id] > 0);
        if (activeSessions.length !== sessions.length) {
            setPendingSessions(activeSessions);
        }
    }, []);

    // Start countdown timer
    useEffect(() => {
        if (pendingSessions.length > 0) {
            updateTimeRemaining(pendingSessions);
            timerRef.current = setInterval(() => {
                updateTimeRemaining(pendingSessions);
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [pendingSessions, updateTimeRemaining]);

    // Fetch and subscribe to pending sessions
    useEffect(() => {
        if (!studentId) {
            setPendingSessions([]);
            setLoading(false);
            return;
        }

        let isMounted = true;

        const fetchPendingSessions = async () => {
            try {
                const now = new Date().toISOString();

                // Get classes the student is enrolled in
                const { data: enrollments, error: enrollError } = await supabase
                    .from('enrollments')
                    .select('class_id')
                    .eq('student_id', studentId);

                if (enrollError) {
                    console.error('Error fetching enrollments:', enrollError);
                    if (isMounted) setLoading(false);
                    return;
                }

                if (!enrollments || enrollments.length === 0) {
                    if (isMounted) {
                        setPendingSessions([]);
                        setLoading(false);
                    }
                    return;
                }

                const classIds = enrollments.map(e => e.class_id);

                // Get active sessions for enrolled classes
                const { data: sessions, error: sessionsError } = await supabase
                    .from('attendance_sessions')
                    .select(`
                        id,
                        class_id,
                        started_at,
                        expires_at,
                        duration_minutes,
                        classes (
                            course_code,
                            title
                        )
                    `)
                    .eq('is_active', true)
                    .in('class_id', classIds)
                    .gt('expires_at', now)
                    .order('started_at', { ascending: false });

                if (sessionsError) {
                    console.error('Error fetching sessions:', sessionsError);
                    if (isMounted) setLoading(false);
                    return;
                }

                if (isMounted) {
                    // Check if student already marked attendance
                    const sessionIds = (sessions || []).map(s => s.id);
                    if (sessionIds.length > 0) {
                        const { data: attendedLogs } = await supabase
                            .from('attendance_logs')
                            .select('session_id')
                            .eq('student_id', studentId)
                            .in('session_id', sessionIds);

                        const attendedSessionIds = new Set((attendedLogs || []).map(l => l.session_id));

                        const pendingOnly = (sessions || [])
                            .filter(s => !attendedSessionIds.has(s.id))
                            .map(s => ({
                                id: s.id,
                                class_id: s.class_id,
                                started_at: s.started_at,
                                expires_at: s.expires_at,
                                duration_minutes: s.duration_minutes,
                                course_code: (s.classes as any)?.course_code || '',
                                course_title: (s.classes as any)?.title || '',
                            }));

                        setPendingSessions(pendingOnly);
                    } else {
                        setPendingSessions([]);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('Pending sessions fetch error:', err);
                if (isMounted) setLoading(false);
            }
        };

        fetchPendingSessions();

        // Subscribe to realtime changes on attendance_sessions AND attendance_logs
        const channel = supabase
            .channel(`pending-attendance-${studentId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attendance_sessions',
                },
                (payload) => {
                    console.log('[Realtime] Session change:', payload);
                    fetchPendingSessions();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'attendance_logs',
                    filter: `student_id=eq.${studentId}`,
                },
                (payload) => {
                    console.log('[Realtime] New attendance log for student:', payload);
                    fetchPendingSessions();
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, [studentId]);

    // Format time remaining as MM:SS
    const formatTimeRemaining = useCallback((sessionId: string) => {
        const remaining = timeRemaining[sessionId] || 0;
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, [timeRemaining]);

    return {
        pendingSessions,
        loading,
        timeRemaining,
        formatTimeRemaining,
        hasPending: pendingSessions.length > 0,
    };
}
