import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentProfile, logout } from '../services/auth';
import type { Profile } from '../lib/supabase';

interface StudentSettingsScreenProps {
    onBack?: () => void;
    onLogout?: () => void;
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

export const StudentSettingsScreen = ({ onBack, onLogout }: StudentSettingsScreenProps) => {
    const { colors, isDark } = useTheme();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [biometricEnabled, setBiometricEnabled] = useState(false);

    const isSmallScreen = SCREEN_WIDTH < 375;
    const isTablet = SCREEN_WIDTH >= 768;

    useEffect(() => {
        loadProfile();
    }, []);

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

    const handleLogout = () => {
        Alert.alert(
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
                            Alert.alert('Error', result.error || 'Failed to logout');
                        }
                    },
                },
            ]
        );
    };

    const handleFaceRegistration = () => {
        // Navigate to face registration screen
        Alert.alert('Face Registration', 'This feature will be available soon.');
    };

    const handleChangePassword = () => {
        Alert.alert('Change Password', 'This feature will be available soon.');
    };

    const handlePrivacyPolicy = () => {
        Alert.alert('Privacy Policy', 'This feature will be available soon.');
    };

    const handleTermsOfService = () => {
        Alert.alert('Terms of Service', 'This feature will be available soon.');
    };

    const handleAbout = () => {
        Alert.alert(
            'About Attenon',
            'Version 1.0.0\n\nA biometric school attendance system using Face Verification.\n\n© 2026 Attenon. All rights reserved.'
        );
    };

    const handleContactSupport = () => {
        Alert.alert('Contact Support', 'Email: support@attenon.com\nPhone: +234 XXX XXX XXXX');
    };

    const accountSettings: SettingItem[] = [
        {
            id: 'face-registration',
            icon: 'face-recognition',
            title: 'Face Registration',
            subtitle: profile?.is_face_registered ? 'Registered' : 'Not Registered',
            type: 'navigation',
            onPress: handleFaceRegistration,
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
            ? (isDark ? colorPalette.grey[300] : '#EF4444')
            : (isDark ? colorPalette.grey[100] : colors.text.primary);

        const textColor = item.danger
            ? (isDark ? colorPalette.grey[300] : '#EF4444')
            : colors.text.primary;

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.settingItem,
                    {
                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                        borderBottomWidth: 1,
                        borderBottomColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
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
                                backgroundColor: item.danger
                                    ? (isDark ? colorPalette.grey[800] : '#fee')
                                    : (isDark ? colorPalette.grey[800] : colorPalette.grey[100]),
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
                <View style={styles.sectionContent}>
                    {items.map((item) => renderSettingItem(item))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <ScreenWrapper>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading...</Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <View style={[styles.header, { 
                backgroundColor: colors.background,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
            }]}>
                <TouchableOpacity
                    onPress={onBack}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={isDark ? colorPalette.grey[100] : colors.text.primary}
                    />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Settings</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Section */}
                <View style={[styles.profileSection, { backgroundColor: isDark ? colorPalette.grey[900] : colors.white }]}>
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

                <View style={{ height: layout.spacing.xl }} />
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.spacing.md,
        paddingVertical: layout.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: layout.spacing.xl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
    },
    profileSection: {
        alignItems: 'center',
        paddingVertical: layout.spacing.xl,
        paddingHorizontal: layout.spacing.lg,
        marginBottom: layout.spacing.lg,
        borderRadius: layout.borderRadius.lg,
        marginHorizontal: layout.spacing.md,
        marginTop: layout.spacing.md,
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
        marginBottom: layout.spacing.xs,
    },
    profileRegNumber: {
        fontSize: 12,
    },
    section: {
        marginBottom: layout.spacing.lg,
        paddingHorizontal: layout.spacing.md,
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
        borderRadius: layout.borderRadius.md,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: layout.spacing.md,
        paddingHorizontal: layout.spacing.md,
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
        fontFamily: 'Montserrat_500Medium',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 12,
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
        marginHorizontal: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        gap: layout.spacing.sm,
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
