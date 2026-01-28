// Expo app configuration with environment variable support
// This file reads from .env file and makes variables available via Constants.expoConfig.extra

require('dotenv').config();

module.exports = {
    expo: {
        name: 'Attenon',
        slug: 'mobile',
        version: '1.0.0',
        orientation: 'portrait',
        icon: './assets/splash.png',
        userInterfaceStyle: 'automatic',
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
            minSdkVersion: 26,
            adaptiveIcon: {
                foregroundImage: './assets/splash.png',
                backgroundColor: '#ffffff',
            },
            edgeToEdgeEnabled: true,
        },
        web: {
            favicon: './assets/attenon logo.png',
        },
        plugins: [
            [
                'react-native-vision-camera',
                {
                    cameraPermissionText: '$(PRODUCT_NAME) needs access to your Camera.',
                    enableMicrophonePermission: false,
                },
            ],
            'expo-font',
            'expo-secure-store',
        ],
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
