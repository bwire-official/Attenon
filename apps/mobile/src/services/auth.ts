// Authentication service using Supabase
import { supabase, Profile } from '../lib/supabase';

export interface SignUpData {
    email: string;
    password: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface AuthResponse {
    success: boolean;
    user?: Profile;
    error?: string;
}

// Sign up a new user.
// User must be in the allowed_users whitelist.
export async function signUp({ email, password }: SignUpData): Promise<AuthResponse> {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data.user) {
            return { success: false, error: 'Failed to create user' };
        }

        // Fetch the profile (created by trigger)
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            return { success: false, error: profileError.message };
        }

        return { success: true, user: profile };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Log in an existing user.
export async function login({ email, password }: LoginData): Promise<AuthResponse> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        if (!data.user) {
            return { success: false, error: 'Failed to log in' };
        }

        // Fetch the profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            return { success: false, error: profileError.message };
        }

        return { success: true, user: profile };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Log out the current user.
export async function logout(): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Get the current session.
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
        return null;
    }
    return data.session;
}

// Get the current user's profile.
export async function getCurrentProfile(): Promise<Profile | null> {
    const session = await getSession();
    if (!session) {
        return null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error) {
        return null;
    }

    return data;
}

// Update the current user's profile.
export async function updateProfile(updates: Partial<Profile>): Promise<AuthResponse> {
    const session = await getSession();
    if (!session) {
        return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, user: data };
}

// Listen to auth state changes.
export function onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
}
