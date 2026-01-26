// Application configuration
import Constants from 'expo-constants';

// API URLs - Load from environment variables
export const API_CONFIG = {
    // Python Face Recognition API
    FACE_API_URL: Constants.expoConfig?.extra?.faceApiUrl ||
        process.env.EXPO_PUBLIC_FACE_API_URL ||
        (__DEV__
            ? 'http://localhost:8000'  // Default local development
            : ''), // Fail/empty if not configured in production

    // Supabase URL (for reference, actual connection is in supabase.ts)
    SUPABASE_URL: Constants.expoConfig?.extra?.supabaseUrl ||
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        '',
};

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
