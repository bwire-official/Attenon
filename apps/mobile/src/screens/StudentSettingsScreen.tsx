import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentProfile, logout } from '../services/auth';
import { hasPIN, isBiometricEnabled, setBiometricEnabled as saveBiometricEnabled, checkBiometricAvailability, deletePIN, canEnableBiometrics, authenticateWithBiometric, getLockTimeout, setLockTimeout } from '../services/security';
import type { Profile } from '../lib/supabase';
import { CustomAlert } from '../components/CustomAlert';

interface StudentSettingsScreenProps {
    onBack?: () => void;
    onLogout?: () => void;
    onNavigateToPINSetup?: () => void;
    onNavigateToFaceSetup?: () => void;
    isActive?: boolean;
}

interface SettingItem {
    id: string;
    icon: string;
    title: string;
    subtitle?: string;
    type: 'navigation' | 'toggle' | 'action';
    value?: boolean;
    onPress?: () => void;
    onToggle?: (value: boolean) => void;
    showChevron?: boolean;
    danger?: boolean;
}

export const StudentSettingsScreen = ({ onBack, onLogout, onNavigateToPINSetup, onNavigateToFaceSetup, isActive }: StudentSettingsScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(false);
    const [hasPinSet, setHasPinSet] = useState(false);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [lockTimeout, setLockTimeoutState] = useState(30000);

    // Custom Alert State
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        icon?: string;
        iconColor?: string;
        actions: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
    }>({
        visible: false,
        title: '',
        message: '',
        actions: [],
    });

    const showAlert = (title: string, message: string, actions: any[], icon?: string, iconColor?: string) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            actions,
            icon,
            iconColor,
        });
    };

    useEffect(() => {
        // Load on mount or when screen becomes active
        // isActive can be undefined initially, so we check for explicit true or undefined (for backward compatibility)
        if (isActive !== false) {
            loadProfile();
            loadSecuritySettings();
        }
    }, [isActive]);

    const loadProfile = async () => {
        try {
            const userProfile = await getCurrentProfile();
            setProfile(userProfile);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadSecuritySettings = async () => {
        try {
            const pinExists = await hasPIN();
            const biometric = await isBiometricEnabled();
            const available = await checkBiometricAvailability();
            const timeout = await getLockTimeout();

            setHasPinSet(pinExists);
            setBiometricEnabled(biometric);
            setBiometricAvailable(available?.available ?? false);
            setLockTimeoutState(timeout ?? 30000);
        } catch (error) {
            console.error('Error loading security settings:', error);
            // Set defaults on error
            setHasPinSet(false);
            setBiometricEnabled(false);
            setBiometricAvailable(false);
            setLockTimeoutState(30000);
        }
    };

    const handleRemovePIN = async () => {
        showAlert(
            'Remove PIN',
            'Are you sure you want to remove your PIN? This will disable the app lock security.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await deletePIN();
                        if (success) {
                            setHasPinSet(false);
                            setBiometricEnabled(false);
                            showAlert('Success', 'PIN removed successfully.', [{ text: 'OK' }], 'checkmark-circle-outline', colorPalette.yellowGreen[500]);
                        } else {
                            showAlert('Error', 'Failed to remove PIN.', [{ text: 'OK' }], 'alert-circle-outline', '#EF4444');
                        }
                    },
                },
            ],
            'keypad-outline',
            '#EF4444'
        );
    };

    const handleSetupPIN = () => {
        if (hasPinSet) {
            showAlert(
                'PIN Security',
                'What would you like to do with your PIN?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove PIN',
                        style: 'destructive',
                        onPress: handleRemovePIN,
                    },
                    {
                        text: 'Change PIN',
                        onPress: () => {
                            onNavigateToPINSetup?.();
                        },
                    },
                ],
                'keypad-outline'
            );
        } else {
            onNavigateToPINSetup?.();
        }
    };

    const handleBiometricToggle = async (value: boolean) => {
        if (value) {
            const canEnable = await canEnableBiometrics();
            if (!canEnable.canEnable) {
                const isPinMissing = canEnable.error?.includes('PIN');
                showAlert(
                    isPinMissing ? 'PIN Required' : 'Not Available',
                    canEnable.error || 'Cannot enable biometrics.',
                    isPinMissing ? [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Setup PIN',
                            onPress: () => {
                                onNavigateToPINSetup?.();
                            },
                        },
                    ] : [{ text: 'OK' }],
                    isPinMissing ? 'lock-closed-outline' : 'alert-circle-outline',
                    isPinMissing ? colors.primary : '#EF4444'
                );
                return;
            }

            const biometricSuccess = await authenticateWithBiometric();
            if (!biometricSuccess) {
                showAlert('Auth Failed', 'Biometric authentication failed. Please try again.', [{ text: 'OK' }], 'finger-print-outline', '#EF4444');
                return;
            }

            const success = await saveBiometricEnabled(true);
            if (success) {
                setBiometricEnabled(true);
                showAlert('Success', 'Biometric authentication enabled successfully.', [{ text: 'OK' }], 'checkmark-circle-outline', colorPalette.yellowGreen[500]);
            } else {
                showAlert('Error', 'Failed to save biometric settings.', [{ text: 'OK' }], 'alert-circle-outline', '#EF4444');
            }
        } else {
            const success = await saveBiometricEnabled(false);
            if (success) {
                setBiometricEnabled(false);
            } else {
                showAlert('Error', 'Failed to update biometric settings.', [{ text: 'OK' }], 'alert-circle-outline', '#EF4444');
            }
        }
    };

    const handleTimeoutPress = () => {
        const options = [
            { label: 'Immediate', value: 0 },
            { label: '30 Seconds', value: 30000 },
            { label: '1 Minute', value: 60000 },
            { label: '5 Minutes', value: 300000 },
            { label: '10 Minutes', value: 600000 },
        ];

        showAlert(
            'App Lock Timeout',
            'Select how long the app stays unlocked after leaving it:',
            options.map(opt => ({
                text: opt.label,
                onPress: async () => {
                    const success = await setLockTimeout(opt.value);
                    if (success) {
                        setLockTimeoutState(opt.value);
                    }
                }
            })),
            'timer-outline'
        );
    };

    const handleLogout = () => {
        showAlert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await logout();
                        if (result.success) {
                            onLogout?.();
                        } else {
                            showAlert('Error', result.error || 'Failed to logout', [{ text: 'OK' }], 'alert-circle-outline', '#EF4444');
                        }
                    },
                },
            ],
            'log-out-outline',
            '#EF4444'
        );
    };

    const handleFaceRegistration = () => {
        if (profile?.is_face_registered) {
            showAlert(
                'Face Already Registered',
                'Your face is already registered. Would you like to update your face data?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Update Face',
                        onPress: () => {
                            onNavigateToFaceSetup?.();
                        },
                    },
                ],
                'scan-outline',
                colors.primary
            );
        } else {
            onNavigateToFaceSetup?.();
        }
    };

    const handleChangePassword = () => {
        showAlert('Coming Soon', 'This feature will be available in the next update.', [{ text: 'Got it' }], 'lock-closed-outline');
    };

    const handlePrivacyPolicy = () => {
        showAlert('Coming Soon', 'This feature will be available in the next update.', [{ text: 'Got it' }], 'shield-checkmark-outline');
    };

    const handleTermsOfService = () => {
        showAlert('Coming Soon', 'This feature will be available in the next update.', [{ text: 'Got it' }], 'document-text-outline');
    };

    const handleAbout = () => {
        showAlert(
            'About Attenon',
            'Version 1.0.0\n\nA biometric school attendance system using Face Verification.\n\n© 2026 Attenon. All rights reserved.',
            [{ text: 'Close' }],
            'information-circle-outline'
        );
    };

    const handleContactSupport = () => {
        showAlert(
            'Contact Support',
            'Email: support@attenon.com\nPhone: +234 XXX XXX XXXX',
            [{ text: 'Close' }],
            'help-circle-outline'
        );
    };

    const accountSettings: SettingItem[] = [
        {
            id: 'face-registration',
            icon: 'scan-outline',
            title: 'Face Verification',
            subtitle: profile?.is_face_registered ? 'Registered' : 'Not Registered',
            type: 'navigation',
            onPress: handleFaceRegistration,
            showChevron: true,
        },
        {
            id: 'setup-pin',
            icon: 'keypad-outline',
            title: 'Setup PIN',
            subtitle: hasPinSet ? 'Change or remove PIN' : 'Set up app lock PIN',
            type: 'navigation',
            onPress: handleSetupPIN,
            showChevron: true,
        },
        {
            id: 'change-password',
            icon: 'lock-closed-outline',
            title: 'Change Password',
            type: 'navigation',
            onPress: handleChangePassword,
            showChevron: true,
        },
    ];

    const notificationSettings: SettingItem[] = [
        {
            id: 'notifications',
            icon: 'notifications-outline',
            title: 'Push Notifications',
            subtitle: 'Receive notifications on your device',
            type: 'toggle',
            value: notificationsEnabled,
            onToggle: setNotificationsEnabled,
        },
        {
            id: 'email-notifications',
            icon: 'mail-outline',
            title: 'Email Notifications',
            subtitle: 'Receive notifications via email',
            type: 'toggle',
            value: emailNotifications,
            onToggle: setEmailNotifications,
        },
    ];

    const securitySettings: SettingItem[] = [
        {
            id: 'biometrics',
            icon: 'finger-print-outline',
            title: 'Biometrics',
            subtitle: biometricAvailable
                ? (biometricEnabled ? 'Enabled' : 'Use fingerprint or Face ID')
                : 'Not available on this device',
            type: 'toggle',
            value: biometricEnabled,
            onToggle: handleBiometricToggle,
        },
        {
            id: 'lock-timeout',
            icon: 'timer-outline',
            title: 'Lock Timeout',
            subtitle: lockTimeout === 0 ? 'Immediate' : `${lockTimeout / 60000 >= 1 ? `${lockTimeout / 60000}m` : `${lockTimeout / 1000}s`}`,
            type: 'navigation',
            onPress: handleTimeoutPress,
            showChevron: true,
        },
    ];

    const privacySettings: SettingItem[] = [
        {
            id: 'privacy-policy',
            icon: 'shield-checkmark-outline',
            title: 'Privacy Policy',
            type: 'navigation',
            onPress: handlePrivacyPolicy,
            showChevron: true,
        },
        {
            id: 'terms',
            icon: 'document-text-outline',
            title: 'Terms of Service',
            type: 'navigation',
            onPress: handleTermsOfService,
            showChevron: true,
        },
    ];

    const aboutSettings: SettingItem[] = [
        {
            id: 'about',
            icon: 'information-circle-outline',
            title: 'About',
            subtitle: 'Version 1.0.0',
            type: 'navigation',
            onPress: handleAbout,
            showChevron: true,
        },
        {
            id: 'support',
            icon: 'help-circle-outline',
            title: 'Help & Support',
            type: 'navigation',
            onPress: handleContactSupport,
            showChevron: true,
        },
    ];

    const renderSettingItem = (item: SettingItem) => {
        const iconColor = item.danger
            ? '#EF4444'
            : (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]);

        const iconBgColor = item.danger
            ? (isDark ? '#7F1D1D' : '#FEE2E2')
            : (isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100]);

        const textColor = item.danger
            ? '#EF4444'
            : colors.text.primary;

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.settingItem,
                    {
                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    },
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
                disabled={item.type === 'toggle'}
            >
                <View style={styles.settingLeft}>
                    <View
                        style={[
                            styles.iconContainer,
                            {
                                backgroundColor: iconBgColor,
                            },
                        ]}
                    >
                        <Ionicons name={item.icon as any} size={20} color={iconColor} />
                    </View>
                    <View style={styles.settingTextContainer}>
                        <Text style={[styles.settingTitle, { color: textColor }]}>{item.title}</Text>
                        {item.subtitle && (
                            <Text style={[styles.settingSubtitle, { color: colors.text.secondary }]}>
                                {item.subtitle}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={styles.settingRight}>
                    {item.type === 'toggle' && (
                        <Switch
                            value={item.value}
                            onValueChange={item.onToggle}
                            trackColor={{
                                false: isDark ? colorPalette.grey[700] : colorPalette.grey[300],
                                true: isDark ? colorPalette.frozenLake[600] : colorPalette.frozenLake[500],
                            }}
                            thumbColor={item.value ? colors.white : colorPalette.grey[500]}
                            ios_backgroundColor={isDark ? colorPalette.grey[700] : colorPalette.grey[300]}
                        />
                    )}
                    {item.showChevron && (
                        <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={colors.text.tertiary}
                        />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderSection = (title: string, items: SettingItem[]) => {
        return (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
                <View style={[styles.sectionContent, {
                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                }]}>
                    {items.map((item) => renderSettingItem(item))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.headerSection, {
                    backgroundColor: colors.black,
                    paddingTop: insets.top + layout.spacing.md,
                }]}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBack}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.white }]}>Settings</Text>
                        <View style={styles.headerRight} />
                    </View>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

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
                        onPress={onBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Settings</Text>
                    <View style={styles.headerRight} />
                </View>
            </View>

            {/* Content Section */}
            <View style={[styles.contentSection, {
                backgroundColor: isDark ? colorPalette.grey[900] : colors.white
            }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(insets.bottom, layout.spacing.xl) },
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                >
                    {/* Profile Section */}
                    <View style={[styles.profileSection, {
                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white
                    }]}>
                        <View style={[styles.avatarContainer, {
                            backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100],
                        }]}>
                            <Ionicons
                                name="person"
                                size={40}
                                color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]}
                            />
                        </View>
                        <Text style={[styles.profileName, { color: colors.text.primary }]}>
                            {profile?.full_name || 'Student'}
                        </Text>
                        <Text style={[styles.profileEmail, { color: colors.text.secondary }]}>
                            {profile?.email || 'email@example.com'}
                        </Text>
                        {profile?.reg_number && (
                            <Text style={[styles.profileRegNumber, { color: colors.text.tertiary }]}>
                                {profile.reg_number}
                            </Text>
                        )}
                    </View>

                    {/* Account Settings */}
                    {renderSection('Account', accountSettings)}

                    {/* Security */}
                    {renderSection('Security', securitySettings)}

                    {/* Notifications */}
                    {renderSection('Notifications', notificationSettings)}

                    {/* Privacy & Security */}
                    {renderSection('Privacy & Security', privacySettings)}

                    {/* About */}
                    {renderSection('About', aboutSettings)}

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={[styles.logoutButton, {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                        }]}
                        onPress={handleLogout}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Custom Alert */}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                actions={alertConfig.actions}
                icon={alertConfig.icon}
                iconColor={alertConfig.iconColor}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xxl * 2,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: layout.spacing.xl,
        paddingHorizontal: layout.spacing.lg,
        marginBottom: layout.spacing.xl,
        borderRadius: layout.borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    profileName: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xs,
    },
    profileEmail: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        marginBottom: layout.spacing.xs,
    },
    profileRegNumber: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
    },
    section: {
        marginBottom: layout.spacing.xl,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: layout.spacing.sm,
        marginLeft: layout.spacing.xs,
    },
    sectionContent: {
        borderRadius: layout.borderRadius.lg,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: layout.spacing.md,
        paddingHorizontal: layout.spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.sm,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: layout.spacing.md,
        borderRadius: layout.borderRadius.lg,
        gap: layout.spacing.sm,
        marginTop: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    logoutText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        color: '#EF4444',
    },
});
