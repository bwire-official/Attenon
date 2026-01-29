import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getStudentAttendance, getStudentClasses, getStudentStats } from '../services/data';
import type { Profile, AttendanceLog } from '../lib/supabase';
import { usePendingAttendance } from '../hooks/usePendingAttendance';
import { useNotifications } from '../hooks/useNotifications';
import { AttendanceApi } from '../services/attendance-api';

const CACHE_KEY_DASHBOARD = '@student_dashboard_data';

const GRID_GAP = layout.spacing.md;

interface StudentDashboardProps {
    onNavigateToNotifications?: () => void;
    onNavigateToSettings?: () => void;
    onNavigateToFaceSetup?: () => void;
    onNavigateToProfile?: () => void;
    onNavigateToAttendanceHistory?: () => void;
    onNavigateToSchedule?: () => void;
    onNavigateToAllCourses?: () => void;
    onNavigateToSelfAttendance?: (sessionId: string, courseName: string) => void;
    isActive?: boolean;
}

interface AttendanceWithClass extends AttendanceLog {
    classes?: {
        course_code: string;
        title: string;
    } | null;
}

export const StudentDashboard = ({ onNavigateToNotifications, onNavigateToSettings, onNavigateToFaceSetup, onNavigateToProfile, onNavigateToAttendanceHistory, onNavigateToSchedule, onNavigateToAllCourses, onNavigateToSelfAttendance, isActive }: StudentDashboardProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const shimmerAnimation = useRef(new Animated.Value(0)).current;
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [recentAttendance, setRecentAttendance] = useState<AttendanceWithClass[]>([]);
    const [loadingAttendance, setLoadingAttendance] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Summary Stats State
    const [totalCourses, setTotalCourses] = useState(0);
    const [overallAttendance, setOverallAttendance] = useState(0);
    const [todayClasses, setTodayClasses] = useState(0);

    // Pending attendance sessions (Supabase Realtime - no polling)
    const { pendingSessions, formatTimeRemaining, hasPending } = usePendingAttendance(userProfile?.id || null);

    // Real notifications (Supabase Realtime)
    const { unreadCount: notificationCount } = useNotifications(userProfile?.id || null);

    useEffect(() => {
        Animated.loop(
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
        ).start();
    }, []);

    const shimmerOpacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const loadCachedData = async () => {
        try {
            // Try to get user first to use user-specific cache key
            const currentUser = await getCurrentUser();
            const cacheKey = currentUser ? `${CACHE_KEY_DASHBOARD}_${currentUser.id}` : CACHE_KEY_DASHBOARD;
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                setUserProfile(parsed.userProfile);
                setRecentAttendance(parsed.recentAttendance || []);
                setTotalCourses(parsed.totalCourses || 0);
                setOverallAttendance(parsed.overallAttendance || 0);
                setTodayClasses(parsed.todayClasses || 0);
                setLoadingProfile(false);
                setLoadingAttendance(false);
                setIsInitialLoad(false);
            }
            initializeDashboard();
        } catch (error) {
            console.error('Error loading cached dashboard:', error);
            initializeDashboard();
        }
    };

    const initializeDashboard = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) {
                setRefreshing(true);
            } else if (!userProfile && isInitialLoad) {
                setLoadingProfile(true);
                setLoadingAttendance(true);
            }

            const profile = await getCurrentUser();
            setUserProfile(profile);

            if (profile) {
                // First, get the classes to know which expired sessions to process
                const classes = await getStudentClasses(profile.id);
                const classIds = classes.map(c => c.id);

                // Process any expired sessions to ensure THIS student's absent records are created
                // Pass the student's ID so it only marks THEM as absent (RLS prevents marking others)
                if (classIds.length > 0) {
                    await AttendanceApi.processExpiredSessions(classIds, profile.id);
                }

                // Now fetch attendance and stats (will include any newly created absent records)
                const [attendance, stats] = await Promise.all([
                    getStudentAttendance(profile.id),
                    getStudentStats(profile.id)
                ]);

                const recentAtt = (attendance as AttendanceWithClass[]).slice(0, 3);
                const coursesCount = classes.length;
                const attPercentage = Math.round(stats.percentage);

                // Calculate today's classes
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                const forToday = classes.filter(c =>
                    c.schedule && c.schedule.toLowerCase().includes(today.toLowerCase())
                ).length;

                setRecentAttendance(recentAtt);
                setTotalCourses(coursesCount);
                setOverallAttendance(attPercentage);
                setTodayClasses(forToday);

                // Cache the dashboard data with user-specific key (exclude sensitive fields like face_encoding)
                const cacheKey = `${CACHE_KEY_DASHBOARD}_${profile.id}`;
                const safeProfile = {
                    id: profile.id,
                    full_name: profile.full_name,
                    email: profile.email,
                    role: profile.role,
                    avatar_url: profile.avatar_url,
                    is_face_registered: profile.is_face_registered,
                };
                await AsyncStorage.setItem(cacheKey, JSON.stringify({
                    userProfile: safeProfile,
                    recentAttendance: recentAtt,
                    totalCourses: coursesCount,
                    overallAttendance: attPercentage,
                    todayClasses: forToday,
                }));
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        } finally {
            setLoadingProfile(false);
            setLoadingAttendance(false);
            setRefreshing(false);
            setIsInitialLoad(false);
        }
    };

    useEffect(() => {
        loadCachedData();
    }, []);

    const onRefresh = () => {
        initializeDashboard(true);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        };
        return date.toLocaleDateString('en-US', options);
    };

    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        };
        return date.toLocaleTimeString('en-US', options);
    };

    const menuItems: Array<{
        id: string;
        icon: string;
        label: string;
        onPress: () => void;
        color?: 'frozenLake' | 'inkBlack' | 'yellowGreen' | null;
    }> = [
            { id: '1', icon: 'calendar-outline', label: 'My Schedule', onPress: () => { onNavigateToSchedule?.(); }, color: 'frozenLake' },
            { id: '2', icon: 'bar-chart-outline', label: 'Attendance & Stats', onPress: () => { onNavigateToAttendanceHistory?.(); }, color: 'inkBlack' },
            { id: '4', icon: 'library-outline', label: 'My Courses', onPress: () => { onNavigateToAllCourses?.(); }, color: 'frozenLake' },
            { id: '6', icon: 'person-outline', label: 'Profile', onPress: () => { onNavigateToProfile?.(); }, color: 'frozenLake' },
            { id: '7', icon: 'settings-outline', label: 'Settings', onPress: () => { onNavigateToSettings?.(); }, color: 'inkBlack' },
            { id: '8', icon: 'help-circle-outline', label: 'Help & Support', onPress: () => { }, color: 'frozenLake' },
        ];


    // Calculate button size based on current screen width
    const SCREEN_PADDING = layout.spacing.xl;
    const BUTTON_SIZE = (SCREEN_WIDTH - (SCREEN_PADDING * 2) - (GRID_GAP * 2)) / 3;

    const iconSize = 28;

    const renderMenuItem = (item: typeof menuItems[0]) => {
        const getColorPalette = (colorName: string | null | undefined) => {
            if (!colorName) return null;
            return colorPalette[colorName as keyof typeof colorPalette];
        };

        const itemColor = getColorPalette(item.color ?? null);
        const hasColor = itemColor !== null;

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.menuButton,
                    {
                        backgroundColor: hasColor
                            ? (isDark ? itemColor[900] : itemColor[100])
                            : (isDark ? colorPalette.grey[100] : colors.text.primary),
                        width: BUTTON_SIZE,
                        height: BUTTON_SIZE,
                        minHeight: 100,
                    }
                ]}
                onPress={item.onPress}
                activeOpacity={0.8}
            >
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={item.icon as any}
                        size={iconSize}
                        color={hasColor
                            ? (isDark ? itemColor[300] : itemColor[600])
                            : (isDark ? colors.black : colors.white)
                        }
                    />
                </View>
                <Text
                    style={[
                        styles.menuButtonText,
                        {
                            color: hasColor
                                ? (isDark ? itemColor[100] : itemColor[900])
                                : (isDark ? colors.black : colors.white),
                        }
                    ]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                >
                    {item.label}
                </Text>
            </TouchableOpacity>
        );
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getFirstName = (fullName: string | null | undefined): string => {
        if (!fullName) return 'Student';
        const nameParts = fullName.trim().split(' ');
        const name = nameParts[0] || 'Student';
        // Proper Case
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    };

    const displayName = getFirstName(userProfile?.full_name);

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

    const ActivityItemSkeleton = () => (
        <View style={[styles.historyItem, {
            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
        }]}>
            <View style={styles.historyLeft}>
                <SkeletonBox style={styles.historyIconContainer} />
                <View style={styles.historyInfo}>
                    <SkeletonBox style={{ width: 100, height: 14, marginBottom: 6 }} />
                    <SkeletonBox style={{ width: 150, height: 12 }} />
                </View>
            </View>
            <SkeletonBox style={{ width: 60, height: 28, borderRadius: 14 }} />
        </View>
    );

    const RecentActivitySkeleton = () => (
        <View style={styles.historyList}>
            {[1, 2, 3].map((i) => (
                <ActivityItemSkeleton key={i} />
            ))}
        </View>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.black }]}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary]} // Android
                    tintColor={colors.white} // iOS (white looks better on black header)
                />
            }
        >
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
                        <View style={styles.greetingRow}>
                            <Text style={[styles.greeting, { color: colors.white }]}>
                                {getGreeting()}
                            </Text>
                        </View>
                        {loadingProfile && isInitialLoad ? (
                            <Animated.View style={{
                                width: 180,
                                height: 32,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 8,
                                marginTop: 4,
                                opacity: shimmerOpacity,
                            }} />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={[styles.name, { color: colors.white }]} numberOfLines={1}>
                                    {displayName}
                                </Text>
                                {userProfile?.is_face_registered && (
                                    <Ionicons
                                        name="checkmark-circle"
                                        size={20}
                                        color="#22c55e"
                                    />
                                )}
                            </View>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.notificationButton}
                        onPress={() => onNavigateToNotifications?.()}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="notifications-outline"
                            size={24}
                            color={colors.white}
                        />
                        {notificationCount > 0 && (
                            <View style={[styles.notificationBadge, { backgroundColor: '#EF4444', borderColor: isDark ? colorPalette.grey[900] : colors.primary }]}>
                                <Text style={[styles.badgeText, { color: colors.white }]}>{notificationCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Quick Stats or Face Verification Button */}
                {loadingProfile && isInitialLoad ? (
                    <View style={styles.headerStats}>
                        {[1, 2, 3].map((i) => (
                            <View key={i} style={styles.headerStatItem}>
                                <Animated.View style={[styles.headerStatIcon, {
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    opacity: shimmerOpacity,
                                }]} />
                                <Animated.View style={{
                                    width: 40,
                                    height: 28,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: 6,
                                    marginBottom: layout.spacing.xs,
                                    opacity: shimmerOpacity,
                                }} />
                                <Animated.View style={{
                                    width: 55,
                                    height: 12,
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: 4,
                                    opacity: shimmerOpacity,
                                }} />
                            </View>
                        ))}
                    </View>
                ) : userProfile?.is_face_registered ? (
                    <View style={styles.headerStats}>
                        <View style={styles.headerStatItem}>
                            <View style={[styles.headerStatIcon, {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            }]}>
                                <Ionicons
                                    name="library-outline"
                                    size={28}
                                    color={colors.white}
                                />
                            </View>
                            <Text style={[styles.headerStatValue, { color: colors.white }]}>
                                {totalCourses}
                            </Text>
                            <Text style={[styles.headerStatLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                                Courses
                            </Text>
                        </View>

                        <View style={styles.headerStatItem}>
                            <View style={[styles.headerStatIcon, {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            }]}>
                                <Ionicons
                                    name="checkmark-circle-outline"
                                    size={28}
                                    color={colors.white}
                                />
                            </View>
                            <Text style={[styles.headerStatValue, { color: colors.white }]}>
                                {overallAttendance}%
                            </Text>
                            <Text style={[styles.headerStatLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                                Attendance
                            </Text>
                        </View>

                        <View style={styles.headerStatItem}>
                            <View style={[styles.headerStatIcon, {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            }]}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={28}
                                    color={colors.white}
                                />
                            </View>
                            <Text style={[styles.headerStatValue, { color: colors.white }]}>
                                {todayClasses}
                            </Text>
                            <Text style={[styles.headerStatLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                                Today
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.faceVerifyContainer}>
                        <TouchableOpacity
                            style={[styles.faceVerifyButton, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}
                            onPress={() => onNavigateToFaceSetup?.()}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name="scan-outline"
                                size={20}
                                color={colors.white}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.faceVerifyButtonText, { color: colors.white }]}>
                                VERIFY FACE
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.privacyGuarantee}>
                            <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.privacyText}>Biometrics are encrypted and stored securely.</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Pending Attendance Banner (Realtime subscription) */}
            {hasPending && pendingSessions.length > 0 && (
                <View style={styles.pendingBannerContainer}>
                    {pendingSessions.map((session) => (
                        <TouchableOpacity
                            key={session.id}
                            style={[styles.pendingBanner, { backgroundColor: colorPalette.frozenLake[500] }]}
                            onPress={() => onNavigateToSelfAttendance?.(session.id, session.course_title)}
                            activeOpacity={0.9}
                        >
                            <View style={styles.pendingBannerContent}>
                                <View style={styles.pendingBannerInfo}>
                                    <Ionicons name="scan" size={24} color="#fff" />
                                    <View style={styles.pendingBannerText}>
                                        <Text style={styles.pendingBannerTitle}>Mark Attendance Now</Text>
                                        <Text style={styles.pendingBannerCourse}>
                                            {session.course_code} - {session.course_title}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.pendingBannerTimer}>
                                    <Text style={styles.pendingTimerText}>{formatTimeRemaining(session.id)}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Content Section */}
            <View style={[
                styles.contentSection,
                {
                    backgroundColor: colors.white,
                    paddingBottom: Math.max(insets.bottom, layout.spacing.xl),
                    paddingHorizontal: layout.spacing.xl,
                    paddingTop: layout.spacing.xxl * 2,
                    minHeight: layout.window.height * 0.6 // Ensure white background covers bottom
                }
            ]}>
                {/* Quick Actions */}
                <Text style={[styles.sectionTitle, {
                    color: colors.text.primary,
                    marginTop: userProfile && !userProfile.is_face_registered ? layout.spacing.lg : 0,
                    marginBottom: layout.spacing.md,
                }]}>Quick Actions</Text>

                <View style={styles.gridContainer}>
                    {menuItems.map((item) => renderMenuItem(item))}
                </View>

                {/* Recent Activity */}
                <Text style={[styles.sectionTitle, {
                    color: colors.text.primary,
                    marginTop: layout.spacing.xl,
                    marginBottom: layout.spacing.md,
                }]}>Recent Activity</Text>

                <View style={styles.historyList}>
                    {loadingAttendance && isInitialLoad ? (
                        <>
                            {[1, 2, 3].map((i) => (
                                <Animated.View key={i} style={[styles.historyItem, {
                                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                }]}>
                                    <Animated.View style={[styles.historyIconContainer, {
                                        backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                                        opacity: shimmerOpacity,
                                    }]} />
                                    <View style={[styles.historyInfo, { flex: 1 }]}>
                                        <Animated.View style={{
                                            width: 100,
                                            height: 14,
                                            backgroundColor: isDark ? colorPalette.grey[700] : colorPalette.grey[200],
                                            borderRadius: 6,
                                            marginBottom: 6,
                                            opacity: shimmerOpacity,
                                        }} />
                                        <Animated.View style={{
                                            width: 150,
                                            height: 12,
                                            backgroundColor: isDark ? colorPalette.grey[700] : colorPalette.grey[200],
                                            borderRadius: 6,
                                            opacity: shimmerOpacity,
                                        }} />
                                    </View>
                                    <Animated.View style={{
                                        width: 60,
                                        height: 28,
                                        backgroundColor: isDark ? colorPalette.grey[700] : colorPalette.grey[200],
                                        borderRadius: 14,
                                        opacity: shimmerOpacity,
                                    }} />
                                </Animated.View>
                            ))}
                        </>
                    ) : recentAttendance.length === 0 ? (
                        <View style={[styles.historyItem, {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingVertical: layout.spacing.xl,
                        }]}>
                            <Text style={{ color: colors.text.secondary }}>No recent activity</Text>
                        </View>
                    ) : (
                        recentAttendance.map(item => {
                            const status = item.status.charAt(0).toUpperCase() + item.status.slice(1);
                            const isPresent = item.status === 'present';
                            const isLate = item.status === 'late';

                            return (
                                <View key={item.id} style={[styles.historyItem, {
                                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                }]}>
                                    <View style={styles.historyLeft}>
                                        <View style={[styles.historyIconContainer, {
                                            backgroundColor: isPresent || isLate
                                                ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
                                                : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                        }]}>
                                            <Ionicons
                                                name={isPresent ? 'checkmark-circle' : isLate ? 'time' : 'close-circle'}
                                                size={20}
                                                color={isPresent || isLate
                                                    ? '#22C55E'
                                                    : colors.text.secondary}
                                            />
                                        </View>
                                        <View style={styles.historyInfo}>
                                            <Text style={[styles.historyCourse, {
                                                color: colors.text.primary,
                                            }]}>{item.classes?.course_code || 'Unknown Course'}</Text>
                                            <Text style={[styles.historyDate, {
                                                color: colors.text.secondary,
                                            }]}>{formatDate(item.timestamp)} • {formatTime(item.timestamp)}</Text>
                                        </View>
                                    </View>
                                    <View style={[
                                        styles.statusBadge,
                                        {
                                            backgroundColor: isPresent || isLate
                                                ? (isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)')
                                                : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                        }
                                    ]}>
                                        <Text style={[
                                            styles.statusText,
                                            {
                                                color: isPresent || isLate
                                                    ? '#22C55E'
                                                    : colors.text.secondary,
                                            }
                                        ]}>
                                            {status}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </View>
        </ScrollView>
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
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        flexShrink: 1,
    },
    headerStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: layout.spacing.xl,
        paddingBottom: layout.spacing.lg,
    },
    headerStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    headerStatIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    headerStatValue: {
        fontSize: 28,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xs,
    },
    headerStatLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    faceVerifyButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        marginTop: layout.spacing.xl,
        marginBottom: layout.spacing.md,
        paddingHorizontal: layout.spacing.xl,
        gap: layout.spacing.sm,
    },
    faceVerifyIcon: {
        marginRight: layout.spacing.xs,
    },
    faceVerifyButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
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
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuButton: {
        borderRadius: layout.borderRadius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: GRID_GAP,
        paddingHorizontal: layout.spacing.xs,
        paddingVertical: layout.spacing.md,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.sm,
        height: 36,
    },
    menuButtonText: {
        fontSize: 11,
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },
    historyList: {
        paddingBottom: layout.spacing.xl,
    },
    historyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        marginBottom: layout.spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    historyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    historyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    historyInfo: {
        flex: 1,
    },
    historyCourse: {
        fontFamily: 'Montserrat_500Medium',
    },
    historyDate: {
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: layout.borderRadius.round,
    },
    statusPresent: {
        // Background set inline
    },
    statusAbsent: {
        // Background set inline
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
    },
    faceVerifyContainer: {
        marginTop: layout.spacing.xl,
        marginBottom: layout.spacing.md,
    },
    faceVerifyCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        padding: layout.spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    faceVerifyCardLeft: {
        marginRight: layout.spacing.md,
    },
    faceVerifyIconBg: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#22C55E',
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceVerifyCardRight: {
        flex: 1,
    },
    faceVerifyStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    faceVerifyUrgencyText: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
        color: '#FCA5A5',
        letterSpacing: 1,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FCA5A5',
        marginLeft: 6,
    },
    faceVerifyTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        color: '#FFFFFF',
        marginBottom: 2,
    },
    faceVerifyDesc: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
        color: 'rgba(255, 255, 255, 0.6)',
        lineHeight: 16,
    },
    privacyGuarantee: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: layout.spacing.sm,
        gap: 6,
    },
    privacyText: {
        fontSize: 10,
        fontFamily: 'Montserrat_400Regular',
        color: 'rgba(255, 255, 255, 0.4)',
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.sm,
    },
    securityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    securityBadgeText: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    headerStatsPlaceholder: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: layout.spacing.xl,
        gap: layout.spacing.sm,
    },
    placeholderLine: {
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
    },
    pendingBannerContainer: {
        marginHorizontal: layout.spacing.xl,
        marginTop: -layout.spacing.lg,
        marginBottom: layout.spacing.md,
        gap: layout.spacing.sm,
    },
    pendingBanner: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    pendingBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: layout.spacing.md,
    },
    pendingBannerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: layout.spacing.sm,
    },
    pendingBannerText: {
        flex: 1,
    },
    pendingBannerTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 14,
        color: '#fff',
    },
    pendingBannerCourse: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
    },
    pendingBannerTimer: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    pendingTimerText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 18,
        color: '#fff',
    },
});
