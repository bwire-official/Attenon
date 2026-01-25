import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    throw new Error('Missing environment variable: VITE_SUPABASE_URL');
}

if (!supabaseAnonKey) {
    throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export interface AllowedUser {
    email: string;
    full_name: string;
    reg_number: string | null;
    role: 'student' | 'instructor';
    department: string | null;
    faculty: string | null;
    level: string | null;
    phone_number: string | null;
    created_at: string;
}

export interface StudentRegistration {
    email: string;
    full_name: string;
    reg_number: string;
    department: string;
    faculty: string;
    level: string;
    phone_number?: string;
}
