// Session management service for persistent authentication
import { supabase, Profile } from '../lib/supabase';

export interface SessionState {
    isAuthenticated: boolean;
    user: Profile | null;
    loading: boolean;
}

/**
 * Initialize and check current session.
 * This should be called on app startup to restore the user's session.
 */
export async function initializeSession(): Promise<SessionState> {
    try {
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            return {
                isAuthenticated: false,
                user: null,
                loading: false,
            };
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            // User is logged in but profile fetch failed - force re-authentication
            return {
                isAuthenticated: false,
                user: null,
                loading: false,
            };
        }

        return {
            isAuthenticated: true,
            user: profile as Profile,
            loading: false,
        };
    } catch (err) {
        console.error('Session initialization error:', err);
        return {
            isAuthenticated: false,
            user: null,
            loading: false,
        };
    }
}

/**
 * Get the current user's profile
 */
export async function getCurrentUser(): Promise<Profile | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) return null;
        return profile as Profile;
    } catch (err) {
        return null;
    }
}

/**
 * Get the current access token for API requests
 */
export async function getAccessToken(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    } catch (err) {
        return null;
    }
}

/**
 * Check if the current session is valid
 */
export async function isSessionValid(): Promise<boolean> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session !== null;
    } catch (err) {
        return false;
    }
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) return { success: false, error: 'Refresh failed' };
        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Clear the current session (logout)
 */
export async function clearSession(): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) return { success: false, error: error.message };
        return { success: true };
    } catch (err) {
        return { success: false, error: 'An unexpected error occurred' };
    }
}

/**
 * Listen to auth state changes
 */
export function onSessionChange(
    callback: (isAuthenticated: boolean, user: Profile | null) => void
) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
        if (!session) {
            callback(false, null);
            return;
        }

        // Fetch profile if we have a session
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        callback(true, profile as Profile | null);
    });
}
