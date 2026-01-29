import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getInstructorAttendanceHistory, AttendanceHistorySession } from '../services/instructor-data';

interface InstructorAttendanceHistoryScreenProps {
    onBack: () => void;
    onViewSummary: (sessionId: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 280;
const SHEET_OVERLAP = 20;
const CACHE_KEY = 'instructor_attendance_history';

export const InstructorAttendanceHistoryScreen = ({
    onBack,
    onViewSummary,
}: InstructorAttendanceHistoryScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [sessions, setSessions] = useState<AttendanceHistorySession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const shimmerAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnimation, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnimation, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [shimmerAnimation]);

    useEffect(() => {
        loadCachedData();
    }, []);

    const loadCachedData = async () => {
        try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
                setSessions(JSON.parse(cached));
                setIsInitialLoad(false);
            }
        } catch (err) {
            console.error('Error loading cached history:', err);
        }
        loadHistory();
    };

    const loadHistory = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else if (isInitialLoad) setLoading(true);

            const user = await getCurrentUser();
            if (user) {
                const data = await getInstructorAttendanceHistory(user.id);
                setSessions(data);
                await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
            }
        } catch (error) {
            console.error('Error loading attendance history:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsInitialLoad(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRelativeDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
            });
        }
    };

    const shimmerOpacity = shimmerAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const SkeletonBox = ({ width, height, style }: { width: number | string; height: number; style?: any }) => (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    backgroundColor: isDark ? colorPalette.grey[700] : colorPalette.grey[200],
                    borderRadius: 8,
                    opacity: shimmerOpacity,
                },
                style,
            ]}
        />
    );

    const SessionSkeleton = () => (
        <View style={[styles.sessionCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
            <View style={styles.cardLeft}>
                <SkeletonBox width={48} height={48} style={{ borderRadius: 24 }} />
            </View>
            <View style={styles.cardCenter}>
                <SkeletonBox width={70} height={12} style={{ marginBottom: 8 }} />
                <SkeletonBox width={150} height={16} style={{ marginBottom: 8 }} />
                <SkeletonBox width={120} height={12} />
            </View>
            <View style={styles.cardRight}>
                <SkeletonBox width={52} height={52} style={{ borderRadius: 26 }} />
            </View>
        </View>
    );

    const renderSessionCard = (session: AttendanceHistorySession) => {
        const rateColor = session.attendance_rate >= 75
            ? colorPalette.yellowGreen[500]
            : session.attendance_rate >= 50
                ? '#F59E0B'
                : '#EF4444';

        return (
            <TouchableOpacity
                key={session.id}
                style={[
                    styles.sessionCard,
                    { backgroundColor: isDark ? colorPalette.grey[800] : colors.white },
                ]}
                onPress={() => onViewSummary(session.id)}
                activeOpacity={0.7}
            >
                {/* Left: Course Icon Circle */}
                <View style={styles.cardLeft}>
                    <View style={[
                        styles.courseIcon,
                        {
                            backgroundColor: session.is_active
                                ? colorPalette.frozenLake[500]
                                : (isDark ? colorPalette.grey[700] : colorPalette.frozenLake[50]),
                        }
                    ]}>
                        <Text style={[
                            styles.courseIconText,
                            { color: session.is_active ? '#fff' : colorPalette.frozenLake[500] }
                        ]}>
                            {session.course_code.slice(0, 2).toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Center: Course Info */}
                <View style={styles.cardCenter}>
                    <Text style={[styles.courseCode, { color: colors.text.secondary }]}>
                        {session.course_code}
                    </Text>
                    <Text style={[styles.courseTitle, { color: colors.text.primary }]} numberOfLines={1}>
                        {session.course_title}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                            {formatTime(session.started_at)}
                        </Text>
                        <View style={styles.metaDot} />
                        <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                            {session.duration_minutes} min
                        </Text>
                        <View style={styles.metaDot} />
                        <Text style={[styles.metaText, { color: colors.text.tertiary }]}>
                            {session.present_count}/{session.total_enrolled}
                        </Text>
                    </View>
                </View>

                {/* Right: Attendance Rate Circle */}
                <View style={styles.cardRight}>
                    <View style={[styles.rateCircle, { borderColor: rateColor }]}>
                        <Text style={[styles.rateValue, { color: rateColor }]}>
                            {session.attendance_rate}
                        </Text>
                        <Text style={[styles.ratePercent, { color: rateColor }]}>%</Text>
                    </View>
                </View>

                {/* Chevron */}
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.text.tertiary}
                    style={styles.chevron}
                />
            </TouchableOpacity>
        );
    };

    // Group sessions by date
    const groupedSessions = sessions.reduce((groups: { [key: string]: AttendanceHistorySession[] }, session) => {
        const dateKey = new Date(session.started_at).toDateString();
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(session);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedSessions).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );

    const avgAttendance = sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + s.attendance_rate, 0) / sessions.length)
        : 0;

    return (
        <View style={[styles.container, { backgroundColor: isDark ? colorPalette.grey[900] : colorPalette.grey[50] }]}>
            {/* Fixed Header Background */}
            <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadHistory(true)}
                        colors={[colorPalette.frozenLake[500]]}
                        tintColor={colors.white}
                    />
                }
            >
                {/* Spacer */}
                <View style={{ height: HEADER_HEIGHT - SHEET_OVERLAP }} />

                {/* Content Sheet */}
                <View style={[styles.contentSheet, {
                    backgroundColor: isDark ? colorPalette.grey[900] : colorPalette.grey[50],
                    minHeight: SCREEN_HEIGHT - (HEADER_HEIGHT - SHEET_OVERLAP),
                }]}>

                    {/* Sessions List */}
                    {isInitialLoad && loading ? (
                        <View style={styles.sessionsContainer}>
                            <View style={styles.dateSection}>
                                <SkeletonBox width={80} height={14} style={{ marginBottom: 16 }} />
                                <SessionSkeleton />
                                <SessionSkeleton />
                            </View>
                            <View style={styles.dateSection}>
                                <SkeletonBox width={100} height={14} style={{ marginBottom: 16 }} />
                                <SessionSkeleton />
                            </View>
                        </View>
                    ) : sessions.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                                <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                                No Sessions Yet
                            </Text>
                            <Text style={[styles.emptyDescription, { color: colors.text.secondary }]}>
                                Start taking attendance to see your history here
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.sessionsContainer}>
                            {sortedDates.map((dateKey) => (
                                <View key={dateKey} style={styles.dateSection}>
                                    <Text style={[styles.dateHeader, { color: colors.text.secondary }]}>
                                        {getRelativeDate(dateKey)}
                                    </Text>
                                    {groupedSessions[dateKey].map(renderSessionCard)}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Fixed Header Overlay */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleSection}>
                        <Text style={[styles.headerTitle, { color: colors.white }]}>History</Text>
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.7)' }]}>
                            Attendance Sessions
                        </Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Stats in Header */}
                <View style={styles.headerStats}>
                    <View style={styles.headerStatItem}>
                        <View style={styles.headerStatIcon}>
                            <Ionicons name="calendar-outline" size={26} color={colors.white} />
                        </View>
                        <Text style={styles.headerStatValue}>{sessions.length}</Text>
                        <Text style={styles.headerStatLabel}>Sessions</Text>
                    </View>

                    <View style={styles.headerStatItem}>
                        <View style={styles.headerStatIcon}>
                            <Ionicons name="trending-up-outline" size={26} color={colors.white} />
                        </View>
                        <Text style={styles.headerStatValue}>{avgAttendance}%</Text>
                        <Text style={styles.headerStatLabel}>Avg Rate</Text>
                    </View>

                    <View style={styles.headerStatItem}>
                        <View style={styles.headerStatIcon}>
                            <Ionicons name="people-outline" size={26} color={colors.white} />
                        </View>
                        <Text style={styles.headerStatValue}>
                            {sessions.reduce((sum, s) => sum + s.present_count, 0)}
                        </Text>
                        <Text style={styles.headerStatLabel}>Present</Text>
                    </View>
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
        height: 50,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitleSection: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        marginTop: 2,
    },
    headerStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: layout.spacing.lg,
        paddingBottom: layout.spacing.md,
    },
    headerStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    headerStatIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.sm,
    },
    headerStatValue: {
        fontSize: 22,
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        marginBottom: 2,
    },
    headerStatLabel: {
        fontSize: 11,
        fontFamily: 'Montserrat_500Medium',
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
        zIndex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    contentSheet: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingTop: layout.spacing.xxl,
        paddingHorizontal: layout.spacing.lg,
        paddingBottom: layout.spacing.xxl,
    },
    sessionsContainer: {
        gap: 4,
    },
    dateSection: {
        marginBottom: layout.spacing.xl,
    },
    dateHeader: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 16,
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sessionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderRadius: 28,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    cardLeft: {
        marginRight: 14,
    },
    courseIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseIconText: {
        fontSize: 13,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.5,
    },
    cardCenter: {
        flex: 1,
        marginRight: 12,
    },
    courseCode: {
        fontSize: 11,
        fontFamily: 'Montserrat_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    courseTitle: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 8,
    },
    cardRight: {
        marginRight: 8,
    },
    rateCircle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    rateValue: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    ratePercent: {
        fontSize: 10,
        fontFamily: 'Montserrat_600SemiBold',
        marginTop: 2,
    },
    chevron: {
        marginLeft: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: layout.spacing.xxl * 2,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
        paddingHorizontal: layout.spacing.xxl,
        lineHeight: 22,
    },
});
