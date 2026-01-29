import { supabase } from '../lib/supabase';

export interface InstructorStats {
    todayClasses: number;
    totalStudents: number;
    activeCourses: number;
}

export interface RecentSession {
    id: string;
    class_id: string;
    started_at: string;
    is_active: boolean;
    class_title: string;
    course_code: string;
}

//Get aggregated statistics for the instructor dashboard
export async function getInstructorStats(instructorId: string): Promise<InstructorStats> {
    try {
        // 1. Get Active Courses
        const { data: activeCoursesData, error: coursesError } = await supabase
            .from('classes')
            .select('id, schedule')
            .eq('instructor_id', instructorId)
            .eq('is_active', true);

        if (coursesError) throw coursesError;

        const activeCourses = activeCoursesData?.length || 0;
        const courseIds = activeCoursesData?.map(c => c.id) || [];

        // 2. Calculate Today's Classes
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayClasses = activeCoursesData?.filter(c =>
            c.schedule && c.schedule.toLowerCase().includes(today.toLowerCase())
        ).length || 0;

        // 3. Calculate Total Unique Students across all taught classes
        // We need to count unique student_ids in enrollments for these classes
        let totalStudents = 0;
        if (courseIds.length > 0) {
            // Fetch student_ids to count unique students
            const { data: enrollments, error: countError } = await supabase
                .from('enrollments')
                .select('student_id')
                .in('class_id', courseIds);

            if (!countError && enrollments) {
                // Use Set to count unique student IDs
                const uniqueStudents = new Set(enrollments.map(e => e.student_id));
                totalStudents = uniqueStudents.size;
            }
        }

        return {
            todayClasses,
            totalStudents,
            activeCourses
        };

    } catch (error) {
        console.error('Error getting instructor stats:', error);
        return {
            todayClasses: 0,
            totalStudents: 0,
            activeCourses: 0
        };
    }
}

//Get recent class sessions for the dashboard
export async function getInstructorRecentSessions(instructorId: string, limit = 3): Promise<RecentSession[]> {
    try {
        const { data, error } = await supabase
            .from('attendance_sessions')
            .select(`
                id,
                started_at,
                is_active,
                class_id,
                classes (
                    title,
                    course_code
                )
            `)
            .eq('instructor_id', instructorId)
            .order('started_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((session: any) => ({
            id: session.id,
            class_id: session.class_id,
            started_at: session.started_at,
            is_active: session.is_active,
            class_title: session.classes?.title || 'Unknown Class',
            course_code: session.classes?.course_code || '???'
        }));

    } catch (error) {
        console.error('Error fetching recent sessions:', error);
        return [];
    }
}

// Get the total number of students enrolled in a specific class
export async function getClassStudentCount(classId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('enrollments')
            .select('student_id', { count: 'exact', head: true })
            .eq('class_id', classId);

        if (error) throw error;
        return count || 0;
    } catch (error) {
        console.error('Error getting class student count:', error);
        return 0;
    }
}

export interface InstructorStudent {
    id: string;
    full_name: string;
    email: string;
    reg_number?: string;
    department?: string;
    level?: string;
    avatar_url?: string;
}

// Get all students enrolled in the instructor's classes
export async function getInstructorStudents(instructorId: string): Promise<InstructorStudent[]> {
    try {
        // 1. Get Instructor's Class IDs
        const { data: classes, error: classError } = await supabase
            .from('classes')
            .select('id')
            .eq('instructor_id', instructorId);

        if (classError) throw classError;

        const classIds = classes?.map(c => c.id) || [];
        if (classIds.length === 0) return [];

        // 2. Get Student IDs from Enrollments
        const { data: enrollments, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('student_id')
            .in('class_id', classIds);

        if (enrollmentError) throw enrollmentError;

        const studentIds = [...new Set(enrollments?.map(e => e.student_id) || [])];
        if (studentIds.length === 0) return [];

        // 3. Get Profiles
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', studentIds)
            .order('full_name');

        if (profileError) throw profileError;

        return profiles?.map(p => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            reg_number: p.reg_number,
            department: p.department,
            level: p.level,
            avatar_url: p.avatar_url
        })) || [];

    } catch (error) {
        console.error('Error getting instructor students:', error);
        return [];
    }
}

export interface StudentCourse {
    id: string;
    course_code: string;
    title: string;
    department: string;
    level: string;
}

export interface AttendanceRecord {
    id: string;
    date: string;
    course_code: string;
    title: string;
    status: 'present' | 'late' | 'absent';
    session_id: string;
}

export interface StudentDetails {
    profile: InstructorStudent;
    courses: StudentCourse[];
    attendance: AttendanceRecord[];
}

