import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables from Expo Constants
// In Expo, use EXPO_PUBLIC_ prefix for public env vars
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
                    process.env.EXPO_PUBLIC_SUPABASE_URL || 
                    '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
                        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                        '';

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase configuration. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file or app.json extra config.'
    );
}

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
    department: string | null;
    faculty: string | null;
    level: string | null;
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
    classes?: {
        course_code: string;
        title: string;
    } | null;
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
