// Expo app configuration with environment variable support
// This file reads from .env file and makes variables available via Constants.expoConfig.extra

require('dotenv').config();

module.exports = {
    expo: {
        name: 'Attenon',
        slug: 'mobile',
        version: '1.0.0',
        orientation: 'portrait',
        main: 'index.js',
        icon: './assets/attenon logo.png',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#ffffff',
        },
        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.attenon.mobile',
        },
        android: {
            package: 'com.attenon.mobile',
            adaptiveIcon: {
                foregroundImage: './assets/attenon logo.png',
                backgroundColor: '#ffffff',
            },
            edgeToEdgeEnabled: true,
        },
        web: {
            favicon: './assets/attenon logo.png',
        },
        extra: {
            eas: {
                projectId: '2c901cc4-c0e9-4ffd-96ef-cd6dd8d15b62',
            },
            // Environment variables accessible via Constants.expoConfig.extra
            supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
            supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
            faceApiUrl: process.env.EXPO_PUBLIC_FACE_API_URL || '',
        },
    },
};
