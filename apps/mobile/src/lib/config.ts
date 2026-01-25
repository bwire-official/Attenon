// Application configuration

// API URLs
export const API_CONFIG = {
    // Python Face Recognition API
    FACE_API_URL: __DEV__ 
        ? 'http://192.168.0.100:8000'  // Local development - update with your machine's IP
        : 'https://your-production-api.com',
    
    // Supabase URL (also in supabase.ts but here for reference)
    SUPABASE_URL: 'https://jvcgepjqhbczpaqaajjw.supabase.co',
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
