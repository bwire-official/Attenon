import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { checkAllowedUser, AllowedUser } from '../services/validation';
import { registerUser } from '../services/registration';

const STUDENT_PORTAL_URL = 'https://attenon-register.vercel.app';

interface RegisterStudentScreenProps {
    onRegister?: (email: string, role: 'student' | 'instructor') => void;
    onBack?: () => void;
}

interface StudentRegistrationData {
    email: string;
    password: string;
}

export const RegisterStudentScreen = ({ onRegister, onBack }: RegisterStudentScreenProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    // Multi-step state
    const [step, setStep] = useState<'identifier' | 'password'>('identifier');

    // Form data
    const [emailOrRegNumber, setEmailOrRegNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Validation state
    const [allowedUser, setAllowedUser] = useState<AllowedUser | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showRegistrationLink, setShowRegistrationLink] = useState(false);

    /**
     * Open student portal registration website
     */
    const handleOpenRegistrationPortal = async () => {
        try {
            const canOpen = await Linking.canOpenURL(STUDENT_PORTAL_URL);
            if (canOpen) {
                await Linking.openURL(STUDENT_PORTAL_URL);
            } else {
                setError('Unable to open registration portal. Please visit: ' + STUDENT_PORTAL_URL);
            }
        } catch (err) {
            console.error('Error opening registration portal:', err);
            setError('Unable to open registration portal. Please visit: ' + STUDENT_PORTAL_URL);
        }
    };

    /**
     * Step 1: Validate email/reg number exists in allowed_users
     */
    const handleContinue = async () => {
        if (!emailOrRegNumber.trim()) {
            setError('Please enter your email or registration number');
            return;
        }

        setLoading(true);
        setError(null);

        // Check if user is allowed to register
        const result = await checkAllowedUser(emailOrRegNumber);

        setLoading(false);

        if (!result.success) {
            setError(result.error || 'An error occurred. Please try again.');
            return;
        }

        if (!result.isAllowed) {
            setError(
                result.error ||
                'You are not authorized to register. Please visit the student portal first.'
            );
            setShowRegistrationLink(true);
            return;
        }

        // Reset registration link flag if user is allowed
        setShowRegistrationLink(false);

        // User is allowed, proceed to password step
        if (!result.user) {
            setError('Unexpected error: User data missing. Please try again.');
            return;
        }

        setAllowedUser(result.user);
        setStep('password');
    };

    /**
     * Step 2: Create account with password
     */
    const handleRegister = async () => {
        // Validate password
        if (!password.trim()) {
            setError('Please enter a password');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (!confirmPassword.trim()) {
            setError('Please confirm your password');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!allowedUser) {
            setError('An error occurred. Please go back and try again.');
            return;
        }

        setLoading(true);
        setError(null);

        // Register the user
        const result = await registerUser({
            emailOrRegNumber,
            password,
            allowedUser,
        });

        setLoading(false);

        if (!result.success) {
            setError(result.error || 'Failed to create account. Please try again.');
            return;
        }

        // Success! Navigate to email verification
        onRegister?.(allowedUser.email, allowedUser.role);
    };

    /**
     * Go back to previous step
     */
    const handleBack = () => {
        if (step === 'password') {
            setStep('identifier');
            setError(null);
            setPassword('');
            setConfirmPassword('');
        } else {
            onBack?.();
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
                    onPress={handleBack}
                    style={styles.backButton}
                    activeOpacity={0.7}
                    disabled={loading}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={colors.white}
                    />
                </TouchableOpacity>
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.helloText, { color: colors.white }]}>Create</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>
                        {step === 'identifier' ? 'Account' : 'Password'}
                    </Text>
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
                        <View style={styles.errorWrapper}>
                            <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons
                                    name="alert-circle"
                                    size={20}
                                    color="#DC2626"
                                    style={{ marginTop: 2 }}
                                />
                                <Text
                                    style={[styles.errorText, { color: '#DC2626' }]}
                                    numberOfLines={0}
                                >
                                    {error}
                                </Text>
                            </View>

                            {/* Registration Portal Link Button */}
                            {showRegistrationLink && (
                                <TouchableOpacity
                                    style={[styles.portalButton, {
                                        backgroundColor: colors.black,
                                        borderColor: colors.black,
                                    }]}
                                    onPress={handleOpenRegistrationPortal}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name="open-outline"
                                        size={18}
                                        color={colors.white}
                                        style={styles.portalButtonIcon}
                                    />
                                    <Text
                                        style={[styles.portalButtonText, { color: colors.white }]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        Open Registration Portal
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {step === 'identifier' ? (
                        <>
                            {/* Step 1: Email/Reg Number Input */}
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Email Address or Reg Number</Text>
                                <TextInput
                                    style={[styles.textInput, {
                                        color: colorPalette.grey[900],
                                        borderBottomColor: error ? '#EF4444' : colorPalette.grey[300],
                                    }]}
                                    value={emailOrRegNumber}
                                    onChangeText={(text) => {
                                        setEmailOrRegNumber(text);
                                        setError(null);
                                        setShowRegistrationLink(false);
                                    }}
                                    placeholder="Enter your email or reg number"
                                    placeholderTextColor={colorPalette.grey[400]}
                                    keyboardType="default"
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.infoBox}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={20}
                                    color={colorPalette.grey[600]}
                                    style={{ marginTop: 2 }}
                                />
                                <View style={styles.infoTextContainer}>
                                    <Text
                                        style={[styles.infoText, { color: colorPalette.grey[600] }]}
                                        numberOfLines={0}
                                    >
                                        You must be pre-registered by your institution. If you're not in the system, please visit the student portal to register first.
                                    </Text>
                                    <TouchableOpacity
                                        onPress={handleOpenRegistrationPortal}
                                        activeOpacity={0.7}
                                        style={styles.infoLink}
                                    >
                                        <Text style={[styles.infoLinkText, { color: colors.black }]}>
                                            Open Registration Portal →
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Continue Button */}
                            <TouchableOpacity
                                style={[styles.continueButton, {
                                    backgroundColor: colors.black,
                                    opacity: !emailOrRegNumber.trim() || loading ? 0.5 : 1,
                                }]}
                                onPress={handleContinue}
                                disabled={!emailOrRegNumber.trim() || loading}
                                activeOpacity={0.8}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={[styles.continueButtonText, { color: colors.white }]}>CONTINUE</Text>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            {/* Step 2: Password Creation */}
                            {/* Display verified info - only show what user typed */}
                            <View style={[styles.verifiedBox, { backgroundColor: '#D1FAE5' }]}>
                                <Ionicons name="checkmark-circle" size={20} color="#059669" style={{ marginTop: 2 }} />
                                <View style={styles.verifiedInfo}>
                                    <Text
                                        style={[styles.verifiedText, { color: '#047857' }]}
                                        numberOfLines={1}
                                        ellipsizeMode="tail"
                                    >
                                        {emailOrRegNumber.trim()}
                                    </Text>
                                </View>
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
                                        placeholder="Enter your password"
                                        placeholderTextColor={colorPalette.grey[400]}
                                        secureTextEntry={!showPassword}
                                        autoCapitalize="none"
                                        autoComplete="password-new"
                                        editable={!loading}
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
                                        placeholder="Confirm your password"
                                        placeholderTextColor={colorPalette.grey[400]}
                                        secureTextEntry={!showConfirmPassword}
                                        autoCapitalize="none"
                                        autoComplete="password-new"
                                        editable={!loading}
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
                                    <ActivityIndicator color={colors.white} />
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
    errorWrapper: {
        marginBottom: layout.spacing.lg,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        marginBottom: layout.spacing.md,
        gap: layout.spacing.sm,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        flexWrap: 'wrap',
    },
    portalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        borderRadius: 24,
        borderWidth: 1.5,
        paddingHorizontal: layout.spacing.lg,
        paddingVertical: layout.spacing.sm,
        gap: layout.spacing.sm,
    },
    portalButtonIcon: {
        marginRight: layout.spacing.xs,
    },
    portalButtonText: {
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
        flexShrink: 1,
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
        marginLeft: layout.spacing.xs,
        position: 'absolute',
        right: 0,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: layout.spacing.md,
        backgroundColor: '#F3F4F6',
        borderRadius: layout.borderRadius.md,
        marginBottom: layout.spacing.xl,
        gap: layout.spacing.sm,
    },
    infoTextContainer: {
        flex: 1,
        flexShrink: 1,
    },
    infoText: {
        fontSize: 13,
        fontFamily: 'Montserrat_400Regular',
        lineHeight: 18,
        marginBottom: layout.spacing.sm,
        flexWrap: 'wrap',
    },
    infoLink: {
        marginTop: layout.spacing.xs,
    },
    infoLinkText: {
        fontSize: 13,
        fontFamily: 'Montserrat_600SemiBold',
        textDecorationLine: 'underline',
    },
    verifiedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        marginBottom: layout.spacing.xl,
        gap: layout.spacing.sm,
    },
    verifiedInfo: {
        flex: 1,
        flexShrink: 1,
    },
    verifiedText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        flexWrap: 'wrap',
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
        gap: layout.spacing.xs,
    },
    passwordHintText: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
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
