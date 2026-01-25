import { supabase } from '../lib/supabase';
import type { StudentRegistration } from '../lib/supabase';

interface RegistrationResponse {
    success: boolean;
    error?: string;
    message?: string;
}

function sanitizeString(value: string, maxLength: number): string {
    return value.trim().slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhoneNumber(phone: string | undefined): boolean {
    if (!phone) return true;
    const phoneRegex = /^[\d\s\-+()]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export async function registerStudent(data: StudentRegistration): Promise<RegistrationResponse> {
    try {
        if (!data.email || !data.full_name || !data.reg_number || !data.department || !data.faculty || !data.level) {
            return {
                success: false,
                error: 'All required fields must be provided',
            };
        }

        const sanitizedEmail = data.email.toLowerCase().trim();
        if (!isValidEmail(sanitizedEmail)) {
            return {
                success: false,
                error: 'Please provide a valid email address',
            };
        }
        if (sanitizedEmail.length > 255) {
            return {
                success: false,
                error: 'Email address is too long',
            };
        }

        const sanitizedFullName = sanitizeString(data.full_name, 200);
        if (sanitizedFullName.length < 2) {
            return {
                success: false,
                error: 'Full name must be at least 2 characters',
            };
        }

        const regNumberUpper = data.reg_number.toUpperCase().trim();
        if (!regNumberUpper.startsWith('RU')) {
            return {
                success: false,
                error: 'Registration number must start with "RU" (e.g., RU021023...)',
            };
        }
        if (regNumberUpper.length < 10 || regNumberUpper.length > 50) {
            return {
                success: false,
                error: 'Registration number must be between 10 and 50 characters',
            };
        }

        const sanitizedDepartment = sanitizeString(data.department, 200);
        const sanitizedFaculty = sanitizeString(data.faculty, 200);
        const sanitizedLevel = sanitizeString(data.level, 50);

        if (data.phone_number && !isValidPhoneNumber(data.phone_number)) {
            return {
                success: false,
                error: 'Please provide a valid phone number',
            };
        }
        const sanitizedPhone = data.phone_number ? sanitizeString(data.phone_number, 20) : null;

        const emailExists = await checkEmailExists(sanitizedEmail);
        if (emailExists) {
            return {
                success: false,
                error: 'This email is already registered. Please use a different email address.',
            };
        }

        const regNumberExists = await checkRegNumberExists(regNumberUpper);
        if (regNumberExists) {
            return {
                success: false,
                error: 'This registration number is already in use. Please verify your registration number.',
            };
        }
        const { error: insertError } = await supabase
            .from('allowed_users')
            .insert({
                email: sanitizedEmail,
                full_name: sanitizedFullName,
                reg_number: regNumberUpper,
                role: 'student',
                department: sanitizedDepartment,
                faculty: sanitizedFaculty,
                level: sanitizedLevel,
                phone_number: sanitizedPhone,
            });

        if (insertError) {
            console.error('Registration error:', insertError);
            
            if (insertError.code === '23505') {
                return {
                    success: false,
                    error: 'This email or registration number is already registered.',
                };
            }

            return {
                success: false,
                error: 'Failed to complete registration. Please try again.',
            };
        }

        return {
            success: true,
            message: 'Registration successful! You can now download the Attenon mobile app and sign up with your email.',
        };
    } catch (error) {
        console.error('Unexpected registration error:', error);
        return {
            success: false,
            error: 'An unexpected error occurred. Please check your connection and try again.',
        };
    }
}

export async function checkEmailExists(email: string): Promise<boolean> {
    try {
        const emailToCheck = email.toLowerCase().trim().slice(0, 255);
        if (!emailToCheck || !isValidEmail(emailToCheck)) {
            return false;
        }
        
        const { data, error } = await supabase
            .rpc('check_email_exists', { email_to_check: emailToCheck });

        if (error) {
            console.error('[checkEmailExists] Error:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('[checkEmailExists] Unexpected error:', error);
        return false;
    }
}

export async function checkRegNumberExists(regNumber: string): Promise<boolean> {
    try {
        const regToCheck = regNumber.toUpperCase().trim().slice(0, 50);
        if (!regToCheck || regToCheck.length < 10) {
            return false;
        }
        
        const { data, error } = await supabase
            .rpc('check_reg_number_exists', { reg_number_to_check: regToCheck });

        if (error) {
            console.error('[checkRegNumberExists] Error:', error);
            return false;
        }

        return data === true;
    } catch (error) {
        console.error('[checkRegNumberExists] Unexpected error:', error);
        return false;
    }
}
