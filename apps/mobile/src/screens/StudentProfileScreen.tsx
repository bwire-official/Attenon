import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import type { Profile } from '../lib/supabase';

const CACHE_KEY_PROFILE = '@student_profile_data';

interface StudentProfileScreenProps {
    onBack?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

interface ProfileInfoItem {
    label: string;
    value: string | null;
    icon: string;
    color?: 'frozenLake' | 'inkBlack' | 'yellowGreen';
}

export const StudentProfileScreen = ({ onBack }: StudentProfileScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const shimmerAnimation = useRef(new Animated.Value(0)).current;
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

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
    }, []);

    const loadCachedData = async () => {
        try {
            const cachedProfile = await AsyncStorage.getItem(CACHE_KEY_PROFILE);
            if (cachedProfile) {
                setProfile(JSON.parse(cachedProfile));
                setLoading(false);
                setIsInitialLoad(false);
            }
            loadProfile();
        } catch (error) {
            console.error('Error loading cached profile:', error);
            loadProfile();
        }
    };

    const loadProfile = async () => {
        try {
            const userProfile = await getCurrentUser();
            setProfile(userProfile);
            if (userProfile) {
                await AsyncStorage.setItem(CACHE_KEY_PROFILE, JSON.stringify(userProfile));
            }
        } catch (error) {
            console.error('Error loading profile:', error);
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

    const ProfileInfoItemSkeleton = () => (
        <View style={styles.infoItem}>
            <SkeletonBox style={[styles.infoIconContainer, { backgroundColor: undefined }]} />
            <View style={styles.infoContent}>
                <SkeletonBox style={{ width: 80, height: 12, marginBottom: 6 }} />
                <SkeletonBox style={{ width: 140, height: 16 }} />
            </View>
        </View>
    );

    const ProfileSkeleton = () => (
        <>
            {/* Avatar & Basic Info Skeleton */}
            <View style={styles.profileSection}>
                <View style={[styles.avatarContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                    <SkeletonBox style={styles.avatar} />
                </View>
                <SkeletonBox style={{ width: 180, height: 24, marginBottom: 8 }} />
                <SkeletonBox style={{ width: 140, height: 16, marginBottom: 8 }} />
                <SkeletonBox style={{ width: 100, height: 14 }} />
            </View>

            <View style={styles.profileDivider} />

            {/* Stats Row Skeleton */}
            <View style={styles.statsRow}>
                {[1, 2, 3].map((i) => (
                    <React.Fragment key={i}>
                        <View style={styles.statItem}>
                            <SkeletonBox style={{ width: 40, height: 18, marginBottom: 6 }} />
                            <SkeletonBox style={{ width: 50, height: 12 }} />
                        </View>
                        {i < 3 && <View style={styles.statDivider} />}
                    </React.Fragment>
                ))}
            </View>

            {/* Profile Information Skeleton */}
            <View style={styles.infoSection}>
                <SkeletonBox style={{ width: 180, height: 18, marginBottom: 8 }} />
                <SkeletonBox style={{ width: 220, height: 12, marginBottom: 16 }} />
                <View style={[styles.infoCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <React.Fragment key={i}>
                            <ProfileInfoItemSkeleton />
                            {i < 8 && <View style={[styles.infoDivider, { backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200] }]} />}
                        </React.Fragment>
                    ))}
                </View>
            </View>
        </>
    );

    const profileInfo: ProfileInfoItem[] = [
        {
            label: 'Full Name',
            value: profile?.full_name || 'Not set',
            icon: 'person-outline',
            color: 'frozenLake',
        },
        {
            label: 'Email',
            value: profile?.email || 'Not set',
            icon: 'mail-outline',
            color: 'inkBlack',
        },
        {
            label: 'Registration Number',
            value: profile?.reg_number || 'Not set',
            icon: 'id-card-outline',
            color: 'yellowGreen',
        },
        {
            label: 'Level',
            value: profile?.level || 'Not set',
            icon: 'school-outline',
            color: 'frozenLake',
        },
        {
            label: 'Department',
            value: profile?.department || 'Not set',
            icon: 'business-outline',
            color: 'inkBlack',
        },
        {
            label: 'Faculty',
            value: profile?.faculty || 'Not set',
            icon: 'library-outline',
            color: 'yellowGreen',
        },
        {
            label: 'Role',
            value: profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Not set',
            icon: 'person-circle-outline',
            color: 'frozenLake',
        },
        {
            label: 'Face Verification',
            value: profile?.is_face_registered ? 'Verified' : 'Not Verified',
            icon: 'scan-outline',
            color: 'yellowGreen',
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 1. Fixed Black Background for Header Area */}
            <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />

            {/* 2. Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces
            >
                {/* Spacer to push content down below header */}
                <View style={{ height: HEADER_HEIGHT - SHEET_OVERLAP }} />

                {/* White Sheet Container */}
                <View
                    style={[
                        styles.whiteSheet,
                        {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                            minHeight: SCREEN_HEIGHT - (HEADER_HEIGHT - SHEET_OVERLAP),
                        },
                    ]}
                >
                    {isInitialLoad && !profile ? (
                        <ProfileSkeleton />
                    ) : (
                        <>
                    {/* Avatar & Basic Info */}
                    <View style={styles.profileSection}>
                        <View style={[styles.avatarContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                            <View style={[styles.avatar, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100] }]}>
                                <Text style={[styles.avatarText, { color: isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600] }]}>
                                    {profile?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'ST'}
                                </Text>
                            </View>
                            {profile?.is_face_registered && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="checkmark" size={14} color={colors.white} />
                                </View>
                            )}
                        </View>

                        <Text style={[styles.studentName, { color: colors.text.primary }]}>
                            {profile?.full_name || 'Student'}
                        </Text>
                        <Text style={[styles.studentRole, { color: colors.text.tertiary }]}>
                            {profile?.department || 'Student'}
                        </Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="id-card-outline" size={14} color={colors.text.tertiary} />
                            <Text style={[styles.locationText, { color: colors.text.secondary }]}>
                                {profile?.reg_number || 'No Reg Number'}
                            </Text>
                        </View>
                    </View>

                    {/* Divider between header summary and details */}
                    <View style={styles.profileDivider} />

                    {/* Stats Row (simple) */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>
                                {profile?.level || '-'}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Level</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text.primary }]} numberOfLines={1} ellipsizeMode="tail">
                                {profile?.faculty || '-'}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Faculty</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>
                                {profile?.is_face_registered ? 'Yes' : 'No'}
                            </Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Face ID</Text>
                        </View>
                    </View>

                    {/* Profile Information */}
                    <View style={styles.infoSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                            Personal Information
                        </Text>
                        <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
                            Basic details linked to your account
                        </Text>
                        <View
                            style={[
                                styles.infoCard,
                                {
                                    backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                },
                            ]}
                        >
                            {profileInfo.map((item, index) => {
                                const itemColor = item.color ? colorPalette[item.color] : null;
                                const hasColor = itemColor !== null;

                                return (
                                    <View key={item.label}>
                                        <View style={styles.infoItem}>
                                            <View style={[styles.infoIconContainer, {
                                                backgroundColor: hasColor
                                                    ? (isDark ? itemColor[900] : itemColor[100])
                                                    : (isDark ? colorPalette.grey[800] : colorPalette.grey[100]),
                                            }]}>
                                                <Ionicons
                                                    name={item.icon as any}
                                                    size={20}
                                                    color={hasColor
                                                        ? (isDark ? itemColor[300] : itemColor[600])
                                                        : (isDark ? colorPalette.grey[300] : colorPalette.grey[600])
                                                    }
                                                />
                                            </View>
                                            <View style={styles.infoContent}>
                                                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
                                                    {item.label}
                                                </Text>
                                                <Text style={[styles.infoValue, {
                                                    color: item.value === 'Verified'
                                                        ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                                        : item.value === 'Not Verified'
                                                            ? '#EF4444'
                                                            : colors.text.primary,
                                                }]}>
                                                    {item.value}
                                                </Text>
                                            </View>
                                        </View>
                                        {index < profileInfo.length - 1 && (
                                            <View style={[styles.infoDivider, {
                                                backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                                            }]} />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Account Status */}
                    <View style={[styles.infoSection, styles.lastSection]}>
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                            Account Status
                        </Text>
                        <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
                            Security and verification overview
                        </Text>
                        <View
                            style={[
                                styles.statusCard,
                                {
                                    backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                },
                            ]}
                        >
                            <View style={styles.statusItem}>
                                <View style={[styles.statusIconContainer, {
                                    backgroundColor: profile?.is_face_registered
                                        ? (isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100])
                                        : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                }]}>
                                    <Ionicons
                                        name={profile?.is_face_registered ? 'checkmark-circle' : 'close-circle'}
                                        size={24}
                                        color={profile?.is_face_registered
                                            ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                            : colors.text.secondary}
                                    />
                                </View>
                                <View style={styles.statusContent}>
                                    <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>
                                        Face Verification
                                    </Text>
                                    <Text style={[styles.statusValue, {
                                        color: profile?.is_face_registered
                                            ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                            : '#EF4444',
                                    }]}>
                                        {profile?.is_face_registered ? 'Verified' : 'Not Verified'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* 3. Fixed Header Overlay (Back Button + Title) */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>My Profile</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>
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
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    profileSection: {
        alignItems: 'center',
        marginTop: -60,
        marginBottom: layout.spacing.lg,
    },
    profileDivider: {
        height: 1,
        marginHorizontal: layout.spacing.xl,
        marginBottom: layout.spacing.lg,
        backgroundColor: '#E5E7EB',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
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
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    studentName: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    studentRole: {
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
        marginBottom: 8,
        textAlign: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    locationText: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: layout.spacing.xxl,
        marginBottom: layout.spacing.xl,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E5E7EB',
    },
    infoSection: {
        marginBottom: layout.spacing.xl,
        paddingHorizontal: layout.spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: layout.spacing.xs,
    },
    sectionSubtitle: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        marginBottom: layout.spacing.md,
    },
    infoCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: layout.spacing.md,
    },
    infoIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        marginBottom: layout.spacing.xs / 2,
    },
    infoValue: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    infoDivider: {
        height: 1,
        marginLeft: 56,
    },
    statusCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    lastSection: {
        paddingBottom: layout.spacing.xl,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    statusContent: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        marginBottom: layout.spacing.xs / 2,
    },
    statusValue: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
    },
    errorContainer: {
        padding: layout.spacing.xl,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        textAlign: 'center',
    },
});
