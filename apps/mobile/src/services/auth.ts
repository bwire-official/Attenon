// Authentication service using Supabase
import { supabase, Profile } from '../lib/supabase';
import { getCurrentUser } from './session';

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
export async function signUp({ email, password }: SignUpData): Promise<AuthResponse> {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error || !data.user) {
            return { success: false, error: error?.message || 'Failed to create user' };
        }

        const profile = await getCurrentUser();
        return { success: true, user: profile || undefined };
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

        if (error || !data.user) {
            return { success: false, error: error?.message || 'Failed to log in' };
        }

        const profile = await getCurrentUser();
        return { success: true, user: profile || undefined };
    } catch (err: any) {
        return { success: false, error: err?.message || 'An unexpected error occurred' };
    }
}

// Log out the current user.
export async function logout(): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

// Get the current user's profile.
export async function getCurrentProfile(): Promise<Profile | null> {
    return getCurrentUser();
}

// Update the current user's profile.
export async function updateProfile(updates: Partial<Profile>): Promise<AuthResponse> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { success: false, error: 'Not authenticated' };

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', session.user.id)
            .select()
            .single();

        if (error) return { success: false, error: error.message };
        return { success: true, user: data as Profile };
    } catch (err) {
        return { success: false, error: 'Update failed' };
    }
}

// Reset password for a user.
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err) {
        return { success: false, error: 'Reset failed' };
    }
}
