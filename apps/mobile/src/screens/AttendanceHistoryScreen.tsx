import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getStudentAttendance, getStudentStats } from '../services/data';
import type { AttendanceLog } from '../lib/supabase';

const CACHE_KEY_ATTENDANCE = '@student_attendance_history';

interface AttendanceHistoryScreenProps {
    onBack?: () => void;
}
                                                                                                                                                                                                          
interface AttendanceWithClass extends AttendanceLog {
    classes: {
        course_code: string;
        title: string;
    } | null;
}

export const AttendanceHistoryScreen = ({ onBack }: AttendanceHistoryScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const shimmerAnimation = useRef(new Animated.Value(0)).current;
    const [attendanceLogs, setAttendanceLogs] = useState<AttendanceWithClass[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        percentage: 0,
    });
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [studentId, setStudentId] = useState<string | null>(null);

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
            const cachedData = await AsyncStorage.getItem(CACHE_KEY_ATTENDANCE);
            if (cachedData) {
                setAttendanceLogs(JSON.parse(cachedData));
                setLoading(false);
                setIsInitialLoad(false);
            }
            loadAttendanceData();
        } catch (error) {
            console.error('Error loading cached attendance:', error);
            loadAttendanceData();
        }
    };

    const loadAttendanceData = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (isInitialLoad) {
                setLoading(true);
            }

            const user = await getCurrentUser();
            if (!user) {
                setLoading(false);
                setRefreshing(false);
                setIsInitialLoad(false);
                return;
            }

            const logs = await getStudentAttendance(user.id);
            setAttendanceLogs(logs as AttendanceWithClass[]);
            await AsyncStorage.setItem(CACHE_KEY_ATTENDANCE, JSON.stringify(logs));
        } catch (error) {
            console.error('Error loading attendance data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsInitialLoad(false);
        }
    };

    const onRefresh = () => {
        loadAttendanceData(true);
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

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'present':
                return isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600];
            case 'late':
                return '#F59E0B';
            case 'absent':
                return '#EF4444';
            default:
                return colors.text.secondary;
        }
    };

    const getStatusIcon = (status: string): string => {
        switch (status) {
            case 'present':
                return 'checkmark-circle';
            case 'late':
                return 'time';
            case 'absent':
                return 'close-circle';
            default:
                return 'help-circle';
        }
    };

    const getStatusBackgroundColor = (status: string): string => {
        switch (status) {
            case 'present':
                return isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100];
            case 'late':
                return isDark ? '#92400E' : '#FEF3C7';
            case 'absent':
                return isDark ? '#7F1D1D' : '#FEE2E2';
            default:
                return isDark ? colorPalette.grey[800] : colorPalette.grey[200];
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

    const AttendanceItemSkeleton = () => (
        <View style={[styles.historyItem, {
            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
        }]}>
            <SkeletonBox style={styles.statusIndicator} />
            <View style={styles.historyContent}>
                <View style={styles.historyHeader}>
                    <SkeletonBox style={{ width: 100, height: 16, flex: 0 }} />
                    <SkeletonBox style={{ width: 60, height: 20, borderRadius: 4 }} />
                </View>
                <SkeletonBox style={{ width: '70%', height: 14, marginBottom: 8 }} />
                <View style={styles.historyFooter}>
                    <SkeletonBox style={{ width: 80, height: 12 }} />
                    <SkeletonBox style={{ width: 60, height: 12 }} />
                </View>
            </View>
        </View>
    );

    const AttendanceSkeleton = () => (
        <View style={styles.historyList}>
            {[1, 2, 3, 4, 5].map((i) => (
                <AttendanceItemSkeleton key={i} />
            ))}
        </View>
    );

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
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Attendance History</Text>
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
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    {/* Attendance History */}
                    <View style={styles.historySection}>
                        <View style={styles.sectionTitleContainer}>
                            <Ionicons
                                name="time-outline"
                                size={20}
                                color={colors.text.primary}
                            />
                            <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                                Recent Attendance
                            </Text>
                        </View>
                        {isInitialLoad && loading ? (
                            <AttendanceSkeleton />
                        ) : attendanceLogs.length === 0 ? (
                            <View style={[styles.emptyState, {
                                backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                            }]}>
                                <View style={styles.emptyStateContent}>
                                    <Ionicons
                                        name="calendar-outline"
                                        size={120}
                                        color={colors.text.secondary}
                                    />
                                    <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>
                                        No attendance records found
                                    </Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.historyList}>
                                {attendanceLogs.map((log) => (
                                    <View
                                        key={log.id}
                                        style={[styles.historyItem, {
                                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                        }]}
                                    >
                                        <View style={[styles.statusIndicator, {
                                            backgroundColor: getStatusBackgroundColor(log.status),
                                        }]}>
                                            <Ionicons
                                                name={getStatusIcon(log.status) as any}
                                                size={20}
                                                color={getStatusColor(log.status)}
                                            />
                                        </View>
                                        <View style={styles.historyContent}>
                                            <View style={styles.historyHeader}>
                                                <Text style={[styles.courseCode, { color: colors.text.primary }]}>
                                                    {log.classes?.course_code || 'Unknown Course'}
                                                </Text>
                                                <View style={[styles.statusBadge, {
                                                    backgroundColor: getStatusBackgroundColor(log.status),
                                                }]}>
                                                    <Text style={[styles.statusBadgeText, {
                                                        color: getStatusColor(log.status),
                                                    }]}>
                                                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                                                    </Text>
                                                </View>
                                            </View>
                                            {log.classes?.title && (
                                                <Text style={[styles.courseTitle, { color: colors.text.secondary }]} numberOfLines={1}>
                                                    {log.classes.title}
                                                </Text>
                                            )}
                                            <View style={styles.historyFooter}>
                                                <View style={styles.dateTimeContainer}>
                                                    <Ionicons
                                                        name="calendar-outline"
                                                        size={14}
                                                        color={colors.text.tertiary}
                                                    />
                                                    <Text style={[styles.dateTime, { color: colors.text.tertiary }]}>
                                                        {formatDate(log.timestamp)}
                                                    </Text>
                                                </View>
                                                <View style={styles.dateTimeContainer}>
                                                    <Ionicons
                                                        name="time-outline"
                                                        size={14}
                                                        color={colors.text.tertiary}
                                                    />
                                                    <Text style={[styles.dateTime, { color: colors.text.tertiary }]}>
                                                        {formatTime(log.timestamp)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </ScrollView>
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
    historySection: {
        marginBottom: layout.spacing.xl,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.sm,
        marginBottom: layout.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
    },
    historyList: {
        gap: layout.spacing.md,
    },
    historyItem: {
        flexDirection: 'row',
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    statusIndicator: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    historyContent: {
        flex: 1,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: layout.spacing.xs,
    },
    courseCode: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: layout.spacing.sm,
        paddingVertical: layout.spacing.xs / 2,
        borderRadius: layout.borderRadius.sm,
    },
    statusBadgeText: {
        fontSize: 11,
        fontFamily: 'Montserrat_600SemiBold',
        textTransform: 'uppercase',
    },
    courseTitle: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        marginBottom: layout.spacing.sm,
    },
    historyFooter: {
        flexDirection: 'row',
        gap: layout.spacing.md,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.xs / 2,
    },
    dateTime: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
    },
    emptyState: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
    },
    emptyStateContent: {
        alignItems: 'center',
        gap: layout.spacing.lg,
    },
    emptyStateText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
});
