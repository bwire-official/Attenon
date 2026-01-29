import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getInstructorClasses } from '../services/data';
import type { Class } from '../lib/supabase';

interface InstructorScheduleScreenProps {
    onBack: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const InstructorScheduleScreen = ({ onBack }: InstructorScheduleScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [courses, setCourses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'today' | 'week'>('today');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });
        return () => backHandler.remove();
    }, [onBack]);

    const fetchCourses = async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                const data = await getInstructorClasses(user.id);
                setCourses(data);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCourses();
        // Update timer every minute for countdown
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCourses();
    };

    // --- Schedule Logic ---
    const parseTime = (timeStr: string) => {
        // Expected "10:00 AM" or "2:00 PM"
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') hours = '00';
        if (modifier === 'PM') hours = String(parseInt(hours, 10) + 12);
        return { hours: parseInt(hours, 10), minutes: parseInt(minutes, 10) };
    };

    const getNextClass = () => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        // Filter courses for today
        const todaysCourses = courses.filter(c => c.schedule && c.schedule.includes(today));

        // Find first one that hasn't started (or maybe started recently?)
        // Assuming formatting "Monday 10:00 AM - 12:00 PM"
        let upcoming = null;
        let minDiff = Infinity;

        todaysCourses.forEach(c => {
            if (!c.schedule) return;
            // Extract Time part: "Monday 10:00 AM -..." -> "10:00 AM"
            const timePart = c.schedule.replace(today, '').replace('s', '').trim().split('-')[0].trim();
            if (!timePart) return;

            try {
                const { hours, minutes } = parseTime(timePart);
                const classMinutes = hours * 60 + minutes;
                const diff = classMinutes - currentMinutes;

                if (diff > 0 && diff < minDiff) {
                    minDiff = diff;
                    upcoming = { course: c, diffMinutes: diff, startTime: timePart };
                }
            } catch (e) { }
        });

        return upcoming;
    };

    const nextClassInfo = useMemo(() => getNextClass(), [courses, currentTime]);

    const groupedSchedule = useMemo(() => {
        const groups: Record<string, Class[]> = {};
        courses.forEach(course => {
            if (!course.schedule) return;
            const day = DAYS_ORDER.find(d => course.schedule?.includes(d + 's') || course.schedule?.includes(d));
            if (day) {
                if (!groups[day]) groups[day] = [];
                groups[day].push(course);
            }
        });

        // Sort days
        const sortedGroups: Record<string, Class[]> = {};
        DAYS_ORDER.forEach(day => {
            if (groups[day]) sortedGroups[day] = groups[day];
        });
        return sortedGroups;
    }, [courses]);

    const todaysClasses = useMemo(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return groupedSchedule[today] || [];
    }, [groupedSchedule]);

    const stats = useMemo(() => {
        return {
            todayCount: todaysClasses.length,
            totalWeekly: courses.filter(c => c.schedule).length,
            active: courses.length
        };
    }, [todaysClasses, courses]);

    const formatCountdown = (minutes: number) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 1. Fixed Header Background */}
            <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />

            {/* 2. Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[2]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.white}
                        progressViewOffset={HEADER_HEIGHT}
                    />
                }
            >
                {/* Spacer */}
                <View style={{ height: HEADER_HEIGHT - SHEET_OVERLAP }} />

                {/* White Sheet */}
                <View style={[styles.whiteSheet, {
                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    minHeight: SCREEN_HEIGHT - (HEADER_HEIGHT - SHEET_OVERLAP)
                }]}>

                    {/* Overlapping Overview Section */}
                    <View style={styles.overviewHeader}>
                        {/* Circle Metric: Countdown or Icon */}
                        <View style={[styles.circleContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                            <View style={[styles.circleContent, {
                                backgroundColor: isDark
                                    ? (nextClassInfo ? colorPalette.frozenLake[900] : colorPalette.grey[800])
                                    : (nextClassInfo ? colorPalette.frozenLake[100] : colorPalette.grey[100])
                            }]}>
                                {nextClassInfo ? (
                                    <>
                                        <Text style={[styles.countdownValue, { color: isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[700] }]}>
                                            {formatCountdown(nextClassInfo.diffMinutes)}
                                        </Text>
                                        <Text style={[styles.countdownLabel, { color: isDark ? colorPalette.frozenLake[400] : colorPalette.frozenLake[600] }]}>
                                            until class
                                        </Text>
                                    </>
                                ) : (
                                    <Ionicons
                                        name="calendar-outline"
                                        size={40}
                                        color={isDark ? colors.text.secondary : colors.text.tertiary}
                                    />
                                )}
                            </View>
                        </View>

                        {/* Text Info */}
                        <Text style={[styles.pageTitle, { color: colors.text.primary }]}>
                            {nextClassInfo ? 'Upcoming Class' : 'Weekly Schedule'}
                        </Text>
                        {nextClassInfo && (
                            <Text style={[styles.subTitle, { color: colors.text.secondary }]}>
                                {nextClassInfo.course.course_code} • {nextClassInfo.startTime}
                            </Text>
                        )}

                        {/* Quick Stats Row */}
                        {!nextClassInfo && (
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.todayCount}</Text>
                                    <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Today</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.totalWeekly}</Text>
                                    <Text style={[styles.statLabel, { color: colors.text.secondary }]}>This Week</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.active}</Text>
                                    <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Courses</Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabContainer, { backgroundColor: isDark ? colorPalette.grey[900] : colors.white, borderBottomColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200] }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'today' && styles.activeTab]}
                            onPress={() => setActiveTab('today')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'today' ? colors.primary : colors.text.tertiary }]}>Today's Classes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'week' && styles.activeTab]}
                            onPress={() => setActiveTab('week')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'week' ? colors.primary : colors.text.tertiary }]}>Full Week</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={[styles.contentContainer, { paddingBottom: insets.bottom + layout.spacing.xl }]}>
                        {loading ? (
                            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                        ) : activeTab === 'today' ? (
                            // Today's View
                            todaysClasses.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="cafe-outline" size={60} color={colors.text.tertiary} />
                                    <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No classes today</Text>
                                    <Text style={[styles.emptyStateSubtext, { color: colors.text.tertiary }]}>Enjoy your free time!</Text>
                                </View>
                            ) : (
                                todaysClasses.map((course, idx) => (
                                    <View key={`${course.id}-${idx}`} style={[styles.card, {
                                        backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                        borderLeftColor: colorPalette.frozenLake[500],
                                    }]}>
                                        <View style={styles.timeColumn}>
                                            <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
                                            <Text style={[styles.timeText, { color: colors.text.primary }]}>
                                                {course.schedule?.replace(/^[A-Za-z]+\s/, '')}
                                            </Text>
                                        </View>
                                        <View style={styles.cardInfo}>
                                            <Text style={[styles.courseCode, { color: colorPalette.frozenLake[500] }]}>{course.course_code}</Text>
                                            <Text style={[styles.courseTitle, { color: colors.text.primary }]}>{course.title}</Text>
                                            <Text style={[styles.locationText, { color: colors.text.secondary }]}>{course.department} • {course.level}</Text>
                                        </View>
                                    </View>
                                ))
                            )
                        ) : (
                            // Weekly View
                            Object.entries(groupedSchedule).map(([day, dayCourses]) => {
                                const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                                return (
                                    <View key={day} style={styles.daySection}>
                                        <Text style={[styles.dayTitle, { color: isToday ? colorPalette.frozenLake[500] : colors.text.primary }]}>
                                            {day} {isToday && '(Today)'}
                                        </Text>
                                        {dayCourses.map((course, idx) => (
                                            <View key={`${course.id}-${idx}`} style={[styles.card, {
                                                backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                                borderLeftColor: isToday ? colorPalette.frozenLake[500] : colorPalette.grey[300],
                                            }]}>
                                                <View style={styles.timeColumn}>
                                                    <Ionicons name="time" size={14} color={colors.text.tertiary} />
                                                    <Text style={[styles.timeText, { color: colors.text.secondary }]}>
                                                        {course.schedule?.replace(day + 's ', '').replace(day + ' ', '')}
                                                    </Text>
                                                </View>
                                                <View style={styles.cardInfo}>
                                                    <Text style={[styles.courseTitle, { color: colors.text.primary }]}>{course.course_code}</Text>
                                                    <Text style={[styles.locationText, { color: colors.text.tertiary }]}>{course.title}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* 3. Fixed Header Overlay */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Schedule</Text>
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
    overviewHeader: {
        alignItems: 'center',
        marginTop: -60,
        marginBottom: layout.spacing.lg,
    },
    circleContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    circleContent: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countdownValue: {
        fontSize: 28,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: -4,
    },
    countdownLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    pageTitle: {
        fontSize: 22,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 4,
        textAlign: 'center',
    },
    subTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: layout.spacing.xxl,
        marginTop: layout.spacing.sm,
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
        height: 20,
        backgroundColor: '#E5E7EB',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingHorizontal: layout.spacing.xl,
        marginBottom: layout.spacing.lg,
    },
    tab: {
        flex: 1,
        paddingVertical: layout.spacing.md,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: colorPalette.frozenLake[500],
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
    },
    contentContainer: {
        paddingHorizontal: layout.spacing.xl,
    },
    card: {
        flexDirection: 'row',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.lg,
        marginBottom: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderLeftWidth: 4,
        alignItems: 'center',
    },
    timeColumn: {
        marginRight: layout.spacing.lg,
        alignItems: 'center',
        minWidth: 60,
    },
    timeText: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
        marginTop: 4,
        textAlign: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    courseCode: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 2,
    },
    courseTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    locationText: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: layout.spacing.sm,
    },
    emptyStateText: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
    },
    emptyStateSubtext: {
        fontSize: 14,
    },
    daySection: {
        marginBottom: layout.spacing.lg,
    },
    dayTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.md,
        marginLeft: 4,
    }
});
