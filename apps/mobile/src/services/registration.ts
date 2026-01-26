// Registration service with multi-step flow
import { supabase } from '../lib/supabase';
import { AllowedUser } from './validation';

export interface RegistrationData {
    emailOrRegNumber: string;
    password: string;
    allowedUser: AllowedUser;
}

export interface RegistrationResult {
    success: boolean;
    userId?: string;
    email?: string;
    role?: 'student' | 'instructor';
    needsEmailVerification?: boolean;
    error?: string;
}

/**
 * Register a new user with Supabase Auth.
 * The database trigger will automatically create their profile.
 */
export async function registerUser({
    emailOrRegNumber,
    password,
    allowedUser,
}: RegistrationData): Promise<RegistrationResult> {
    try {
        // Use the email from the allowed_users record
        const email = allowedUser.email;

        // Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: 'attenon://verify-email',
                data: {
                    full_name: allowedUser.full_name,
                    reg_number: allowedUser.reg_number,
                    role: allowedUser.role,
                },
            },
        });

        if (error) {
            console.error('Registration error:', error);

            // Handle specific error cases
            if (error.message.includes('already registered')) {
                return {
                    success: false,
                    error: 'This email is already registered. Please sign in instead.',
                };
            }

            return {
                success: false,
                error: error.message || 'Failed to create account. Please try again.',
            };
        }

        if (!data.user) {
            return {
                success: false,
                error: 'Failed to create account. Please try again.',
            };
        }

        // Check if email confirmation is required
        const needsEmailVerification = !data.session;

        return {
            success: true,
            userId: data.user.id,
            email: email,
            role: allowedUser.role,
            needsEmailVerification,
        };
    } catch (err) {
        console.error('Unexpected registration error:', err);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}

/**
 * Verify email with OTP code sent to user's email
 */
export async function verifyEmailWithCode(
    email: string,
    code: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: code,
            type: 'signup',
        });

        if (error) {
            console.error('Verification error:', error);
            return {
                success: false,
                error: 'Invalid or expired code. Please try again.',
            };
        }

        if (!data.session) {
            return {
                success: false,
                error: 'Verification failed. Please try again.',
            };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected verification error:', err);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}

/**
 * Resend verification code to user's email
 */
export async function resendVerificationCode(
    email: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
        });

        if (error) {
            console.error('Resend error:', error);
            return {
                success: false,
                error: 'Failed to resend code. Please try again.',
            };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected resend error:', err);
        return {
            success: false,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}
