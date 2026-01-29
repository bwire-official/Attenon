import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    BackHandler,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { supabase } from '../lib/supabase';
import type { Class } from '../lib/supabase';

interface AttendanceRecord {
    id: string;
    status: 'present' | 'late' | 'absent';
    timestamp: string;
    session_id: string;
}

interface CourseStats {
    total: number;
    present: number;
    late: number;
    absent: number;
    percentage: number;
}

interface StudentCourseAttendanceScreenProps {
    course: Class;
    onBack: () => void;
}

const PURE_GREEN = '#22C55E';

export const StudentCourseAttendanceScreen = ({ course, onBack }: StudentCourseAttendanceScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [stats, setStats] = useState<CourseStats>({ total: 0, present: 0, late: 0, absent: 0, percentage: 0 });
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const CACHE_KEY = `@course_attendance_${course.id}`;

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });
        return () => backHandler.remove();
    }, [onBack]);

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

    const loadCachedData = async () => {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                setAttendance(parsed.attendance || []);
                setStats(parsed.stats || { total: 0, present: 0, late: 0, absent: 0, percentage: 0 });
                setLoading(false);
                setIsInitialLoad(false);
            }
            fetchAttendance();
        } catch (error) {
            console.error('Error loading cached attendance:', error);
            fetchAttendance();
        }
    };

    const fetchAttendance = async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('attendance_logs')
                .select('id, status, timestamp, session_id')
                .eq('student_id', user.id)
                .eq('class_id', course.id)
                .order('timestamp', { ascending: false });

            if (error) {
                console.error('Error fetching course attendance:', error);
                return;
            }

            const records = data || [];
            setAttendance(records);

            const total = records.length;
            const present = records.filter(r => r.status === 'present').length;
            const late = records.filter(r => r.status === 'late').length;
            const absent = records.filter(r => r.status === 'absent').length;
            const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

            const newStats = { total, present, late, absent, percentage };
            setStats(newStats);

            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                attendance: records,
                stats: newStats,
            }));
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsInitialLoad(false);
        }
    };

    useEffect(() => {
        loadCachedData();
    }, [course.id]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAttendance();
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const getStatusColor = (status: string) => {
        if (status === 'present') return PURE_GREEN;
        if (status === 'late') return '#F59E0B';
        return '#EF4444';
    };

    const getStatusBgColor = (status: string) => {
        if (status === 'present') return isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
        if (status === 'late') return isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)';
        return isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)';
    };

    const getStatusIcon = (status: string) => {
        if (status === 'present') return 'checkmark-circle';
        if (status === 'late') return 'time';
        return 'close-circle';
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage >= 75) return PURE_GREEN;
        if (percentage >= 50) return '#F59E0B';
        return '#EF4444';
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

    // Large Percentage Display for header (no SVG)
    const LargePercentageDisplay = ({ percentage }: { percentage: number }) => {
        const color = getPercentageColor(percentage);

        return (
            <View style={[styles.percentageCircle, { borderColor: color }]}>
                <Text style={[styles.progressPercentage, { color: color }]}>{percentage}%</Text>
                <Text style={styles.percentageSubtext}>Attendance</Text>
            </View>
        );
    };

    const StatsSkeleton = () => (
        <View style={styles.headerStats}>
            <View style={styles.headerStatItem}>
                <SkeletonBox style={{ width: 28, height: 24, borderRadius: 6 }} />
                <SkeletonBox style={{ width: 50, height: 12, marginTop: 4 }} />
            </View>
            <View style={styles.headerStatItem}>
                <SkeletonBox style={{ width: 28, height: 24, borderRadius: 6 }} />
                <SkeletonBox style={{ width: 50, height: 12, marginTop: 4 }} />
            </View>
            <View style={styles.headerStatItem}>
                <SkeletonBox style={{ width: 28, height: 24, borderRadius: 6 }} />
                <SkeletonBox style={{ width: 50, height: 12, marginTop: 4 }} />
            </View>
        </View>
    );

    const RecordSkeleton = () => (
        <View style={[styles.recordCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
            <SkeletonBox style={{ width: 44, height: 44, borderRadius: 22 }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonBox style={{ width: 100, height: 14 }} />
                <SkeletonBox style={{ width: 60, height: 12, marginTop: 4 }} />
            </View>
            <SkeletonBox style={{ width: 60, height: 24, borderRadius: 12 }} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.headerSection, { backgroundColor: colors.black, paddingTop: insets.top + layout.spacing.sm }]}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={[styles.courseCode, { color: colorPalette.frozenLake[300] }]}>{course.course_code}</Text>
                        <Text style={[styles.courseTitle, { color: colors.white }]} numberOfLines={1}>{course.title}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Attendance Circle */}
                <View style={styles.headerCenter}>
                    {isInitialLoad && loading ? (
                        <SkeletonBox style={{ width: 120, height: 120, borderRadius: 60 }} />
                    ) : (
                        <LargePercentageDisplay percentage={stats.percentage} />
                    )}
                    <Text style={styles.attendanceLabel}>Attendance Rate</Text>
                </View>

                {/* Quick Stats */}
                {isInitialLoad && loading ? (
                    <StatsSkeleton />
                ) : (
                    <View style={styles.headerStats}>
                        <View style={styles.headerStatItem}>
                            <Text style={[styles.headerStatValue, { color: PURE_GREEN }]}>{stats.present}</Text>
                            <Text style={styles.headerStatLabel}>Present</Text>
                        </View>
                        <View style={[styles.headerStatDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                        <View style={styles.headerStatItem}>
                            <Text style={[styles.headerStatValue, { color: '#F59E0B' }]}>{stats.late}</Text>
                            <Text style={styles.headerStatLabel}>Late</Text>
                        </View>
                        <View style={[styles.headerStatDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                        <View style={styles.headerStatItem}>
                            <Text style={[styles.headerStatValue, { color: '#EF4444' }]}>{stats.absent}</Text>
                            <Text style={styles.headerStatLabel}>Absent</Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Content Section with curved top */}
            <View style={[styles.contentSection, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PURE_GREEN]} />
                    }
                >
                    {/* Attendance History */}
                    <View style={styles.historyHeader}>
                        <Ionicons name="time-outline" size={20} color={colors.text.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Attendance History</Text>
                        <Text style={[styles.totalCount, { color: colors.text.tertiary }]}>({stats.total})</Text>
                    </View>

                    {isInitialLoad && loading ? (
                        <>
                            {[1, 2, 3, 4, 5].map(i => <RecordSkeleton key={i} />)}
                        </>
                    ) : attendance.length === 0 ? (
                        <View style={[styles.emptyState, { backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[50] }]}>
                            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? colorPalette.grey[700] : colorPalette.grey[200] }]}>
                                <Ionicons name="calendar-outline" size={40} color={colors.text.tertiary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Records Yet</Text>
                            <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                                Your attendance records for this course will appear here.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.recordsList}>
                            {attendance.map(record => (
                                <View
                                    key={record.id}
                                    style={[styles.recordCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}
                                >
                                    <View style={[styles.statusIcon, { backgroundColor: getStatusBgColor(record.status) }]}>
                                        <Ionicons
                                            name={getStatusIcon(record.status)}
                                            size={22}
                                            color={getStatusColor(record.status)}
                                        />
                                    </View>
                                    <View style={styles.recordInfo}>
                                        <Text style={[styles.recordDate, { color: colors.text.primary }]}>
                                            {formatDate(record.timestamp)}
                                        </Text>
                                        <View style={styles.timeRow}>
                                            <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                                            <Text style={[styles.recordTime, { color: colors.text.tertiary }]}>
                                                {formatTime(record.timestamp)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(record.status) }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(record.status) }]}>
                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSection: {
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xxl + 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: layout.spacing.lg,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    courseCode: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 2,
    },
    courseTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    headerCenter: {
        alignItems: 'center',
        marginVertical: layout.spacing.lg,
    },
    percentageCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressPercentage: {
        fontSize: 36,
        fontFamily: 'Montserrat_700Bold',
    },
    percentageSubtext: {
        fontSize: 11,
        fontFamily: 'Montserrat_500Medium',
        color: 'rgba(255,255,255,0.6)',
        marginTop: -2,
    },
    attendanceLabel: {
        fontSize: 13,
        fontFamily: 'Montserrat_500Medium',
        color: 'rgba(255,255,255,0.7)',
        marginTop: layout.spacing.sm,
    },
    headerStats: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: layout.spacing.md,
    },
    headerStatItem: {
        alignItems: 'center',
        paddingHorizontal: layout.spacing.lg,
    },
    headerStatValue: {
        fontSize: 22,
        fontFamily: 'Montserrat_700Bold',
    },
    headerStatLabel: {
        fontSize: 11,
        fontFamily: 'Montserrat_500Medium',
        color: 'rgba(255,255,255,0.6)',
        marginTop: 2,
    },
    headerStatDivider: {
        width: 1,
        height: 30,
    },
    contentSection: {
        flex: 1,
        marginTop: -24,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: layout.spacing.xl,
        paddingTop: layout.spacing.xl + 8,
        paddingBottom: 40,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.sm,
        marginBottom: layout.spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
    },
    totalCount: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
    recordsList: {
        gap: layout.spacing.sm,
    },
    recordCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    statusIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordInfo: {
        flex: 1,
        marginLeft: 12,
    },
    recordDate: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    recordTime: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
    },
    emptyState: {
        padding: layout.spacing.xl,
        borderRadius: 20,
        alignItems: 'center',
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: layout.spacing.md,
    },
    emptyTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    emptySubtitle: {
        fontSize: 13,
        fontFamily: 'Montserrat_500Medium',
        marginTop: 4,
        textAlign: 'center',
    },
});
