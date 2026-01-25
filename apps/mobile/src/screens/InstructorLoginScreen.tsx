import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, StatusBar, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface InstructorLoginScreenProps {
    onLogin?: () => void;
    onBack?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const InstructorLoginScreen = ({ onLogin, onBack }: InstructorLoginScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1); // 1: Email/Staff ID, 2: Password
    const [emailOrStaffId, setEmailOrStaffId] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const isSmallScreen = SCREEN_HEIGHT < 700;
    const isAndroid = Platform.OS === 'android';

    const handleNext = () => {
        if (!emailOrStaffId.trim()) {
            return;
        }
        setStep(2);
    };

    const handleLogin = () => {
        if (!password.trim()) {
            return;
        }
        
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            onLogin?.();
        }, 1500);
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        } else {
            onBack?.();
        }
    };

    return (
        <ScreenWrapper style={{ paddingHorizontal: 0 }}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
                {/* Header with Back Button */}
                <View style={styles.header}>
                    <TouchableOpacity 
                        onPress={handleBack}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name="arrow-back" 
                            size={24} 
                            color={isDark ? colorPalette.grey[100] : colors.text.primary} 
                        />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    style={{ flex: 1 }}
                >
                    <ScrollView 
                        contentContainerStyle={[
                            styles.scrollContent,
                            isAndroid && styles.scrollContentAndroid,
                            { paddingBottom: Math.max(insets.bottom, layout.spacing.lg) }
                        ]} 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Logo */}
                        <View style={[
                            styles.logoContainer, 
                            isSmallScreen && styles.logoContainerSmall,
                            isAndroid && styles.logoContainerAndroid
                        ]}>
                            <Image 
                                source={require('../../assets/splash.png')} 
                                style={[
                                    styles.logo,
                                    isSmallScreen && styles.logoSmall,
                                    isAndroid && styles.logoAndroid,
                                    { tintColor: isDark ? colorPalette.grey[100] : colors.text.primary }
                                ]}
                                resizeMode="contain"
                            />
                            <Text style={[
                                styles.title, 
                                isSmallScreen && styles.titleSmall,
                                isAndroid && styles.titleAndroid,
                                { color: colors.text.primary }
                            ]}>Instructor Login</Text>
                            <Text style={[
                                styles.subtitle, 
                                isSmallScreen && styles.subtitleSmall,
                                isAndroid && styles.subtitleAndroid,
                                { color: colors.text.secondary }
                            ]}>
                                {step === 1 ? 'Enter your email or staff ID' : 'Enter your password'}
                            </Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            {step === 1 ? (
                                <>
                                    <Input
                                        label="Email or Staff ID"
                                        value={emailOrStaffId}
                                        onChangeText={setEmailOrStaffId}
                                        placeholder="Enter your email or staff ID"
                                        keyboardType="default"
                                        autoCapitalize="none"
                                        icon="person-outline"
                                    />

                                    <Button
                                        title="Continue"
                                        onPress={handleNext}
                                        disabled={!emailOrStaffId.trim()}
                                        style={styles.nextButton}
                                    />
                                </>
                            ) : (
                                <>
                                    <Input
                                        label="Password"
                                        value={password}
                                        onChangeText={setPassword}
                                        placeholder="Enter your password"
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoComplete="password"
                                        icon="lock-closed-outline"
                                    />

                                    <TouchableOpacity style={styles.forgotPassword}>
                                        <Text style={[styles.forgotPasswordText, { color: isDark ? colorPalette.grey[100] : colors.text.primary }]}>
                                            Forgot Password?
                                        </Text>
                                    </TouchableOpacity>

                                    <Button
                                        title="Sign In"
                                        onPress={handleLogin}
                                        loading={loading}
                                        disabled={!password.trim()}
                                        style={styles.loginButton}
                                    />
                                </>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    header: {
        paddingTop: layout.spacing.md,
        paddingHorizontal: layout.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xl,
        paddingBottom: layout.spacing.lg,
    },
    scrollContentAndroid: {
        paddingTop: layout.spacing.lg,
        paddingHorizontal: layout.spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: layout.spacing.xl,
    },
    logoContainerSmall: {
        marginBottom: layout.spacing.lg,
    },
    logoContainerAndroid: {
        marginBottom: layout.spacing.md,
    },
    logo: {
        width: 200,
        height: 200,
        marginBottom: layout.spacing.lg,
    },
    logoSmall: {
        width: 120,
        height: 120,
        marginBottom: layout.spacing.md,
    },
    logoAndroid: {
        width: 150,
        height: 150,
        marginBottom: layout.spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: layout.spacing.xs,
    },
    titleSmall: {
        fontSize: 24,
    },
    titleAndroid: {
        fontSize: 22,
        marginBottom: layout.spacing.xs / 2,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    subtitleSmall: {
        fontSize: 14,
    },
    subtitleAndroid: {
        fontSize: 13,
    },
    form: {
        marginTop: layout.spacing.md,
    },
    nextButton: {
        marginTop: layout.spacing.md,
    },
    forgotPassword: {
        alignItems: 'flex-end',
        marginTop: layout.spacing.sm,
        marginBottom: layout.spacing.lg,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        marginTop: layout.spacing.sm,
    },
});

