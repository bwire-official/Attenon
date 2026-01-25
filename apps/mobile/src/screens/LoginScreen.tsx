import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { InstructorLoginScreen } from './InstructorLoginScreen';
import { RegisterStudentScreen } from './RegisterStudentScreen';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface LoginScreenProps {
    onLogin?: (role: 'student' | 'instructor') => void;
}

export const LoginScreen = ({ onLogin }: LoginScreenProps) => {
    const { colors, isDark } = useTheme();
    const [showInstructorLogin, setShowInstructorLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    
    const handleInstructorLoginClick = () => {
        setShowInstructorLogin(true);
    };

    const handleInstructorLogin = () => {
        onLogin?.('instructor');
    };

    const handleStudentLogin = () => {
        onLogin?.('student');
    };

    const handleBack = () => {
        setShowInstructorLogin(false);
    };

    const handleSignUp = () => {
        setShowRegister(true);
    };

    const handleRegisterBack = () => {
        setShowRegister(false);
    };

    const handleRegister = (data: any) => {
        console.log('Student registered:', data);
        onLogin?.('student');
    };

    if (showRegister) {
        return <RegisterStudentScreen onRegister={handleRegister} onBack={handleRegisterBack} />;
    }

    if (showInstructorLogin) {
        return <InstructorLoginScreen onLogin={handleInstructorLogin} onBack={handleBack} />;
    }

    return (
        <ScreenWrapper style={{ paddingHorizontal: 0 }}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
                {/* Logo */}
                <View style={styles.header}>
                    <Image 
                        source={require('../../assets/attenon logo.png')} 
                        style={[
                            styles.logo,
                            { tintColor: isDark ? colorPalette.grey[100] : colors.text.primary }
                        ]}
                        resizeMode="contain"
                    />
                </View>

                {/* Login Buttons */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity  
                        style={[styles.loginButton, { 
                            backgroundColor: isDark ? colors.primary : colors.text.primary,
                            shadowColor: isDark ? colors.primary : '#000',
                        }]}
                        onPress={handleInstructorLoginClick}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="person" size={20} color={isDark ? colors.black : colors.white} style={styles.buttonIcon} />
                        <Text style={[styles.loginButtonText, { color: isDark ? colors.black : colors.white }]}>Continue as Instructor</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.loginButton, { 
                            backgroundColor: isDark ? colors.primary : colors.text.primary,
                            shadowColor: isDark ? colors.primary : '#000',
                        }]}
                        onPress={handleStudentLogin}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="school" size={20} color={isDark ? colors.black : colors.white} style={styles.buttonIcon} />
                        <Text style={[styles.loginButtonText, { color: isDark ? colors.black : colors.white }]}>Continue as Student</Text>
                    </TouchableOpacity>
                </View>

                {/* Sign Up Link */}
                <TouchableOpacity style={styles.signUpContainer} onPress={handleSignUp} activeOpacity={0.7}>
                    <Text style={[styles.signUpText, { color: colors.text.secondary }]}>
                        Don't have an account?{' '}
                        <Text style={[styles.signUpLink, { color: isDark ? colorPalette.grey[100] : colors.text.primary }]}>Sign Up.</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: layout.spacing.xxl * 2,
        paddingHorizontal: layout.spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginTop: layout.spacing.xxl * 2,
    },
    logo: {
        width: 280,
        height: 280,
    },
    buttonsContainer: {
        width: '100%',
        gap: layout.spacing.md,
        marginTop: layout.spacing.xxl * 2,
    },
    loginButton: {
        width: '100%',
        height: 56,
        borderRadius: layout.borderRadius.md,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonIcon: {
        marginRight: layout.spacing.sm,
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    signUpContainer: {
        marginTop: layout.spacing.lg,
        marginBottom: layout.spacing.xl,
        paddingHorizontal: layout.spacing.md,
    },
    signUpText: {
        fontSize: 14,
        textAlign: 'center',
    },
    signUpLink: {
        fontWeight: '600',
    },
});
