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
        // Get current session from storage
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
            console.error('Profile fetch error:', profileError);
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
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
            return null;
        }

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error || !profile) {
            console.error('Get current user error:', error);
            return null;
        }

        return profile as Profile;
    } catch (err) {
        console.error('Unexpected get user error:', err);
        return null;
    }
}

/**
 * Check if the current session is valid
 */
export async function isSessionValid(): Promise<boolean> {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();
        return session !== null;
    } catch (err) {
        return false;
    }
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { data, error } = await supabase.auth.refreshSession();

        if (error || !data.session) {
            return {
                success: false,
                error: 'Failed to refresh session',
            };
        }

        return { success: true };
    } catch (err) {
        console.error('Session refresh error:', err);
        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
}

/**
 * Clear the current session (logout)
 */
export async function clearSession(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return {
                success: false,
                error: error.message,
            };
        }

        return { success: true };
    } catch (err) {
        console.error('Session clear error:', err);
        return {
            success: false,
            error: 'An unexpected error occurred',
        };
    }
}

/**
 * Listen to auth state changes
 */
export function onSessionChange(
    callback: (isAuthenticated: boolean, user: Profile | null) => void
) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            callback(false, null);
            return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Fetch profile
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching profile in onSessionChange:', error);

                // If "PGRST116" (No rows found), user happens to have no profile row yet -> Authenticated.
                // For other errors (network/server), we also keep them authenticated to avoid forced logout.
                // Future improvement: Implement backoff/retry for transient errors.
                if (error.code === 'PGRST116' || error.message?.includes('JSON')) {
                    callback(true, null);
                } else {
                    callback(true, null);
                }
            } else {
                callback(true, profile as Profile | null);
            }
        }
    });
}
