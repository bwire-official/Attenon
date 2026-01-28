// Application configuration
import Constants from 'expo-constants';

// API URLs
export const API_CONFIG = {
    FACE_API_URL: Constants.expoConfig?.extra?.faceApiUrl || process.env.EXPO_PUBLIC_FACE_API_URL || '',
    SUPABASE_URL: Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
};

// Debug: Log config on load
if (__DEV__) {
    console.log('[Config] FACE_API_URL:', API_CONFIG.FACE_API_URL);
    console.log('[Config] From Constants:', Constants.expoConfig?.extra?.faceApiUrl);
    console.log('[Config] From process.env:', process.env.EXPO_PUBLIC_FACE_API_URL);
}

// Face Recognition settings
export const FACE_CONFIG = {
    MATCH_THRESHOLD: 0.6,
    MIN_CONFIDENCE: 60, // Minimum confidence percentage to accept match
};

// App settings
export const APP_CONFIG = {
    APP_NAME: 'Attenon',
    VERSION: '1.0.0',
};
