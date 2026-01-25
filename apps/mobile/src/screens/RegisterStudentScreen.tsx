import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

export const RegisterStudentScreen = ({ onRegister, onBack }: RegisterStudentScreenProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);

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

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={[styles.headerSection, { 
                backgroundColor: colors.black,
                paddingTop: insets.top + layout.spacing.md 
            }]}>
                <TouchableOpacity 
                    onPress={handleBack}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="arrow-back" 
                        size={24} 
                        color={colors.white}
                    />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.helloText, { color: colors.white }]}>{step === 1 ? 'Create' : 'Create'}</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>{step === 1 ? 'Account' : 'Password'}</Text>
                </View>
            </View>

            {/* Form Section */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.formSection, { backgroundColor: colors.white }]}
            >
                <ScrollView 
                    contentContainerStyle={[
                        styles.formContent,
                        { paddingBottom: Math.max(insets.bottom, layout.spacing.xl) }
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {step === 1 ? (
                        <>
                            {/* Email Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Email Address or Reg Number</Text>
                                <TextInput
                                    style={[styles.textInput, { 
                                        color: colorPalette.grey[900],
                                        borderBottomColor: errors.email ? '#EF4444' : colorPalette.grey[300],
                                    }]}
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        if (errors.email) {
                                            setErrors({ ...errors, email: '' });
                                        }
                                    }}
                                    placeholder="Enter your email or reg number"
                                    placeholderTextColor={colorPalette.grey[400]}
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                />
                                {errors.email && (
                                    <Text style={styles.errorText}>{errors.email}</Text>
                                )}
                            </View>

                            {/* Continue Button */}
                            <TouchableOpacity
                                style={[styles.continueButton, { 
                                    backgroundColor: colors.black,
                                    opacity: !email.trim() ? 0.5 : 1,
                                }]}
                                onPress={handleNext}
                                disabled={!email.trim()}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.continueButtonText, { color: colors.white }]}>Continue</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {/* Email Display (Read-only) */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Email Address or Reg Number</Text>
                                <TextInput
                                    style={[styles.textInput, { 
                                        color: colorPalette.grey[500],
                                        borderBottomColor: colorPalette.grey[300],
                                    }]}
                                    value={email}
                                    placeholder="Enter your email or reg number"
                                    placeholderTextColor={colorPalette.grey[400]}
                                    editable={false}
                                />
                            </View>

                            {/* Password Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[styles.textInput, { 
                                            flex: 1,
                                            color: colorPalette.grey[900],
                                            borderBottomColor: errors.password ? '#EF4444' : colorPalette.grey[300],
                                        }]}
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
                                        placeholderTextColor={colorPalette.grey[400]}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password-new"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colorPalette.grey[600]}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.password && (
                                    <Text style={styles.errorText}>{errors.password}</Text>
                                )}
                            </View>

                            {/* Confirm Password Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Confirm Password</Text>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[styles.textInput, { 
                                            flex: 1,
                                            color: colorPalette.grey[900],
                                            borderBottomColor: errors.confirmPassword ? '#EF4444' : colorPalette.grey[300],
                                        }]}
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            if (errors.confirmPassword) {
                                                setErrors({ ...errors, confirmPassword: '' });
                                            }
                                        }}
                                        placeholder="Confirm your password"
                                        placeholderTextColor={colorPalette.grey[400]}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoComplete="password-new"
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={styles.eyeIcon}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colorPalette.grey[600]}
                                        />
                                    </TouchableOpacity>
                                </View>
                                {errors.confirmPassword && (
                                    <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                                )}
                            </View>

                            {/* Password Hint */}
                            <View style={styles.passwordHint}>
                                <Ionicons 
                                    name="information-circle-outline" 
                                    size={16} 
                                    color={colorPalette.grey[600]} 
                                />
                                <Text style={[styles.passwordHintText, { color: colorPalette.grey[600] }]}>
                                    Password must be at least 8 characters long
                                </Text>
                            </View>

                            {/* Create Account Button */}
                            <TouchableOpacity
                                style={[styles.createButton, { 
                                    backgroundColor: colors.black,
                                    opacity: (!password.trim() || !confirmPassword.trim() || loading) ? 0.5 : 1,
                                }]}
                                onPress={handleRegister}
                                disabled={!password.trim() || !confirmPassword.trim() || loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <Text style={[styles.createButtonText, { color: colors.white }]}>Creating...</Text>
                                ) : (
                                    <Text style={[styles.createButtonText, { color: colors.white }]}>CREATE ACCOUNT</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSection: {
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xxl * 2,
        overflow: 'hidden',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginBottom: layout.spacing.xl,
    },
    headerTextContainer: {
        marginTop: layout.spacing.md,
    },
    helloText: {
        fontSize: 32,
        fontFamily: 'Montserrat_300Light',
        marginBottom: layout.spacing.xs / 2,
    },
    signInText: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
    },
    formSection: {
        flex: 1,
        marginTop: -35,
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        overflow: 'hidden',
    },
    formContent: {
        flexGrow: 1,
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xxl * 2,
    },
    inputGroup: {
        marginBottom: layout.spacing.xl,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        marginBottom: layout.spacing.sm,
    },
    textInput: {
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        paddingVertical: layout.spacing.sm,
        borderBottomWidth: 1,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    eyeIcon: {
        padding: layout.spacing.xs,
        marginLeft: layout.spacing.xs,
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
        color: '#EF4444',
        marginTop: layout.spacing.xs,
    },
    continueButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: layout.spacing.xl,
        marginBottom: layout.spacing.xxl,
    },
    continueButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
    passwordHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: layout.spacing.sm,
        marginBottom: layout.spacing.xl,
    },
    passwordHintText: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
        marginLeft: layout.spacing.xs,
    },
    createButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.xxl,
    },
    createButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
});
