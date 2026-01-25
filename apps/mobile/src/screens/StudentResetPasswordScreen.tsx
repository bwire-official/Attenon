import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface StudentResetPasswordScreenProps {
    onBack?: () => void;
    onPasswordReset?: () => void;
}

export const StudentResetPasswordScreen = ({ onBack, onPasswordReset }: StudentResetPasswordScreenProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleResetPassword = async () => {
        if (!password.trim()) {
            setError('Please enter a new password');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError(null);

        // Simulate API call to reset password
        setTimeout(() => {
            setLoading(false);
            onPasswordReset?.();
        }, 1500);
    };

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={[styles.headerSection, { 
                backgroundColor: colors.black,
                paddingTop: insets.top + layout.spacing.md 
            }]}>
                <TouchableOpacity 
                    onPress={onBack}
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
                    <Text style={[styles.helloText, { color: colors.white }]}>Reset</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>Password</Text>
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
                    {/* Error Message */}
                    {error && (
                        <View style={[styles.errorContainer, { backgroundColor: '#fee' }]}>
                            <Ionicons 
                                name="alert-circle" 
                                size={20} 
                                color="#c33" 
                            />
                            <Text style={[styles.errorText, { color: '#c33' }]}>
                                {error}
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.descriptionText, { color: colorPalette.grey[600] }]}>
                        Enter your new password below
                    </Text>

                    {/* New Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>New Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.textInput, { 
                                    flex: 1,
                                    color: colorPalette.grey[900],
                                    borderBottomColor: colorPalette.grey[300],
                                }]}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setError(null);
                                }}
                                placeholder="Enter new password"
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
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Confirm Password</Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.textInput, { 
                                    flex: 1,
                                    color: colorPalette.grey[900],
                                    borderBottomColor: colorPalette.grey[300],
                                }]}
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    setError(null);
                                }}
                                placeholder="Confirm new password"
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
                    </View>

                    {/* Reset Password Button */}
                    <TouchableOpacity
                        style={[styles.resetButton, { 
                            backgroundColor: colors.black,
                            opacity: (!password.trim() || !confirmPassword.trim() || loading) ? 0.5 : 1,
                        }]}
                        onPress={handleResetPassword}
                        disabled={!password.trim() || !confirmPassword.trim() || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <Text style={[styles.resetButtonText, { color: colors.white }]}>Resetting...</Text>
                        ) : (
                            <Text style={[styles.resetButtonText, { color: colors.white }]}>RESET PASSWORD</Text>
                        )}
                    </TouchableOpacity>
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
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        marginBottom: layout.spacing.lg,
        gap: layout.spacing.sm,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
    },
    descriptionText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: layout.spacing.xxl * 2,
        lineHeight: 22,
        paddingHorizontal: layout.spacing.md,
    },
    inputGroup: {
        marginBottom: layout.spacing.xl,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: layout.spacing.sm,
        fontFamily: 'Montserrat_400Regular',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colorPalette.grey[300],
    },
    textInput: {
        fontSize: 16,
        paddingVertical: layout.spacing.sm,
        flex: 1,
    },
    eyeIcon: {
        padding: layout.spacing.xs,
        marginLeft: layout.spacing.xs,
    },
    resetButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.xxl,
        marginTop: layout.spacing.xl,
    },
    resetButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
});
