import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_KEY = 'app_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const APP_LOCKED_KEY = 'app_locked';

// Simple implementation of a salted hash since direct PBKDF2 isn't available in standard Expo Crypto without polyfills
async function hashPIN(pin: string, salt: string): Promise<string> {
    const iterations = 5000; // Slow down the hash
    let hash = pin + salt;
    for (let i = 0; i < iterations; i++) {
        hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
    }
    return hash;
}

export interface BiometricType {
    available: boolean;
    type: LocalAuthentication.AuthenticationType[];
}
// ... checkBiometricAvailability ...
// (I will skip unchanged parts by using chunks if possible, but replace_file_content is single block usually unless multi is used. I'll use multi_replace to be precise and safe).

// wait, I can't restart the thought mid-tool-argument generation.
// I'll switch to multi_replace_file_content.

const PIN_SALT = 'attenon-mobile-secure-salt-v1'; // Ideally this should be per-user or env var, but constant salt prevents rainbow tables somewhat if not known to attacker, though per-user is best. Given constraints, using a fixed app salt.

export interface BiometricType {
    available: boolean;
    type: LocalAuthentication.AuthenticationType[];
}

export async function checkBiometricAvailability(): Promise<BiometricType> {
    try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
            return { available: false, type: [] };
        }

        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        return {
            available: types.length > 0,
            type: types,
        };
    } catch (error) {
        console.error('Error checking biometric availability:', error);
        return { available: false, type: [] };
    }
}

export async function authenticateWithBiometric(): Promise<boolean> {
    try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
            console.error('Biometric hardware not available');
            return false;
        }

        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
            console.error('No biometrics enrolled on device');
            return false;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to unlock Attenon',
            cancelLabel: 'Cancel',
            fallbackLabel: 'Use PIN',
            disableDeviceFallback: false,
        });

        if (!result.success) {
            const errorMessage = (result as any).error || 'Authentication failed';
            if (errorMessage !== 'user_cancel' && errorMessage !== 'app_cancel') {
                console.error('Biometric authentication error:', errorMessage);
            }
            return false;
        }

        return result.success;
    } catch (error) {
        console.error('Error authenticating with biometric:', error);
        return false;
    }
}

export async function savePIN(pin: string): Promise<boolean> {
    try {
        const hashed = await hashPIN(pin, PIN_SALT);
        await SecureStore.setItemAsync(PIN_KEY, hashed);
        return true;
    } catch (error) {
        console.error('Error saving PIN:', error);
        return false;
    }
}

export async function getPIN(): Promise<string | null> {
    try {
        const pin = await SecureStore.getItemAsync(PIN_KEY);
        return pin;
    } catch (error) {
        console.error('Error getting PIN:', error);
        return null;
    }
}

export async function verifyPIN(pin: string): Promise<boolean> {
    try {
        const savedPIN = await getPIN();
        if (!savedPIN) return false;

        const hashed = await hashPIN(pin, PIN_SALT);
        return savedPIN === hashed;
    } catch (error) {
        console.error('Error verifying PIN:', error);
        return false;
    }
}

export async function hasPIN(): Promise<boolean> {
    try {
        const pin = await getPIN();
        return pin !== null && pin.length > 0;
    } catch (error) {
        console.error('Error checking PIN:', error);
        return false;
    }
}

export async function deletePIN(): Promise<boolean> {
    try {
        await SecureStore.deleteItemAsync(PIN_KEY);
        await setBiometricEnabled(false);
        return true;
    } catch (error) {
        console.error('Error deleting PIN:', error);
        return false;
    }
}

export async function setBiometricEnabled(enabled: boolean): Promise<boolean> {
    try {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
        return true;
    } catch (error) {
        console.error('Error setting biometric enabled:', error);
        return false;
    }
}

export async function isBiometricEnabled(): Promise<boolean> {
    try {
        const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return value === 'true';
    } catch (error) {
        console.error('Error getting biometric enabled:', error);
        return false;
    }
}

export async function setAppLocked(locked: boolean): Promise<void> {
    try {
        await SecureStore.setItemAsync(APP_LOCKED_KEY, locked ? 'true' : 'false');
    } catch (error) {
        console.error('Error setting app locked:', error);
    }
}

export async function isAppLocked(): Promise<boolean> {
    try {
        const value = await SecureStore.getItemAsync(APP_LOCKED_KEY);
        return value === 'true';
    } catch (error) {
        console.error('Error getting app locked:', error);
        return false;
    }
}

export async function shouldShowLockScreen(): Promise<boolean> {
    try {
        const hasPin = await hasPIN();
        if (!hasPin) {
            return false;
        }

        const locked = await isAppLocked();
        return locked;
    } catch (error) {
        console.error('Error checking if should show lock screen:', error);
        return false;
    }
}

export async function unlockApp(): Promise<void> {
    await setAppLocked(false);
}

export function validatePIN(pin: string): { valid: boolean; error?: string } {
    if (!pin) {
        return { valid: false, error: 'PIN cannot be empty' };
    }
    const trimmedPin = pin.trim();
    if (trimmedPin.length === 0) {
        return { valid: false, error: 'PIN cannot be empty' };
    }
    if (trimmedPin.length !== 6) {
        return { valid: false, error: 'PIN must be 6 digits' };
    }
    if (!/^\d{6}$/.test(trimmedPin)) {
        return { valid: false, error: 'PIN must contain only numbers' };
    }
    return { valid: true };
}

export function getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
    if (types.length === 0) {
        return 'Biometric';
    }
    const type = types[0];
    if (type === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
        return 'Face ID';
    }
    if (type === LocalAuthentication.AuthenticationType.FINGERPRINT) {
        return 'Fingerprint';
    }
    if (type === LocalAuthentication.AuthenticationType.IRIS) {
        return 'Iris';
    }
    return 'Biometric';
}

export function getBiometricIconName(typeName: string): string {
    if (typeName && typeName.includes('Face')) {
        return 'face-recognition';
    }
    return 'finger-print';
}

export async function setupPINWithValidation(pin: string, confirmPin: string): Promise<{ success: boolean; error?: string }> {
    const trimmedPin = pin.trim();
    const trimmedConfirmPin = confirmPin.trim();

    const pinValidation = validatePIN(trimmedPin);
    if (!pinValidation.valid) {
        return { success: false, error: pinValidation.error };
    }

    const confirmValidation = validatePIN(trimmedConfirmPin);
    if (!confirmValidation.valid) {
        return { success: false, error: confirmValidation.error };
    }

    if (trimmedPin !== trimmedConfirmPin) {
        return { success: false, error: 'PINs do not match. Please try again.' };
    }

    const saved = await savePIN(trimmedPin);
    if (!saved) {
        return { success: false, error: 'Failed to save PIN. Please try again.' };
    }

    return { success: true };
}

export async function verifyPINWithValidation(pin: string): Promise<{ success: boolean; error?: string }> {
    const trimmedPin = pin.trim();
    const validation = validatePIN(trimmedPin);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const isValid = await verifyPIN(trimmedPin);
    if (!isValid) {
        return { success: false, error: 'Incorrect PIN. Please try again.' };
    }

    return { success: true };
}

export async function canEnableBiometrics(): Promise<{ canEnable: boolean; error?: string }> {
    const hasPin = await hasPIN();
    if (!hasPin) {
        return { canEnable: false, error: 'You must set up a PIN before enabling biometrics.' };
    }

    const available = await checkBiometricAvailability();
    if (!available.available) {
        return { canEnable: false, error: 'Biometric authentication is not available on this device.' };
    }

    return { canEnable: true };
}
