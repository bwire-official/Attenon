import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StatusBar, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { InstructorLoginScreen } from './InstructorLoginScreen';
import { StudentLoginScreen } from './StudentLoginScreen';
import { RegisterStudentScreen } from './RegisterStudentScreen';
import { StudentVerifyEmailScreen } from './StudentVerifyEmailScreen';
import { FaceSetupScreen } from './FaceSetupScreen';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';

interface LoginScreenProps {
    onLogin?: (role: 'student' | 'instructor') => void;
    onNavigateToForgotPassword?: () => void;
    onNavigateToInstructorForgotPassword?: () => void;
}

export const LoginScreen = ({ onLogin, onNavigateToForgotPassword, onNavigateToInstructorForgotPassword }: LoginScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [showInstructorLogin, setShowInstructorLogin] = useState(false);
    const [showStudentLogin, setShowStudentLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [showRoleSelection, setShowRoleSelection] = useState(false);
    const [showEmailVerification, setShowEmailVerification] = useState(false);
    const [showFaceSetup, setShowFaceSetup] = useState(false);

    // Registration state
    const [registrationEmail, setRegistrationEmail] = useState('');
    const [registrationRole, setRegistrationRole] = useState<'student' | 'instructor'>('student');

    const handleSignInClick = () => {
        setShowRoleSelection(true);
    };

    const handleInstructorLoginClick = () => {
        setShowRoleSelection(false);
        setShowInstructorLogin(true);
    };

    const handleInstructorLogin = () => {
        onLogin?.('instructor');
    };

    const handleStudentLoginClick = () => {
        setShowRoleSelection(false);
        setShowStudentLogin(true);
    };

    const handleStudentLogin = () => {
        onLogin?.('student');
    };

    const handleBack = () => {
        setShowInstructorLogin(false);
        setShowRoleSelection(true);
    };

    const handleStudentBack = () => {
        setShowStudentLogin(false);
        setShowRoleSelection(true);
    };

    const handleSignUp = () => {
        setShowRegister(true);
    };

    const handleRegisterBack = () => {
        setShowRegister(false);
    };

    const handleRegister = (email: string, role: 'student' | 'instructor') => {
        console.log('Student registered:', email, role);
        // Store registration data and navigate to email verification
        setRegistrationEmail(email);
        setRegistrationRole(role);
        setShowRegister(false);
        setShowEmailVerification(true);
    };

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEmailVerified = async () => {
        console.log('Email verified for:', registrationEmail);
        setShowEmailVerification(false);
        setIsLoading(true);
        setError(null);

        try {
            // Fetch user profile to get their actual role from database
            const user = await getCurrentUser();

            if (!user) {
                console.error('Failed to fetch user profile after verification');
                setError('Failed to retrieve user profile.');
                return;
            }

            // Route based on actual role from database
            if (user.role === 'student') {
                // Students go to face setup screen (can be skipped)
                setShowFaceSetup(true);
            } else if (user.role === 'instructor') {
                // Instructors go directly to instructor dashboard
                onLogin?.('instructor');
            }
        } catch (err) {
            console.error('Error in handleEmailVerified:', err);
            setError('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFaceSetupComplete = () => {
        console.log('Face setup completed');
        setShowFaceSetup(false);
        // Navigate to student dashboard
        onLogin?.('student');
    };

    const handleFaceSetupSkip = () => {
        console.log('Face setup skipped');
        setShowFaceSetup(false);
        // Navigate to student dashboard even if skipped
        onLogin?.('student');
    };

    const handleEmailVerificationBack = () => {
        setShowEmailVerification(false);
        setShowRegister(true);
    };

    if (showFaceSetup) {
        return <FaceSetupScreen onComplete={handleFaceSetupComplete} onSkip={handleFaceSetupSkip} />;
    }

    if (showEmailVerification) {
        return (
            <StudentVerifyEmailScreen
                email={registrationEmail}
                onBack={handleEmailVerificationBack}
                onCodeVerified={handleEmailVerified}
            />
        );
    }

    if (showRegister) {
        return <RegisterStudentScreen onRegister={handleRegister} onBack={handleRegisterBack} />;
    }

    if (showInstructorLogin) {
        return <InstructorLoginScreen
            onLogin={handleInstructorLogin}
            onBack={handleBack}
            onForgotPassword={onNavigateToInstructorForgotPassword}
        />;
    }

    if (showStudentLogin) {
        return <StudentLoginScreen
            onLogin={handleStudentLogin}
            onBack={handleStudentBack}
            onForgotPassword={onNavigateToForgotPassword}
        />;
    }

    if (showRoleSelection) {
        return (
            <View style={styles.roleSelectionContainer}>
                {/* Header Section */}
                <View style={[styles.roleHeaderSection, {
                    backgroundColor: colors.black,
                    paddingTop: insets.top + layout.spacing.md
                }]}>
                    <TouchableOpacity
                        onPress={() => setShowRoleSelection(false)}
                        style={styles.roleBackButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={24}
                            color={colors.white}
                        />
                    </TouchableOpacity>
                    <View style={styles.roleHeaderTextContainer}>
                        <Text style={[styles.roleHelloText, { color: colors.white }]}>Hello</Text>
                        <Text style={[styles.roleSignInText, { color: colors.white }]}>Sign In</Text>
                    </View>
                </View>

                {/* Form Section */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={[styles.roleFormSection, { backgroundColor: colors.white }]}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.roleFormContent,
                            { paddingBottom: Math.max(insets.bottom, layout.spacing.xl) }
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={[styles.roleSubtitleText, { color: colorPalette.grey[600] }]}>
                            Choose your account type
                        </Text>

                        <View style={styles.roleButtonsContainer}>
                            <TouchableOpacity
                                style={[styles.roleButton, styles.roleButtonPrimary, {
                                    backgroundColor: colors.black,
                                }]}
                                onPress={handleInstructorLoginClick}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="person" size={20} color={colors.white} style={styles.roleButtonIcon} />
                                <Text style={[styles.roleButtonText, { color: colors.white }]}>Continue as Instructor</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.roleButton, styles.roleButtonSecondary, {
                                    backgroundColor: 'transparent',
                                    borderColor: colors.black,
                                }]}
                                onPress={() => {
                                    setShowRoleSelection(false);
                                    setShowStudentLogin(true);
                                }}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="school" size={20} color={colors.black} style={styles.roleButtonIcon} />
                                <Text style={[styles.roleButtonText, { color: colors.black }]}>Continue as Student</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        );
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

                {/* Welcome Text */}
                <Text style={[styles.welcomeText, { color: colors.text.primary }]}>Welcome</Text>

                {/* Login Buttons */}
                <View style={styles.buttonsContainer}>
                    <TouchableOpacity
                        style={[styles.loginButton, styles.loginButtonPrimary, {
                            backgroundColor: isDark ? colorPalette.grey[100] : colors.black,
                            shadowColor: isDark ? colorPalette.grey[100] : colors.black,
                        }]}
                        onPress={handleSignInClick}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.loginButtonText, styles.loginButtonTextPrimary, { color: isDark ? colors.black : colors.white }]}>SIGN IN</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.loginButton, styles.loginButtonSecondary, {
                            backgroundColor: 'transparent',
                            borderColor: isDark ? colorPalette.grey[100] : colors.black,
                        }]}
                        onPress={handleSignUp}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.loginButtonText, styles.loginButtonTextSecondary, { color: isDark ? colorPalette.grey[100] : colors.black }]}>SIGN UP</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: layout.spacing.xxl * 2,
        paddingHorizontal: layout.spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: layout.spacing.xl,
    },
    logo: {
        width: 200,
        height: 200,
    },
    welcomeText: {
        fontSize: 42,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xl,
        letterSpacing: 0.5,
    },
    subtitleText: {
        fontSize: 16,
        marginBottom: layout.spacing.xxl * 2,
        textAlign: 'center',
    },
    buttonsContainer: {
        width: '100%',
        gap: layout.spacing.md,
        marginTop: layout.spacing.xxl,
    },
    buttonIcon: {
        marginRight: layout.spacing.sm,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: layout.spacing.xxl,
        paddingVertical: layout.spacing.sm,
    },
    backButtonText: {
        fontSize: 16,
        marginLeft: layout.spacing.xs,
    },
    loginButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButtonPrimary: {
        // Primary button with filled background
    },
    loginButtonSecondary: {
        borderWidth: 1.5,
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    loginButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    loginButtonTextPrimary: {
        // Primary button text styling
    },
    loginButtonTextSecondary: {
        // Secondary button text styling
    },
    roleSelectionContainer: {
        flex: 1,
    },
    roleHeaderSection: {
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xxl * 2,
    },
    roleBackButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: layout.spacing.xl,
    },
    roleHeaderTextContainer: {
        marginTop: layout.spacing.md,
    },
    roleHelloText: {
        fontSize: 32,
        fontFamily: 'Montserrat_300Light',
        marginBottom: layout.spacing.xs / 2,
    },
    roleSignInText: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
    },
    roleFormSection: {
        flex: 1,
        marginTop: -35,
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        overflow: 'hidden',
    },
    roleFormContent: {
        flexGrow: 1,
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xxl * 2,
    },
    roleSubtitleText: {
        fontSize: 16,
        marginBottom: layout.spacing.xxl * 2,
        textAlign: 'center',
    },
    roleButtonsContainer: {
        width: '100%',
        gap: layout.spacing.md,
    },
    roleButton: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    roleButtonPrimary: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    roleButtonSecondary: {
        borderWidth: 1.5,
    },
    roleButtonIcon: {
        marginRight: layout.spacing.sm,
    },
    roleButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
});
