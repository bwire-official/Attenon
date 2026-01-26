// Example App.js implementation with session management
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import {
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';

// Import services
import { initializeSession, onSessionChange } from './src/services/session';
import { Profile } from './src/lib/supabase';

// Import screens
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { StudentDashboard } from './src/screens/StudentDashboard';
import { InstructorDashboard } from './src/screens/InstructorDashboard';

export default function App() {
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [sessionLoading, setSessionLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Load fonts
    useEffect(() => {
        async function loadFonts() {
            try {
                await Font.loadAsync({
                    Montserrat_300Light,
                    Montserrat_400Regular,
                    Montserrat_600SemiBold,
                    Montserrat_700Bold,
                });
                setFontsLoaded(true);
            } catch (error) {
                console.error('Error loading fonts:', error);
                setFontsLoaded(true); // Continue with system fonts
            }
        }

        loadFonts();
    }, []);

    // Initialize session on app start
    useEffect(() => {
        async function checkSession() {
            const sessionState = await initializeSession();
            setIsAuthenticated(sessionState.isAuthenticated);
            setCurrentUser(sessionState.user);
            setSessionLoading(false);
        }

        checkSession();
    }, []);

    // Listen for auth state changes
    useEffect(() => {
        const { data: subscription } = onSessionChange((authenticated, user) => {
            setIsAuthenticated(authenticated);
            setCurrentUser(user);
        });

        // Cleanup subscription on unmount
        return () => {
            subscription?.subscription?.unsubscribe();
        };
    }, []);

    // Handle successful login
    const handleLogin = (role) => {
        // The session change listener will automatically update the state
        console.log(`User logged in as ${role}`);
    };

    // Show loading screen while initializing
    if (!fontsLoaded || sessionLoading) {
        return (
            <SafeAreaProvider>
                <SplashScreen />
            </SafeAreaProvider>
        );
    }

    // Navigate based on authentication state and user role
    return (
        <SafeAreaProvider>
            {isAuthenticated && currentUser ? (
                // User is logged in - show appropriate dashboard
                currentUser.role === 'student' ? (
                    <StudentDashboard />
                ) : (
                    <InstructorDashboard />
                )
            ) : (
                // No active session - show login screen
                <LoginScreen onLogin={handleLogin} />
            )}
        </SafeAreaProvider>
    );
}
