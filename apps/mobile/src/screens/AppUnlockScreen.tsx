import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Keyboard, AppState, AppStateStatus, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import * as LocalAuthentication from 'expo-local-authentication';
import { verifyPINWithValidation, authenticateWithBiometric, isBiometricEnabled, checkBiometricAvailability, unlockApp, getBiometricTypeName, getBiometricIconName } from '../services/security';
import { getCurrentProfile } from '../services/auth';

interface AppUnlockScreenProps {
    onUnlock?: () => void;
}

export const AppUnlockScreen = ({ onUnlock }: AppUnlockScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isLoadingName, setIsLoadingName] = useState(true);

    const pinInputRef = useRef<TextInput>(null);
    const appState = useRef(AppState.currentState);

    // Use refs to track current values for AppState listener to avoid stale closures
    const biometricEnabledRef = useRef(biometricEnabled);
    const biometricAvailableRef = useRef(biometricAvailable);
    const isAuthenticatingRef = useRef(isAuthenticating);

    // Keep refs in sync with state
    useEffect(() => {
        biometricEnabledRef.current = biometricEnabled;
    }, [biometricEnabled]);

    useEffect(() => {
        biometricAvailableRef.current = biometricAvailable;
    }, [biometricAvailable]);

    useEffect(() => {
        isAuthenticatingRef.current = isAuthenticating;
    }, [isAuthenticating]);

    useEffect(() => {
        checkBiometrics();
        loadUserName();
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        // Ensure keyboard pops up on mount (if no biometric auto-prompt or after delay)
        const timer = setTimeout(() => {
            pinInputRef.current?.focus();
        }, 600);
        return () => {
            subscription.remove();
            clearTimeout(timer);
        };
    }, []);

    const loadUserName = async () => {
        setIsLoadingName(true);
        try {
            const user = await getCurrentProfile();
            if (user && user.full_name) {
                const firstName = user.full_name.split(' ')[0];
                setUserName(firstName);
            }
        } catch (error) {
            console.error('Error loading user name:', error);
            setUserName('');
        } finally {
            setIsLoadingName(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const checkBiometrics = async () => {
        const available = await checkBiometricAvailability();
        const enabled = await isBiometricEnabled();

        setBiometricAvailable(available.available);
        setBiometricEnabled(enabled);

        if (available.type.length > 0) {
            const typeName = getBiometricTypeName(available.type);
            setBiometricType(typeName);
        }
    };

    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        if (
            appState.current.match(/inactive|background/) &&
            nextAppState === 'active' &&
            biometricEnabledRef.current &&
            biometricAvailableRef.current &&
            !isAuthenticatingRef.current
        ) {
            setTimeout(() => {
                handleBiometricAuth(true);
            }, 500);
        }
        appState.current = nextAppState;
    }, []);

    const handleBiometricAuth = async (autoTrigger = false) => {
        if (isAuthenticating) {
            return;
        }

        setIsAuthenticating(true);
        try {
            const success = await authenticateWithBiometric();
            if (success) {
                await unlockApp();
                onUnlock?.();
            } else {
                if (!autoTrigger) {
                    Alert.alert('Authentication Failed', 'Biometric authentication was cancelled or failed. Please try again or use your PIN.');
                }
            }
        } catch (error) {
            console.error('Error in biometric authentication:', error);
            if (!autoTrigger) {
                Alert.alert('Error', 'Biometric authentication failed. Please try again or use your PIN.');
            }
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handlePinChange = (value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        if (numericValue.length <= 6) {
            setPin(numericValue);
            if (numericValue.length === 6) {
                Keyboard.dismiss();
                handleVerifyPIN(numericValue);
            }
        }
    };

    const handleVerifyPIN = async (pinToVerify: string) => {
        const result = await verifyPINWithValidation(pinToVerify);
        if (result.success) {
            await unlockApp();
            onUnlock?.();
        } else {
            Alert.alert('Error', result.error || 'Incorrect PIN. Please try again.');
            setPin('');
            pinInputRef.current?.focus();
        }
    };

    const handleFocusPin = () => {
        // Ensure keyboard appears
        if (pinInputRef.current) {
            pinInputRef.current.blur();
            setTimeout(() => {
                pinInputRef.current?.focus();
            }, 100);
        }
    };

    const renderPinDots = () => {
        if (showPin) {
            return (
                <TouchableOpacity onPress={handleFocusPin} activeOpacity={1} style={styles.pinTextContainer}>
                    <Text style={[styles.pinText, { color: colors.text.primary }]}>
                        {pin.padEnd(6, '•')}
                    </Text>
                </TouchableOpacity>
            );
        }
        return (
            <TouchableOpacity onPress={handleFocusPin} activeOpacity={1} style={styles.pinDotsContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                    <View
                        key={index}
                        style={[
                            styles.pinDot,
                            {
                                backgroundColor: index < pin.length
                                    ? (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600])
                                    : (isDark ? colorPalette.grey[700] : colorPalette.grey[300]),
                            },
                        ]}
                    />
                ))}
            </TouchableOpacity>
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
                    <View style={styles.headerLeft}>
                        <Text style={[styles.greeting, { color: colors.white }]}>
                            {getGreeting()}
                        </Text>
                        {isLoadingName ? (
                            <View style={{
                                width: 150,
                                height: 32,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 8,
                                marginTop: 4
                            }} />
                        ) : (
                            <Text style={[styles.name, { color: colors.white }]} numberOfLines={1}>
                                {userName || 'User'}
                            </Text>
                        )}
                    </View>
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
                                        size={32}
                                        color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]}
                                    />
                                </View>
                            </View>

                            <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                                Enter your PIN to continue
                            </Text>

                            <View style={styles.pinContainer}>
                                {renderPinDots()}
                                <TextInput
                                    ref={pinInputRef}
                                    style={styles.hiddenInput}
                                    value={pin}
                                    onChangeText={handlePinChange}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    secureTextEntry={!showPin}
                                    autoFocus={true}
                                />
                            </View>

                            {biometricAvailable && biometricEnabled && (
                                <TouchableOpacity
                                    style={[styles.biometricButton, {
                                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                    }]}
                                    onPress={() => handleBiometricAuth()}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons
                                        name={getBiometricIconName(biometricType) as any}
                                        size={24}
                                        color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]}
                                    />
                                    <Text style={[styles.biometricText, { color: colors.text.primary }]}>
                                        Use {biometricType}
                                    </Text>
                                </TouchableOpacity>
                            )}

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
    headerLeft: {
        flex: 1,
    },
    greeting: {
        fontSize: 32,
        fontFamily: 'Montserrat_300Light',
        marginBottom: layout.spacing.xs / 2,
    },
    name: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
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
        marginBottom: layout.spacing.lg,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
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
        width: 1,
        height: 1,
        opacity: 0,
    },
    biometricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: layout.spacing.sm,
        paddingVertical: layout.spacing.md,
        paddingHorizontal: layout.spacing.xl,
        borderRadius: layout.borderRadius.lg,
        marginBottom: layout.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    biometricText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
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
