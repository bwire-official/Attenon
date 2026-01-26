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
            console.error('Login error:', error);
            // Provide user-friendly error messages
            if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
                return { success: false, error: 'Invalid email or password. Please check your credentials and try again.' };
            }
            if (error.message.includes('Email not confirmed')) {
                return { success: false, error: 'Please verify your email address before logging in.' };
            }
            return { success: false, error: error.message };
        }

        if (!data.user) {
            console.error('No user data returned');
            return { success: false, error: 'Failed to log in' };
        }

        console.log('Login successful, fetching profile...');
        // Fetch the profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error('Profile fetch error:', profileError);
            return { success: false, error: profileError.message };
        }

        console.log('Profile fetched successfully');
        return { success: true, user: profile };
    } catch (err: any) {
        console.error('Login exception:', err);
        console.error('Error type:', err?.constructor?.name);
        console.error('Error message:', err?.message);

        // Handle network errors
        if (err?.message?.includes('Network request failed') || err?.message?.includes('fetch') || err?.code === 'NETWORK_ERROR') {
            return { success: false, error: 'Network error: Please check your internet connection. If the problem persists, verify your Supabase configuration.' };
        }

        // Handle other errors
        return { success: false, error: err?.message || 'An unexpected error occurred. Please try again.' };
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

// Reset password for a user.
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'attenon://reset-password',
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Listen to auth state changes.
export function onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
}
