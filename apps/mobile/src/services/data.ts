// Data service for classes, enrollments, and attendance
import { supabase, Class, Enrollment, AttendanceLog, AttendanceSession, Profile } from '../lib/supabase';

// ========== CLASSES ==========

// Get all active classes.
export async function getClasses(): Promise<Class[]> {
    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('is_active', true)
        .order('course_code');

    if (error) {
        console.error('Error fetching classes:', error);
        return [];
    }
    return data || [];
}

// Get classes taught by an instructor.
export async function getInstructorClasses(instructorId: string): Promise<Class[]> {
    const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('instructor_id', instructorId)
        .order('course_code');

    if (error) {
        console.error('Error fetching instructor classes:', error);
        return [];
    }
    return data || [];
}

// Get classes a student is enrolled in.
export async function getStudentClasses(studentId: string): Promise<(Class & { enrollment: Enrollment })[]> {
    const { data, error } = await supabase
        .from('enrollments')
        .select(`
            *,
            classes (*)
        `)
        .eq('student_id', studentId);

    if (error) {
        console.error('Error fetching student classes:', error);
        return [];
    }

    return (data || []).map((enrollment: any) => ({
        ...enrollment.classes,
        enrollment: {
            student_id: enrollment.student_id,
            class_id: enrollment.class_id,
            enrolled_at: enrollment.enrolled_at,
        },
    }));
}

// Create a new class.
export async function createClass(classData: Omit<Class, 'id' | 'created_at' | 'updated_at'>): Promise<Class | null> {
    const { data, error } = await supabase
        .from('classes')
        .insert(classData)
        .select()
        .single();

    if (error) {
        console.error('Error creating class:', error);
        return null;
    }
    return data;
}

// ========== ENROLLMENTS ==========

// Get students enrolled in a class.
export async function getClassStudents(classId: string): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('enrollments')
        .select(`
            profiles (*)
        `)
        .eq('class_id', classId);

    if (error) {
        console.error('Error fetching class students:', error);
        return [];
    }

    return (data || []).map((enrollment: any) => enrollment.profiles);
}

// Enroll a student in a class.
export async function enrollStudent(studentId: string, classId: string): Promise<boolean> {
    const { error } = await supabase
        .from('enrollments')
        .insert({ student_id: studentId, class_id: classId });

    if (error) {
        console.error('Error enrolling student:', error);
        return false;
    }
    return true;
}

// Remove a student from a class.
export async function unenrollStudent(studentId: string, classId: string): Promise<boolean> {
    const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', classId);

    if (error) {
        console.error('Error unenrolling student:', error);
        return false;
    }
    return true;
}

// ========== ATTENDANCE SESSIONS ==========

// Start an attendance session for a class.
export async function startAttendanceSession(classId: string, instructorId: string): Promise<AttendanceSession | null> {
    const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
            class_id: classId,
            instructor_id: instructorId,
            is_active: true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error starting session:', error);
        return null;
    }
    return data;
}

// End an attendance session.
export async function endAttendanceSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
        .from('attendance_sessions')
        .update({
            is_active: false,
            ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

    if (error) {
        console.error('Error ending session:', error);
        return false;
    }
    return true;
}

// Get active session for a class.
export async function getActiveSession(classId: string): Promise<AttendanceSession | null> {
    const { data, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .single();

    if (error) {
        return null;
    }
    return data;
}

// ========== ATTENDANCE LOGS ==========

// Log attendance for a student.
export async function logAttendance(
    studentId: string,
    classId: string,
    sessionId: string,
    status: 'present' | 'late' | 'absent',
    confidence?: number
): Promise<AttendanceLog | null> {
    const { data, error } = await supabase
        .from('attendance_logs')
        .insert({
            student_id: studentId,
            class_id: classId,
            session_id: sessionId,
            status,
            confidence,
        })
        .select()
        .single();

    if (error) {
        console.error('Error logging attendance:', error);
        return null;
    }
    return data;
}

// Get attendance history for a student.
export async function getStudentAttendance(studentId: string): Promise<AttendanceLog[]> {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
            *,
            classes (course_code, title)
        `)
        .eq('student_id', studentId)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching attendance:', error);
        return [];
    }
    return data || [];
}

// Get attendance for a class session.
export async function getSessionAttendance(sessionId: string): Promise<(AttendanceLog & { profile: Profile })[]> {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select(`
            *,
            profiles (*)
        `)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

    if (error) {
        console.error('Error fetching session attendance:', error);
        return [];
    }

    return (data || []).map((log: any) => ({
        ...log,
        profile: log.profiles,
    }));
}

// Get attendance statistics for a student.
export async function getStudentStats(studentId: string): Promise<{
    total: number;
    present: number;
    late: number;
    absent: number;
    percentage: number;
}> {
    const { data, error } = await supabase
        .from('attendance_logs')
        .select('status')
        .eq('student_id', studentId);

    if (error || !data) {
        return { total: 0, present: 0, late: 0, absent: 0, percentage: 0 };
    }

    const stats = {
        total: data.length,
        present: data.filter(log => log.status === 'present').length,
        late: data.filter(log => log.status === 'late').length,
        absent: data.filter(log => log.status === 'absent').length,
        percentage: 0,
    };

    if (stats.total > 0) {
        stats.percentage = ((stats.present + stats.late) / stats.total) * 100;
    }

    return stats;
}
