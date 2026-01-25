import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface RegisterStudentScreenProps {
    onRegister?: (data: StudentRegistrationData) => void;
    onBack?: () => void;
}

interface StudentRegistrationData {
    email: string;
    password: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const RegisterStudentScreen = ({ onRegister, onBack }: RegisterStudentScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const isSmallScreen = SCREEN_HEIGHT < 700;
    const isAndroid = Platform.OS === 'android';

    const validateStep1 = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            newErrors.email = 'Please enter a valid email address';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateStep2 = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!password.trim()) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }
        if (!confirmPassword.trim()) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep1()) {
            setStep(2);
        }
    };

    const handleRegister = () => {
        if (!validateStep2()) {
            return;
        }
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            onRegister?.({
                email: email.trim(),
                password: password,
            });
        }, 1500);
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
            setErrors({});
        } else {
            onBack?.();
        }
    };

    const getStepTitle = (): string => {
        if (step === 1) return 'Sign Up';
        return 'Create Password';
    };

    const getStepSubtitle = (): string => {
        if (step === 1) return 'Enter your email to get started';
        return 'Create a secure password for your account';
    };

    return (
        <ScreenWrapper style={{ paddingHorizontal: 0 }}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
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
                        <View style={[
                            styles.logoContainer, 
                            isSmallScreen && styles.logoContainerSmall,
                            isAndroid && styles.logoContainerAndroid
                        ]}>
                            <View style={[styles.iconContainer, { backgroundColor: isDark ? colorPalette.grey[900] : colorPalette.frozenLake[100] }]}>
                                <Ionicons 
                                    name="school" 
                                    size={48} 
                                    color={isDark ? colorPalette.grey[100] : colors.primary} 
                                />
                            </View>
                            <Text style={[
                                styles.title, 
                                isSmallScreen && styles.titleSmall,
                                isAndroid && styles.titleAndroid,
                                { color: colors.text.primary }
                            ]}>{getStepTitle()}</Text>
                            <Text style={[
                                styles.subtitle, 
                                isSmallScreen && styles.subtitleSmall,
                                isAndroid && styles.subtitleAndroid,
                                { color: colors.text.secondary }
                            ]}>
                                {getStepSubtitle()}
                            </Text>
                            <View style={styles.stepIndicator}>
                                <View style={[styles.stepDot, styles.stepDotActive, { backgroundColor: colors.primary }]} />
                                <View style={[styles.stepLine, { backgroundColor: step >= 2 ? colors.primary : colors.border }]} />
                                <View style={[styles.stepDot, step >= 2 && styles.stepDotActive, { backgroundColor: step >= 2 ? colors.primary : colors.border }]} />
                            </View>
                        </View>

                        <View style={styles.form}>
                            {step === 1 ? (
                                <>
                                    <Input
                                        label="Email Address"
                                        value={email}
                                        onChangeText={(text) => {
                                            setEmail(text);
                                            if (errors.email) {
                                                setErrors({ ...errors, email: '' });
                                            }
                                        }}
                                        placeholder="Enter your email"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        icon="mail-outline"
                                        error={errors.email}
                                    />

                                    <Button
                                        title="Continue"
                                        onPress={handleNext}
                                        disabled={!email.trim()}
                                        style={styles.nextButton}
                                    />
                                </>
                            ) : (
                                <>
                                    <Input
                                        label="Email Address"
                                        value={email}
                                        placeholder="Enter your email"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        icon="mail-outline"
                                        editable={false}
                                    />

                                    <Input
                                        label="Password"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (errors.password) {
                                                setErrors({ ...errors, password: '' });
                                            }
                                            if (errors.confirmPassword && confirmPassword) {
                                                setErrors({ ...errors, confirmPassword: '' });
                                            }
                                        }}
                                        placeholder="Enter your password"
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoComplete="password-new"
                                        icon="lock-closed-outline"
                                        error={errors.password}
                                    />

                                    <Input
                                        label="Confirm Password"
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            if (errors.confirmPassword) {
                                                setErrors({ ...errors, confirmPassword: '' });
                                            }
                                        }}
                                        placeholder="Confirm your password"
                                        secureTextEntry
                                        autoCapitalize="none"
                                        autoComplete="password-new"
                                        icon="lock-closed-outline"
                                        error={errors.confirmPassword}
                                    />

                                    <View style={styles.passwordHint}>
                                        <Ionicons 
                                            name="information-circle-outline" 
                                            size={16} 
                                            color={colors.text.secondary} 
                                        />
                                        <Text style={[styles.passwordHintText, { color: colors.text.secondary }]}>
                                            Password must be at least 8 characters long
                                        </Text>
                                    </View>

                                    <Button
                                        title="Create Account"
                                        onPress={handleRegister}
                                        loading={loading}
                                        disabled={!password.trim() || !confirmPassword.trim()}
                                        style={styles.registerButton}
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
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: layout.borderRadius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.lg,
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
        marginBottom: layout.spacing.md,
    },
    subtitleSmall: {
        fontSize: 14,
    },
    subtitleAndroid: {
        fontSize: 13,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: layout.spacing.sm,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    stepDotActive: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    stepLine: {
        width: 40,
        height: 2,
        marginHorizontal: layout.spacing.xs,
    },
    form: {
        marginTop: layout.spacing.md,
    },
    nextButton: {
        marginTop: layout.spacing.md,
    },
    registerButton: {
        marginTop: layout.spacing.md,
    },
    passwordHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: layout.spacing.sm,
        marginBottom: layout.spacing.md,
    },
    passwordHintText: {
        fontSize: 12,
        marginLeft: layout.spacing.xs,
    },
});
