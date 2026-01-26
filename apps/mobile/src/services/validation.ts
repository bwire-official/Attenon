// Validation service for checking allowed users
import { supabase } from '../lib/supabase';

export interface AllowedUser {
    email: string;
    full_name: string;
    reg_number: string | null;
    role: 'student' | 'instructor';
}

export interface ValidationResult {
    success: boolean;
    isAllowed: boolean;
    user?: AllowedUser;
    error?: string;
}

// Check if an email or registration number exists in the allowed_users table
// Uses secure RPC function to prevent SQL injection and enumeration attacks
export async function checkAllowedUser(
    emailOrRegNumber: string
): Promise<ValidationResult> {
    try {
        // Input validation
        const trimmedInput = emailOrRegNumber.trim();
        
        if (!trimmedInput || trimmedInput.length === 0) {
            return {
                success: false,
                isAllowed: false,
                error: 'Please enter a valid email or registration number.',
            };
        }

        if (trimmedInput.length > 255) {
            return {
                success: false,
                isAllowed: false,
                error: 'Input is too long. Please check and try again.',
            };
        }

        const { data, error } = await supabase.rpc('check_user_allowed', {
            input_value: trimmedInput,
        });

        if (error) {
            console.error('Validation error:', error);
            return {
                success: false,
                isAllowed: false,
                error: 'Failed to validate user. Please try again.',
            };
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                success: true,
                isAllowed: false,
                error:
                    'Your email or registration number is not authorized. Please visit the student portal to register first.',
            };
        }

        const result = data[0];

        if (!result.is_allowed) {
            return {
                success: true,
                isAllowed: false,
                error:
                    'Your email or registration number is not authorized. Please visit the student portal to register first.',
            };
        }

        return {
            success: true,
            isAllowed: true,
            user: {
                email: result.email,
                full_name: result.full_name,
                reg_number: result.reg_number,
                role: result.role as 'student' | 'instructor',
            },
        };
    } catch (err) {
        console.error('Unexpected validation error:', err);
        // Don't expose error details
        return {
            success: false,
            isAllowed: false,
            error: 'An unexpected error occurred. Please try again.',
        };
    }
}

// Validate email format
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

// Validate password strength
export function validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}
