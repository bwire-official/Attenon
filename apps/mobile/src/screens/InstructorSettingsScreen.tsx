import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking, Dimensions, BackHandler, Animated, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser, clearSession } from '../services/session';
import { CustomAlert } from '../components/CustomAlert';

const CACHE_KEY_INSTRUCTOR_SETTINGS = '@instructor_settings_profile';
const APP_VERSION = 'v1.0.2';
const APP_BUILD = 'Build 45';

interface InstructorSettingsScreenProps {
    onBack: () => void;
    onLogout: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

export const InstructorSettingsScreen = ({ onBack, onLogout }: InstructorSettingsScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [faceIdEnabled, setFaceIdEnabled] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

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

    useEffect(() => {
        loadCachedData();

        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });

        return () => backHandler.remove();
    }, [onBack]);

    const loadCachedData = async () => {
        try {
            const cachedProfile = await AsyncStorage.getItem(CACHE_KEY_INSTRUCTOR_SETTINGS);
            if (cachedProfile) {
                setProfile(JSON.parse(cachedProfile));
                setLoading(false);
                setIsInitialLoad(false);
            }
            fetchProfile();
        } catch (error) {
            console.error('Error loading cached data:', error);
            fetchProfile();
        }
    };

    const fetchProfile = async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                const profileData = {
                    full_name: user.full_name || 'Instructor',
                    email: user.email || ''
                };
                setProfile(profileData);
                await AsyncStorage.setItem(CACHE_KEY_INSTRUCTOR_SETTINGS, JSON.stringify(profileData));
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
            setIsInitialLoad(false);
        }
    };

    const shimmerOpacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const SkeletonBox = ({ style }: { style?: any }) => (
        <Animated.View
            style={[
                {
                    backgroundColor: isDark ? colorPalette.grey[700] : colorPalette.grey[200],
                    borderRadius: 8,
                    opacity: shimmerOpacity,
                },
                style,
            ]}
        />
    );

    const ProfileSkeleton = () => (
        <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                <SkeletonBox style={styles.avatar} />
            </View>
            <SkeletonBox style={{ width: 180, height: 24, marginBottom: 8 }} />
            <SkeletonBox style={{ width: 200, height: 14 }} />
        </View>
    );

    const SettingItemSkeleton = () => (
        <View style={[styles.settingItem, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
            <SkeletonBox style={styles.iconBox} />
            <SkeletonBox style={{ flex: 1, height: 16, marginRight: 16 }} />
            <SkeletonBox style={{ width: 20, height: 20 }} />
        </View>
    );

    const SectionSkeleton = ({ title, itemCount = 2 }: { title: string; itemCount?: number }) => (
        <>
            <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>{title}</Text>
            <View style={styles.sectionGroup}>
                {Array.from({ length: itemCount }).map((_, index) => (
                    <SettingItemSkeleton key={index} />
                ))}
            </View>
        </>
    );

    const handleLogout = async () => {
        showAlert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        setLoggingOut(true);
                        try {
                            await clearSession();
                            onLogout();
                        } catch (error) {
                            console.error('Logout error:', error);
                            setLoggingOut(false);
                        }
                    }
                }
            ],
            'log-out-outline',
            '#EF4444'
        );
    };

    const renderSettingItem = ({
        icon,
        label,
        value,
        onPress,
        type = 'link',
        danger = false,
        isLoading = false
    }: {
        icon: any,
        label: string,
        value?: boolean | string,
        onPress?: () => void,
        type?: 'link' | 'toggle' | 'info',
        danger?: boolean,
        isLoading?: boolean
    }) => (
        <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}
            onPress={type === 'toggle' ? undefined : onPress}
            activeOpacity={type === 'toggle' ? 1 : 0.7}
            disabled={type === 'info' || isLoading}
        >
            <View style={[styles.iconBox, { backgroundColor: danger ? '#FEE2E2' : (isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[50]) }]}>
                {isLoading ? (
                    <ActivityIndicator size="small" color={danger ? '#DC2626' : colorPalette.frozenLake[500]} />
                ) : (
                    <Ionicons
                        name={icon}
                        size={20}
                        color={danger ? '#DC2626' : (isDark ? colorPalette.frozenLake[200] : colorPalette.frozenLake[600])}
                    />
                )}
            </View>
            <Text style={[styles.settingLabel, { color: danger ? '#DC2626' : colors.text.primary }]}>
                {isLoading ? 'Logging out...' : label}
            </Text>

            {type === 'toggle' && !isLoading && (
                <Switch
                    value={value as boolean}
                    onValueChange={onPress}
                    trackColor={{ false: colorPalette.grey[300], true: colorPalette.frozenLake[500] }}
                    thumbColor={colors.white}
                />
            )}

            {type === 'link' && !isLoading && (
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            )}

            {type === 'info' && !isLoading && (
                <Text style={[styles.infoValue, { color: colors.text.secondary }]}>{value as string}</Text>
            )}
        </TouchableOpacity>
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

                            {/* Skeleton Settings */}
                            <View style={[styles.formContainer, { paddingBottom: insets.bottom + layout.spacing.xl }]}>
                                <SectionSkeleton title="PREFERENCES" itemCount={1} />
                                <SectionSkeleton title="SECURITY" itemCount={2} />
                                <SectionSkeleton title="SUPPORT" itemCount={2} />
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Overlapping Profile Section */}
                            <View style={styles.profileHeader}>
                                <View style={[styles.avatarContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                                    <View style={[styles.avatar, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100] }]}>
                                        <Text style={[styles.avatarText, { color: isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600] }]}>
                                            {(profile?.full_name || 'Instructor').trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'IN'}
                                        </Text>
                                    </View>
                                    <View style={styles.editBadge}>
                                        <Ionicons name="camera" size={12} color={colors.white} />
                                    </View>
                                </View>

                                <Text style={[styles.profileName, { color: colors.text.primary }]}>
                                    {profile?.full_name || 'Instructor'}
                                </Text>
                                <Text style={[styles.profileEmail, { color: colors.text.tertiary }]}>
                                    {profile?.email || ''}
                                </Text>
                            </View>

                            {/* Settings Groups */}
                            <View style={[styles.formContainer, { paddingBottom: insets.bottom + layout.spacing.xl }]}>

                                {/* Section: Preferences */}
                                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>PREFERENCES</Text>
                                <View style={styles.sectionGroup}>
                                    {renderSettingItem({
                                        icon: 'notifications',
                                        label: 'Push Notifications',
                                        value: notificationsEnabled,
                                        type: 'toggle',
                                        onPress: () => setNotificationsEnabled(!notificationsEnabled)
                                    })}
                                </View>

                                {/* Section: Security */}
                                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>SECURITY</Text>
                                <View style={styles.sectionGroup}>
                                    {renderSettingItem({
                                        icon: 'scan',
                                        label: 'Face ID / Touch ID',
                                        value: faceIdEnabled,
                                        type: 'toggle',
                                        onPress: () => setFaceIdEnabled(!faceIdEnabled)
                                    })}
                                    {renderSettingItem({
                                        icon: 'lock-closed',
                                        label: 'Change Password',
                                        onPress: () => { }
                                    })}
                                </View>

                                {/* Section: Support */}
                                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>SUPPORT</Text>
                                <View style={styles.sectionGroup}>
                                    {renderSettingItem({
                                        icon: 'help-circle',
                                        label: 'Help Center',
                                        onPress: () => {
                                            Linking.openURL('https://attenon.com/help').catch(err => {
                                                console.error('Failed to open Help Center URL:', err);
                                            });
                                        }
                                    })}
                                    {renderSettingItem({
                                        icon: 'information-circle',
                                        label: 'About Attenon',
                                        value: APP_VERSION,
                                        type: 'info'
                                    })}
                                </View>

                                {/* Section: Account */}
                                <View style={{ marginTop: layout.spacing.xl }}>
                                    {renderSettingItem({
                                        icon: 'log-out',
                                        label: 'Log Out',
                                        onPress: handleLogout,
                                        danger: true,
                                        type: 'link',
                                        isLoading: loggingOut
                                    })}
                                </View>

                                <Text style={[styles.versionText, { color: colors.text.tertiary }]}>
                                    Attenon Instructor App {APP_VERSION} ({APP_BUILD})
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
        </View >
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
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colorPalette.frozenLake[500],
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
    },
    formContainer: {
        paddingHorizontal: layout.spacing.xl,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.sm,
        marginTop: layout.spacing.lg,
        paddingLeft: layout.spacing.xs,
        letterSpacing: 0.5,
    },
    sectionGroup: {
        gap: 1,
        borderRadius: layout.borderRadius.lg,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        // marginBottom: 1, // handled by gap implies separate views but if background is shared... 
        // Let's use individual cards for modern look or joined list. Joined list feels more "Settings".
        marginBottom: 1,
        borderRadius: layout.borderRadius.md,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    settingLabel: {
        flex: 1,
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
    },
    infoValue: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
    versionText: {
        textAlign: 'center',
        marginTop: layout.spacing.xxl,
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        opacity: 0.5,
    }
});
