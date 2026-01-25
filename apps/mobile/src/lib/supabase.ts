import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jvcgepjqhbczpaqaajjw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2Y2dlcGpxaGJjenBhcWFhamp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODY2NzgsImV4cCI6MjA4NDg2MjY3OH0.Ld8xUUcdcjqFRyDyWCu9cM6CqhLvxPbidvNBDXaCgRE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Database types
export interface Profile {
    id: string;
    email: string;
    full_name: string;
    reg_number: string | null;
    role: 'student' | 'instructor';
    face_encoding: number[] | null;
    is_face_registered: boolean;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Class {
    id: string;
    instructor_id: string;
    course_code: string;
    title: string;
    description: string | null;
    schedule: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Enrollment {
    student_id: string;
    class_id: string;
    enrolled_at: string;
}

export interface AttendanceLog {
    id: string;
    student_id: string;
    class_id: string;
    session_id: string | null;
    timestamp: string;
    status: 'present' | 'late' | 'absent';
    confidence: number | null;
    created_at: string;
}

export interface AttendanceSession {
    id: string;
    class_id: string;
    instructor_id: string;
    started_at: string;
    ended_at: string | null;
    is_active: boolean;
    late_threshold_minutes: number;
}
