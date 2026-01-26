import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { setupPINWithValidation } from '../services/security';

interface PINSetupScreenProps {
    onBack?: () => void;
    onComplete?: () => void;
}

export const PINSetupScreen = ({ onBack, onComplete }: PINSetupScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState<'create' | 'confirm'>('create');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const pinInputRef = useRef<TextInput>(null);
    const confirmPinInputRef = useRef<TextInput>(null);

    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        const timer = setTimeout(() => {
            if (mounted.current) {
                pinInputRef.current?.focus();
            }
        }, 300);
        return () => {
            mounted.current = false;
            clearTimeout(timer);
        };
    }, []);

    const handlePinChange = (value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        if (numericValue.length <= 6) {
            if (step === 'create') {
                setPin(numericValue);
                if (numericValue.length === 6) {
                    Keyboard.dismiss();
                    setTimeout(() => {
                        if (mounted.current) {
                            setStep('confirm');
                            confirmPinInputRef.current?.focus();
                        }
                    }, 300);
                }
            } else {
                setConfirmPin(numericValue);
                if (numericValue.length === 6) {
                    Keyboard.dismiss();
                    setTimeout(() => {
                        handleConfirm(numericValue);
                    }, 100);
                }
            }
        }
    };

    const handleConfirm = async (confirmPinValue?: string) => {
        const currentPin = pin;
        const currentConfirmPin = confirmPinValue || confirmPin;

        try {
            const result = await setupPINWithValidation(currentPin, currentConfirmPin);
            if (result.success) {
                Alert.alert('Success', 'PIN has been set successfully.', [
                    {
                        text: 'OK',
                        onPress: () => {
                            if (mounted.current) {
                                onComplete?.();
                            }
                        },
                    },
                ]);
            } else {
                Alert.alert('Error', result.error || 'Failed to save PIN. Please try again.');
                if (result.error?.includes('match')) {
                    if (mounted.current) {
                        setConfirmPin('');
                        setStep('create');
                        setPin('');
                        pinInputRef.current?.focus();
                    }
                }
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred.');
        }
    };

    const handleBack = () => {
        if (step === 'confirm') {
            setStep('create');
            setConfirmPin('');
            pinInputRef.current?.focus();
        } else {
            onBack?.();
        }
    };

    const renderPinDots = (value: string) => {
        if (showPin) {
            return (
                <View style={styles.pinTextContainer}>
                    <Text style={[styles.pinText, { color: colors.text.primary }]}>
                        {value.padEnd(6, '•')}
                    </Text>
                </View>
            );
        }
        return (
            <View style={styles.pinDotsContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.pinDot,
                            {
                                backgroundColor: index < value.length
                                    ? (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600])
                                    : (isDark ? colorPalette.grey[700] : colorPalette.grey[300]),
                            },
                        ]}
                    />
                ))}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background, flex: 1 }]}>
            {/* Header Section */}
            <View
                style={[
                    styles.headerSection,
                    {
                        backgroundColor: colors.black,
                        paddingTop: insets.top + layout.spacing.md,
                    },
                ]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={handleBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>
                        {step === 'create' ? 'Create PIN' : 'Confirm PIN'}
                    </Text>
                    <View style={styles.headerRight} />
                </View>
            </View>

            {/* Content Section */}
            <View style={[styles.contentSection, {
                backgroundColor: isDark ? colorPalette.grey[50] : colors.white
            }]}>
                <KeyboardAvoidingView
                    style={styles.keyboardAvoidingView}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.content}>
                            <View style={styles.iconContainer}>
                                <View style={[styles.iconCircle, {
                                    backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100],
                                }]}>
                                    <Ionicons
                                        name="lock-closed"
                                        size={48}
                                        color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]}
                                    />
                                </View>
                            </View>

                            <Text style={[styles.title, { color: colors.text.primary }]}>
                                {step === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
                            </Text>
                            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                                {step === 'create'
                                    ? 'Enter a 6-digit PIN to secure your app'
                                    : 'Re-enter your PIN to confirm'}
                            </Text>

                            <TouchableOpacity
                                style={styles.pinContainer}
                                onPress={() => {
                                    if (step === 'create') {
                                        pinInputRef.current?.focus();
                                    } else {
                                        confirmPinInputRef.current?.focus();
                                    }
                                }}
                                activeOpacity={1}
                            >
                                {renderPinDots(step === 'create' ? pin : confirmPin)}
                                <TextInput
                                    ref={step === 'create' ? pinInputRef : confirmPinInputRef}
                                    style={styles.hiddenInput}
                                    value={step === 'create' ? pin : confirmPin}
                                    onChangeText={handlePinChange}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    secureTextEntry={!showPin}
                                    autoFocus={false}
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.toggleButton}
                                onPress={() => setShowPin(!showPin)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={showPin ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color={colors.text.secondary}
                                />
                                <Text style={[styles.toggleText, { color: colors.text.secondary }]}>
                                    {showPin ? 'Hide PIN' : 'Show PIN'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    headerSection: {
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xxl * 2,
        overflow: 'hidden',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: layout.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    contentSection: {
        flex: 1,
        marginTop: -35,
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        overflow: 'hidden',
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: layout.spacing.xxl * 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xxl * 2,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
    },
    iconContainer: {
        marginBottom: layout.spacing.xl,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        textAlign: 'center',
        marginBottom: layout.spacing.xxl * 2,
    },
    pinContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: layout.spacing.xl,
        minHeight: 100,
        justifyContent: 'center',
    },
    pinDotsContainer: {
        flexDirection: 'row',
        gap: layout.spacing.md,
        marginBottom: layout.spacing.xl,
    },
    pinDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
    },
    pinTextContainer: {
        marginBottom: layout.spacing.xl,
        minHeight: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pinText: {
        fontSize: 32,
        fontFamily: 'Montserrat_600SemiBold',
        letterSpacing: 8,
    },
    hiddenInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
        zIndex: 1,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.xs,
    },
    toggleText: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
});
