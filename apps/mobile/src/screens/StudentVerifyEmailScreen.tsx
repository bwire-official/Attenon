import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface StudentVerifyEmailScreenProps {
    email: string;
    onBack?: () => void;
    onCodeVerified?: () => void;
}

export const StudentVerifyEmailScreen = ({ email, onBack, onCodeVerified }: StudentVerifyEmailScreenProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleCodeChange = (value: string, index: number) => {
        if (value.length > 1) {
            // Handle paste
            const pastedCode = value.slice(0, 6).split('');
            const newCode = [...code];
            pastedCode.forEach((char, i) => {
                if (index + i < 6 && /^\d$/.test(char)) {
                    newCode[index + i] = char;
                }
            });
            setCode(newCode);
            // Focus on the last filled input or next empty one
            const nextIndex = Math.min(index + pastedCode.length, 5);
            inputRefs.current[nextIndex]?.focus();
            return;
        }

        if (!/^\d$/.test(value) && value !== '') {
            return;
        }

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError(null);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (newCode.every(digit => digit !== '') && index === 5) {
            handleVerifyCode(newCode.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyCode = async (codeToVerify?: string) => {
        const codeString = codeToVerify || code.join('');
        
        if (codeString.length !== 6) {
            setError('Please enter the complete 6-digit code');
            return;
        }

        setLoading(true);
        setError(null);

        // Simulate API call to verify email code
        setTimeout(() => {
            setLoading(false);
            // For now, accept any 6-digit code. In production, verify with backend
            if (codeString === '123456') {
                setError('Invalid code. Please try again.');
            } else {
                onCodeVerified?.();
            }
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
                    <Text style={[styles.helloText, { color: colors.white }]}>Verify</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>Email</Text>
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
                        We've sent a 6-digit verification code to{'\n'}
                        <Text style={{ fontFamily: 'Montserrat_600SemiBold', color: colorPalette.grey[900] }}>{email}</Text>
                    </Text>

                    {/* Code Input Fields */}
                    <View style={styles.codeContainer}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputRefs.current[index] = ref)}
                                style={[styles.codeInput, {
                                    borderBottomColor: digit ? colorPalette.grey[900] : colorPalette.grey[300],
                                    color: colorPalette.grey[900],
                                }]}
                                value={digit}
                                onChangeText={(value) => handleCodeChange(value, index)}
                                onKeyPress={(e) => handleKeyPress(e, index)}
                                keyboardType="number-pad"
                                maxLength={1}
                                selectTextOnFocus
                            />
                        ))}
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        style={[styles.verifyButton, { 
                            backgroundColor: colors.black,
                            opacity: (code.join('').length !== 6 || loading) ? 0.5 : 1,
                        }]}
                        onPress={() => handleVerifyCode()}
                        disabled={code.join('').length !== 6 || loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <Text style={[styles.verifyButtonText, { color: colors.white }]}>Verifying...</Text>
                        ) : (
                            <Text style={[styles.verifyButtonText, { color: colors.white }]}>VERIFY EMAIL</Text>
                        )}
                    </TouchableOpacity>

                    {/* Resend Code */}
                    <TouchableOpacity 
                        style={styles.resendContainer}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.resendText, { color: colorPalette.grey[600] }]}>
                            Didn't receive the code?{' '}
                            <Text style={{ fontFamily: 'Montserrat_600SemiBold', color: colorPalette.grey[900] }}>Resend</Text>
                        </Text>
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
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: layout.spacing.xxl * 2,
        gap: layout.spacing.sm,
    },
    codeInput: {
        flex: 1,
        height: 60,
        fontSize: 24,
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
        borderBottomWidth: 2,
    },
    verifyButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.xl,
    },
    verifyButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
    resendContainer: {
        alignItems: 'center',
        marginTop: layout.spacing.md,
    },
    resendText: {
        fontSize: 14,
    },
});
