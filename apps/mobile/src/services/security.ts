import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_KEY = 'app_pin';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const APP_LOCKED_KEY = 'app_locked';
const LOCK_TIMEOUT_KEY = 'app_lock_timeout';

// Default lock timeout (30 seconds)
const DEFAULT_LOCK_TIMEOUT = 30000;

async function hashPIN(pin: string, salt: string): Promise<string> {
    const iterations = 5000;
    let hash = pin + salt;
    for (let i = 0; i < iterations; i++) {
        hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, hash);
    }
    return hash;
}

const PIN_SALT = 'attenon-mobile-secure-salt-v1';

export interface BiometricType {
    available: boolean;
    type: LocalAuthentication.AuthenticationType[];
}

export async function checkBiometricAvailability(): Promise<BiometricType> {
    if (Platform.OS === 'web') {
        return { available: false, type: [] };
    }
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
    if (Platform.OS === 'web') {
        return false;
    }
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
    if (Platform.OS === 'web') {
        return false;
    }
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
    if (Platform.OS === 'web') {
        return null;
    }
    try {
        return await SecureStore.getItemAsync(PIN_KEY);
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
    if (Platform.OS === 'web') {
        return false;
    }
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
    if (Platform.OS === 'web') {
        return false;
    }
    try {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
        return true;
    } catch (error) {
        console.error('Error setting biometric enabled:', error);
        return false;
    }
}

export async function isBiometricEnabled(): Promise<boolean> {
    if (Platform.OS === 'web') {
        return false;
    }
    try {
        const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
        return value === 'true';
    } catch (error) {
        console.error('Error getting biometric enabled:', error);
        return false;
    }
}

export async function setAppLocked(locked: boolean): Promise<void> {
    if (Platform.OS === 'web') {
        return;
    }
    try {
        await SecureStore.setItemAsync(APP_LOCKED_KEY, locked ? 'true' : 'false');
    } catch (error) {
        console.error('Error setting app locked:', error);
    }
}

export async function isAppLocked(): Promise<boolean> {
    if (Platform.OS === 'web') {
        return false;
    }
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

export async function getLockTimeout(): Promise<number> {
    if (Platform.OS === 'web') {
        return DEFAULT_LOCK_TIMEOUT;
    }
    try {
        const value = await SecureStore.getItemAsync(LOCK_TIMEOUT_KEY);
        if (value !== null && value !== undefined) {
            const timeout = parseInt(value, 10);
            if (!isNaN(timeout) && timeout >= 0) {
                return timeout;
            }
        }
        return DEFAULT_LOCK_TIMEOUT;
    } catch (error) {
        console.error('Error getting lock timeout:', error);
        return DEFAULT_LOCK_TIMEOUT;
    }
}

export async function setLockTimeout(timeoutMs: number): Promise<boolean> {
    if (Platform.OS === 'web') {
        return false;
    }
    try {
        await SecureStore.setItemAsync(LOCK_TIMEOUT_KEY, timeoutMs.toString());
        return true;
    } catch (error) {
        console.error('Error setting lock timeout:', error);
        return false;
    }
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
