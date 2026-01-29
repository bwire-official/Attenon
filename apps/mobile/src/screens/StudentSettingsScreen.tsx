import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, Dimensions, BackHandler, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

const CACHE_KEY_PROFILE = '@student_settings_profile';
const CACHE_KEY_SECURITY = '@student_settings_security';

export const StudentSettingsScreen = ({ onBack, onLogout, onNavigateToPINSetup, onNavigateToFaceSetup, isActive }: StudentSettingsScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!isActive) return;
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (onBack) {
                onBack();
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [onBack, isActive]);

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnimation, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnimation, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
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
        if (isActive === false) return;

        let isCancelled = false;

        const loadCachedData = async () => {
            try {
                const cachedProfile = await AsyncStorage.getItem(CACHE_KEY_PROFILE);
                if (isCancelled) return;

                const cachedSecurity = await AsyncStorage.getItem(CACHE_KEY_SECURITY);
                if (isCancelled) return;

                if (cachedProfile) {
                    setProfile(JSON.parse(cachedProfile));
                    setLoading(false);
                    setIsInitialLoad(false);
                }

                if (cachedSecurity) {
                    const securityData = JSON.parse(cachedSecurity);
                    if (!isCancelled) {
                        setHasPinSet(securityData.hasPinSet);
                        setBiometricEnabled(securityData.biometricEnabled);
                        setBiometricAvailable(securityData.biometricAvailable);
                        setLockTimeoutState(securityData.lockTimeout);
                    }
                }

                if (!isCancelled) {
                    loadProfile(() => isCancelled);
                    loadSecuritySettings(() => isCancelled);
                }
            } catch (error) {
                console.error('Error loading cached data:', error);
                if (!isCancelled) {
                    loadProfile(() => isCancelled);
                    loadSecuritySettings(() => isCancelled);
                }
            }
        };

        loadCachedData();

        return () => {
            isCancelled = true;
        };
    }, [isActive]);

    const loadProfile = async (isCancelledFn?: () => boolean) => {
        try {
            const userProfile = await getCurrentProfile();
            if (isCancelledFn?.()) return;
            if (userProfile != null) {
                setProfile(userProfile);
                await AsyncStorage.setItem(CACHE_KEY_PROFILE, JSON.stringify(userProfile));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            if (!isCancelledFn?.()) {
                setLoading(false);
                setIsInitialLoad(false);
            }
        }
    };

    const loadSecuritySettings = async (isCancelledFn?: () => boolean) => {
        try {
            const pinExists = await hasPIN();
            if (isCancelledFn?.()) return;
            const biometric = await isBiometricEnabled();
            if (isCancelledFn?.()) return;
            const available = await checkBiometricAvailability();
            if (isCancelledFn?.()) return;
            const timeout = await getLockTimeout();
            if (isCancelledFn?.()) return;

            const securityData = {
                hasPinSet: pinExists,
                biometricEnabled: biometric,
                biometricAvailable: available?.available ?? false,
                lockTimeout: timeout ?? 30000
            };

            setHasPinSet(securityData.hasPinSet);
            setBiometricEnabled(securityData.biometricEnabled);
            setBiometricAvailable(securityData.biometricAvailable);
            setLockTimeoutState(securityData.lockTimeout);

            await AsyncStorage.setItem(CACHE_KEY_SECURITY, JSON.stringify(securityData));
        } catch (error) {
            console.error('Error loading security settings:', error);
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
                { text: 'Cancel', style: 'cancel' },
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
                    { text: 'Update Face', onPress: () => onNavigateToFaceSetup?.() },
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
        const iconColor = item.danger ? '#EF4444' : (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]);
        const iconBgColor = item.danger ? (isDark ? '#7F1D1D' : '#FEE2E2') : (isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100]);
        const textColor = item.danger ? '#EF4444' : colors.text.primary;

        return (
            <TouchableOpacity
                key={item.id}
                style={[styles.settingItem, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}
                onPress={item.type === 'toggle' ? undefined : item.onPress}
                activeOpacity={item.type === 'toggle' ? 1 : 0.7}
                disabled={item.type === 'toggle'}
            >
                <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
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
                            trackColor={{ false: colorPalette.grey[300], true: colorPalette.frozenLake[500] }}
                            thumbColor={colors.white}
                        />
                    )}
                    {item.showChevron && (
                        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderSection = (title: string, items: SettingItem[]) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
            <View style={[styles.sectionGroup, { overflow: 'hidden', borderRadius: 12 }]}>
                {items.map(renderSettingItem)}
            </View>
        </View>
    );

    const shimmerOpacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const SkeletonLoader = ({ style }: { style?: any }) => (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                    opacity: shimmerOpacity
                },
                style
            ]}
        />
    );

    const ProfileSkeleton = () => (
        <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                <SkeletonLoader style={styles.avatar} />
            </View>
            <SkeletonLoader style={[styles.skeletonText, styles.skeletonNameText]} />
            <SkeletonLoader style={[styles.skeletonText, styles.skeletonEmailText]} />
            <SkeletonLoader style={[styles.skeletonText, styles.skeletonRegText]} />
        </View>
    );

    const SettingItemSkeleton = () => (
        <View style={[styles.settingItem, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
            <View style={styles.settingLeft}>
                <SkeletonLoader style={styles.iconContainer} />
                <View style={styles.settingTextContainer}>
                    <SkeletonLoader style={[styles.skeletonText, styles.skeletonSettingTitle]} />
                    <SkeletonLoader style={[styles.skeletonText, styles.skeletonSettingSubtitle]} />
                </View>
            </View>
        </View>
    );

    const SectionSkeleton = ({ title, itemCount = 3 }: { title: string; itemCount?: number }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
            <View style={[styles.sectionGroup, { overflow: 'hidden', borderRadius: 12 }]}>
                {Array.from({ length: itemCount }).map((_, index) => (
                    <SettingItemSkeleton key={index} />
                ))}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 1. Fixed Header Background */}
            <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />

            {/* 2. Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Spacer */}
                <View style={{ height: HEADER_HEIGHT - SHEET_OVERLAP }} />

                {/* White Sheet */}
                <View style={[styles.whiteSheet, {
                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    minHeight: SCREEN_HEIGHT - (HEADER_HEIGHT - SHEET_OVERLAP)
                }]}>

                    {isInitialLoad && !profile ? (
                        <>
                            {/* Skeleton Profile Section */}
                            <ProfileSkeleton />

                            {/* Skeleton Settings List */}
                            <View style={[styles.formContainer, { paddingBottom: insets.bottom + layout.spacing.xl }]}>
                                <SectionSkeleton title="Account Settings" itemCount={3} />
                                <SectionSkeleton title="Security" itemCount={2} />
                                <SectionSkeleton title="Notifications" itemCount={2} />
                                <SectionSkeleton title="Privacy" itemCount={2} />
                                <SectionSkeleton title="More" itemCount={2} />
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Overlapping Profile Section */}
                            <View style={styles.profileHeader}>
                                <View style={[styles.avatarContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                                    <View style={[styles.avatar, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100] }]}>
                                        {profile ? (
                                            <View style={{ alignItems: 'center' }}>
                                                <Text style={[styles.avatarText, { color: isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600] }]}>
                                                    {(profile.full_name || 'Student').trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST'}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Ionicons name="person" size={50} color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]} />
                                        )}
                                    </View>
                                    {profile?.is_face_registered && (
                                        <View style={styles.verifiedBadge}>
                                            <Ionicons name="checkmark" size={14} color={colors.white} />
                                        </View>
                                    )}
                                </View>

                                <Text style={[styles.profileName, { color: colors.text.primary }]}>
                                    {profile?.full_name || 'Student'}
                                </Text>
                                <Text style={[styles.profileEmail, { color: colors.text.tertiary }]}>
                                    {profile?.email || ''}
                                </Text>
                                {profile?.reg_number && (
                                    <View style={[styles.regBadge, { backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[100] }]}>
                                        <Text style={[styles.regText, { color: colors.text.secondary }]}>{profile.reg_number}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Settings List */}
                            <View style={[styles.formContainer, { paddingBottom: insets.bottom + layout.spacing.xl }]}>
                                {renderSection('Account Settings', accountSettings)}
                                {renderSection('Security', securitySettings)}
                                {renderSection('Notifications', notificationSettings)}
                                {renderSection('Privacy', privacySettings)}
                                {renderSection('More', aboutSettings)}

                                {/* Logout */}
                                <TouchableOpacity
                                    style={[styles.logoutButton, { backgroundColor: '#FEE2E2' }]}
                                    onPress={handleLogout}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.logoutText, { color: '#EF4444' }]}>Logout</Text>
                                </TouchableOpacity>
                                <Text style={[styles.versionText, { color: colors.text.tertiary }]}>
                                    Attenon v1.0.0
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* 3. Fixed Header Overlay */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Settings</Text>
                    <View style={{ width: 40 }} />
                </View>
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
    },
    headerBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 0,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: layout.spacing.xl,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
        flex: 1,
    },
    scrollView: {
        flex: 1,
        zIndex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    whiteSheet: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        overflow: 'visible',
    },
    profileHeader: {
        alignItems: 'center',
        marginTop: -60,
        marginBottom: layout.spacing.xl,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontFamily: 'Montserrat_700Bold',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#22c55e',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    profileName: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    profileEmail: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
        marginBottom: 8,
    },
    regBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    regText: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
    },
    formContainer: {
        paddingHorizontal: layout.spacing.xl,
    },
    section: {
        marginBottom: layout.spacing.lg,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.sm,
        paddingLeft: layout.spacing.xs,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    sectionGroup: {
        gap: 1,
        overflow: 'hidden',
        borderRadius: layout.borderRadius.lg,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        marginBottom: 1,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 11,
        fontFamily: 'Montserrat_500Medium',
        opacity: 0.7,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: layout.spacing.md,
        borderRadius: layout.borderRadius.lg,
        gap: layout.spacing.sm,
        marginTop: layout.spacing.md,
    },
    logoutText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    versionText: {
        textAlign: 'center',
        marginTop: layout.spacing.xl,
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        opacity: 0.5,
    },
    skeleton: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    skeletonText: {
        height: 16,
        borderRadius: 8,
        marginVertical: 4,
    },
    skeletonNameText: {
        width: 180,
        height: 24,
        marginBottom: 8,
    },
    skeletonEmailText: {
        width: 220,
        height: 14,
        marginBottom: 8,
    },
    skeletonRegText: {
        width: 100,
        height: 20,
    },
    skeletonSettingTitle: {
        width: '70%',
        height: 16,
        marginBottom: 4,
    },
    skeletonSettingSubtitle: {
        width: '50%',
        height: 12,
    }
});

