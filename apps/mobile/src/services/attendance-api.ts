import { API_CONFIG } from '../lib/config';
import { getAccessToken, getCurrentUser } from './session';
import { supabase } from '../lib/supabase';

interface StartSessionResponse {
    success: boolean;
    session_id: string;
    message: string;
    error?: string;
}

interface MarkAttendanceResponse {
    success: boolean;
    status: string;
    message: string;
    error?: string;
}
export const AttendanceApi = {
    /**
     * Start an automatic attendance session (Instructor only)
     */
    startSession: async (class_id: string, duration_minutes: number): Promise<StartSessionResponse> => {
        try {
            console.log(`[AttendanceApi] Starting session for class: ${class_id} (${duration_minutes} mins)`);

            const user = await getCurrentUser();
            if (!user) return { success: false, session_id: '', message: '', error: 'Not authenticated' };

            // We use Supabase directly for starting the session.
            // This is faster and avoids 404s if the Python backend is only for Face AI.
            // The DB triggers we added will handle creating the notifications for students.
            const { data, error } = await supabase
                .from('attendance_sessions')
                .insert({
                    class_id,
                    instructor_id: user.id,
                    duration_minutes,
                    is_active: true,
                    started_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('[AttendanceApi] Supabase insert error:', error);
                return { success: false, session_id: '', message: '', error: error.message };
            }

            console.log('[AttendanceApi] Session started successfully:', data.id);
            return {
                success: true,
                session_id: data.id,
                message: 'Session started successfully'
            };

        } catch (error: any) {
            console.error('[AttendanceApi] Start session error:', error);
            return { success: false, session_id: '', message: '', error: error.message || 'Network error' };
        }
    },

    /**
     * End an attendance session (Instructor only)
     */
    endSession: async (sessionId: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('attendance_sessions')
                .update({
                    is_active: false,
                    ended_at: new Date().toISOString()
                })
                .eq('id', sessionId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('[AttendanceApi] End session error:', error);
            return false;
        }
    },

    /**
     * Mark all students who didn't sign as absent when session ends
     */
    markAbsentStudents: async (sessionId: string, classId: string): Promise<number> => {
        try {
            console.log(`[AttendanceApi] Marking absent students for session: ${sessionId}`);

            // 1. Get all enrolled students for this class
            const { data: enrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select('student_id')
                .eq('class_id', classId);

            if (enrollError) {
                console.error('[AttendanceApi] Error fetching enrollments:', enrollError);
                return 0;
            }

            if (!enrollments || enrollments.length === 0) {
                console.log('[AttendanceApi] No enrolled students found');
                return 0;
            }

            const allStudentIds = enrollments.map(e => e.student_id);

            // 2. Get students who already have ANY attendance record (present OR absent)
            const { data: existingLogs, error: logsError } = await supabase
                .from('attendance_logs')
                .select('student_id')
                .eq('session_id', sessionId);

            if (logsError) {
                console.error('[AttendanceApi] Error fetching attendance logs:', logsError);
                return 0;
            }

            const existingStudentIds = new Set((existingLogs || []).map(l => l.student_id));

            // 3. Find students who have no record at all (need to be marked absent)
            const absentStudentIds = allStudentIds.filter(id => !existingStudentIds.has(id));

            if (absentStudentIds.length === 0) {
                console.log('[AttendanceApi] All enrolled students already have records');
                return 0;
            }

            console.log(`[AttendanceApi] Marking ${absentStudentIds.length} students as absent`);

            // 4. Create absent records for each student
            const absentRecords = absentStudentIds.map(studentId => ({
                session_id: sessionId,
                class_id: classId,
                student_id: studentId,
                status: 'absent',
                timestamp: new Date().toISOString(),
                confidence: 0,
            }));

            const { error: insertError } = await supabase
                .from('attendance_logs')
                .insert(absentRecords);

            if (insertError) {
                console.error('[AttendanceApi] Error inserting absent records:', insertError);
                return 0;
            }

            console.log(`[AttendanceApi] Successfully marked ${absentStudentIds.length} students as absent`);
            return absentStudentIds.length;

        } catch (error) {
            console.error('[AttendanceApi] Mark absent error:', error);
            return 0;
        }
    },

    /**
     * Check for expired sessions and mark absent students
     * @param classIds - Array of class IDs to check
     * @param currentUserId - If provided, only marks this user as absent (for student context)
     *                        If not provided, marks ALL absent students (for instructor context)
     */
    processExpiredSessions: async (classIds: string[], currentUserId?: string): Promise<void> => {
        try {
            if (!classIds || classIds.length === 0) return;

            const now = new Date().toISOString();

            // Find sessions that have expired but might not have absent records yet
            const { data: expiredSessions, error } = await supabase
                .from('attendance_sessions')
                .select('id, class_id, expires_at')
                .in('class_id', classIds)
                .lt('expires_at', now)
                .order('expires_at', { ascending: false })
                .limit(10); // Only check recent sessions

            if (error || !expiredSessions) {
                console.error('[AttendanceApi] Error fetching expired sessions:', error);
                return;
            }

            // Process each expired session
            for (const session of expiredSessions) {
                // Close the session if still marked active
                await supabase
                    .from('attendance_sessions')
                    .update({ is_active: false, ended_at: session.expires_at })
                    .eq('id', session.id)
                    .eq('is_active', true);

                if (currentUserId) {
                    // Student context: Only mark THIS user as absent if they don't have a record
                    await AttendanceApi.markUserAbsentIfNeeded(session.id, session.class_id, currentUserId);
                } else {
                    // Instructor context: Mark ALL absent students
                    await AttendanceApi.markAbsentStudents(session.id, session.class_id);
                }
            }
        } catch (error) {
            console.error('[AttendanceApi] Process expired sessions error:', error);
        }
    },

    /**
     * Mark a single user as absent if they don't have any attendance record for the session
     */
    markUserAbsentIfNeeded: async (sessionId: string, classId: string, userId: string): Promise<boolean> => {
        try {
            // Check if user already has a record for this session
            const { data: existingLog } = await supabase
                .from('attendance_logs')
                .select('id')
                .eq('session_id', sessionId)
                .eq('student_id', userId)
                .maybeSingle();

            if (existingLog != null) {
                // User already has a record, skip
                return false;
            }

            // Create absent record for this user
            const { error: insertError } = await supabase
                .from('attendance_logs')
                .insert({
                    session_id: sessionId,
                    class_id: classId,
                    student_id: userId,
                    status: 'absent',
                    timestamp: new Date().toISOString(),
                    confidence: 0,
                });

            if (insertError) {
                console.error('[AttendanceApi] Error inserting user absent record:', insertError);
                return false;
            }

            console.log(`[AttendanceApi] Marked user ${userId} as absent for session ${sessionId}`);
            return true;
        } catch (error) {
            console.error('[AttendanceApi] markUserAbsentIfNeeded error:', error);
            return false;
        }
    },

    /**
     * Mark self attendance with face verification (Student only)
     */
    markSelfAttendance: async (sessionId: string, imageUri: string): Promise<MarkAttendanceResponse> => {
        try {
            const token = await getAccessToken();
            if (!token) return { success: false, status: '', message: '', error: 'Not authenticated' };

            const formData = new FormData();
            formData.append('session_id', sessionId);
            // React Native file format
            formData.append('file', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'attendance_face.jpg',
            } as any);

            const url = `${API_CONFIG.FACE_API_URL}/attendance/mark-attendance-self`;
            console.log(`[AttendanceApi] Calling verification: ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            let response;
            let data;

            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true',
                    },
                    body: formData,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                const text = await response.text();
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    data = { detail: text || response.statusText };
                }

            } catch (err: any) {
                clearTimeout(timeoutId);
                const msg = err.name === 'AbortError' ? 'Request timed out' : (err.message || 'Network error');
                throw new Error(msg);
            }

            if (!response.ok) {
                return {
                    success: false,
                    status: '',
                    message: data.detail || 'Verification failed',
                    error: data.detail,
                };
            }

            return {
                success: true,
                status: data.status,
                message: data.message,
            };

        } catch (error: any) {
            console.error('Mark attendance error:', error);
            return { success: false, status: '', message: '', error: error.message || 'Network error' };
        }
    }
};
