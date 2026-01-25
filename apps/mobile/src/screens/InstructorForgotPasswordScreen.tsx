import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { resetPassword } from '../services/auth';

interface InstructorForgotPasswordScreenProps {
    onBack?: () => void;
    onCodeSent?: (email: string) => void;
}

export const InstructorForgotPasswordScreen = ({ onBack, onCodeSent }: InstructorForgotPasswordScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [emailOrStaffId, setEmailOrStaffId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSendCode = async () => {
        if (!emailOrStaffId.trim()) {
            setError('Please enter your email address or staff ID');
            return;
        }

        // Check if it's an email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmail = emailRegex.test(emailOrStaffId.trim());

        if (isEmail) {
            setLoading(true);
            setError(null);

            const result = await resetPassword(emailOrStaffId.trim());

            setLoading(false);

            if (result.success) {
                // Navigate directly to code verification screen
                onCodeSent?.(emailOrStaffId.trim());
            } else {
                setError(result.error || 'Failed to send reset code. Please try again.');
            }
        } else {
            setError('Please enter a valid email address');
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
                    <Text style={[styles.helloText, { color: colors.white }]}>Forgot</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>Password?</Text>
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
                        Enter your email address and we'll send you a code to reset your password
                    </Text>

                    {/* Email/Staff ID Input */}
                    <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: colorPalette.grey[700] }]}>Email Address</Text>
                        <TextInput
                            style={[styles.textInput, { 
                                color: colorPalette.grey[900],
                                borderBottomColor: colorPalette.grey[300],
                            }]}
                            value={emailOrStaffId}
                            onChangeText={(text) => {
                                setEmailOrStaffId(text);
                                setError(null);
                            }}
                            placeholder="Enter your email"
                            placeholderTextColor={colorPalette.grey[400]}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoComplete="email"
                        />
                    </View>

                    {/* Send Reset Link Button */}
                    <TouchableOpacity
                        style={[styles.sendButton, { 
                            backgroundColor: colors.black,
                            opacity: (!emailOrStaffId.trim() || loading) ? 0.5 : 1,
                        }]}
                        onPress={handleSendCode}
                        disabled={!emailOrStaffId.trim() || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <Text style={[styles.sendButtonText, { color: colors.white }]}>Sending...</Text>
                        ) : (
                            <Text style={[styles.sendButtonText, { color: colors.white }]}>SEND CODE</Text>
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
        marginBottom: layout.spacing.xxl,
        lineHeight: 22,
        paddingHorizontal: layout.spacing.md,
    },
    inputGroup: {
        marginBottom: layout.spacing.xxl,
    },
    inputLabel: {
        fontSize: 14,
        marginBottom: layout.spacing.sm,
        fontFamily: 'Montserrat_400Regular',
    },
    textInput: {
        fontSize: 16,
        paddingVertical: layout.spacing.sm,
        borderBottomWidth: 1,
    },
    sendButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.xxl,
    },
    sendButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
});