export interface AttendanceHistorySession {
    id: string;
    class_id: string;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number;
    is_active: boolean;
    course_code: string;
    course_title: string;
    present_count: number;
    absent_count: number;
    total_enrolled: number;
    attendance_rate: number;
}

// Get full attendance history for instructor
export async function getInstructorAttendanceHistory(instructorId: string): Promise<AttendanceHistorySession[]> {
    try {
        // Fetch all sessions for this instructor with class info
        const { data: sessions, error: sessionsError } = await supabase
            .from('attendance_sessions')
            .select(`
                id,
                class_id,
                started_at,
                ended_at,
                duration_minutes,
                is_active,
                classes (
                    title,
                    course_code
                )
            `)
            .eq('instructor_id', instructorId)
            .order('started_at', { ascending: false });

        if (sessionsError) throw sessionsError;
        if (!sessions || sessions.length === 0) return [];

        // For each session, get attendance stats
        const historyWithStats = await Promise.all(
            sessions.map(async (session: any) => {
                // Get attendance logs for this session
                const { data: logs } = await supabase
                    .from('attendance_logs')
                    .select('status')
                    .eq('session_id', session.id);

                // Get total enrolled for the class
                const { count: totalEnrolled } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', session.class_id);

                const presentCount = logs?.filter(l => l.status === 'present').length || 0;
                const absentCount = logs?.filter(l => l.status === 'absent').length || 0;
                const total = totalEnrolled || 0;
                const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

                return {
                    id: session.id,
                    class_id: session.class_id,
                    started_at: session.started_at,
                    ended_at: session.ended_at,
                    duration_minutes: session.duration_minutes || 0,
                    is_active: session.is_active,
                    course_code: session.classes?.course_code || 'N/A',
                    course_title: session.classes?.title || 'Unknown Course',
                    present_count: presentCount,
                    absent_count: absentCount,
                    total_enrolled: total,
                    attendance_rate: attendanceRate,
                };
            })
        );

        return historyWithStats;
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        return [];
    }
}

export async function getInstructorStudentDetails(instructorId: string, studentId: string): Promise<StudentDetails | null> {
    try {
        // 1. Get Student Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', studentId)
            .single();

        if (profileError || !profile) throw profileError || new Error('Student not found');

        // 2. Get Courses (Instructor's classes that student is enrolled in)
        // First get instructor classes
        const { data: instructorClasses } = await supabase
            .from('classes')
            .select('*')
            .eq('instructor_id', instructorId);

        const instructorClassIds = instructorClasses?.map(c => c.id) || [];

        if (instructorClassIds.length === 0) {
            return {
                profile: { ...profile, full_name: profile.full_name },
                courses: [],
                attendance: []
            };
        }

        // Check which of these the student is enrolled in
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('student_id', studentId)
            .in('class_id', instructorClassIds);

        const enrolledClassIds = enrollments?.map(e => e.class_id) || [];
        const sharedCourses = instructorClasses?.filter(c => enrolledClassIds.includes(c.id))
            .map(c => ({
                id: c.id,
                course_code: c.course_code || '',
                title: c.title,
                department: c.department || '',
                level: c.level || ''
            })) || [];

        // 3. Get Attendance History
        // Get sessions for these courses
        const { data: sessions } = await supabase
            .from('attendance_sessions')
            .select('id, class_id, start_time')
            .in('class_id', enrolledClassIds)
            .order('start_time', { ascending: false });

        const sessionIds = sessions?.map(s => s.id) || [];

        // Get logs for this student in these sessions
        // using 'verified_at' as presence indicator. If record exists, they were verified (present).
        // If we tracked 'absent', we'd need a different approach. Assuming existence = Present for now.
        let attendanceHistory: AttendanceRecord[] = [];

        if (sessionIds.length > 0) {
            const { data: logs } = await supabase
                .from('attendance_logs')
                .select('session_id, verified_at')
                .eq('student_id', studentId)
                .in('session_id', sessionIds);

            const verifiedSessionIds = new Set(logs?.map(l => l.session_id));

            attendanceHistory = sessions?.map(session => {
                const isPresent = verifiedSessionIds.has(session.id);
                const course = instructorClasses?.find(c => c.id === session.class_id);
                return {
                    id: session.id,
                    date: session.start_time,
                    course_code: course?.course_code || '',
                    title: course?.title || '',
                    status: (isPresent ? 'present' : 'absent') as 'present' | 'absent',
                    session_id: session.id
                };
            }) || [];
        }

        return {
            profile: { ...profile, full_name: profile.full_name },
            courses: sharedCourses,
            attendance: attendanceHistory // Currently only shows 'Present' records based on logs
        };

    } catch (error) {
        console.error('Error fetching student details:', error);
        return null;
    }
}
