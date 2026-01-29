import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { login, logout } from '../services/auth';

interface InstructorLoginScreenProps {
    onLogin?: () => void;
    onBack?: () => void;
    onForgotPassword?: () => void;
}

export const InstructorLoginScreen = ({ onLogin, onBack, onForgotPassword }: InstructorLoginScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Please enter both email and password');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await login({ email: email.trim(), password });

            if (result.success && result.user) {
                // Check for Instructor Role
                if (result.user.role === 'instructor') {
                    onLogin?.();
                } else {
                    // Not an instructor - Log them out immediately
                    await logout();
                    setError('Access Denied. This area is for Instructors only.');
                }
            } else {
                setError(result.error || 'Failed to log in. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
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
                    <Text style={[styles.helloText, { color: colors.white }]}>Hello</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>Instructor</Text>
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

                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Email</Text>
                        <TextInput
                            style={[styles.textInput, {
                                color: colorPalette.grey[900],
                                borderBottomColor: colorPalette.grey[300],
                            }]}
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError(null);
                            }}
                            placeholder="instructor@university.edu"
                            placeholderTextColor={colorPalette.grey[400]}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
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
                                    borderBottomColor: colorPalette.grey[300],
                                }]}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    setError(null);
                                }}
                                placeholder="••••••"
                                placeholderTextColor={colorPalette.grey[400]}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                autoComplete="password"
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

                    {/* Forgot Password */}
                    <TouchableOpacity
                        style={styles.forgotPassword}
                        onPress={onForgotPassword}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.forgotPasswordText, { color: colorPalette.grey[600] }]}>
                            Forget password?
                        </Text>
                    </TouchableOpacity>

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={[styles.signInButton, {
                            backgroundColor: colors.black,
                            opacity: (!email.trim() || !password.trim() || loading) ? 0.5 : 1,
                        }]}
                        onPress={handleLogin}
                        disabled={!email.trim() || !password.trim() || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <Text style={[styles.signInButtonText, { color: colors.white }]}>Loading...</Text>
                        ) : (
                            <Text style={[styles.signInButtonText, { color: colors.white }]}>SIGN IN</Text>
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
        fontFamily: 'Montserrat_400Regular',
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
    },
    eyeIcon: {
        padding: layout.spacing.xs,
        marginLeft: layout.spacing.sm,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginTop: layout.spacing.sm,
        marginBottom: layout.spacing.xxl,
    },
    forgotPasswordText: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },
    signInButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.xxl,
    },
    signInButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
});
