import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, BackHandler, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getStudentClasses } from '../services/data';
import { supabase } from '../lib/supabase';
import type { Class } from '../lib/supabase';
import { StudentCourseAttendanceScreen } from './StudentCourseAttendanceScreen';

const CACHE_KEY_COURSES = '@student_courses_data';
const CACHE_KEY_COURSE_STATS = '@student_course_stats';
const PURE_GREEN = '#22C55E';

interface CourseStats {
    [courseId: string]: {
        percentage: number;
        total: number;
    };
}

interface StudentCoursesScreenProps {
    onBack: () => void;
}

export const StudentCoursesScreen = ({ onBack }: StudentCoursesScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const shimmerAnimation = useRef(new Animated.Value(0)).current;

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

    const [courses, setCourses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Class | null>(null);
    const [courseStats, setCourseStats] = useState<CourseStats>({});

    const loadCachedData = async () => {
        try {
            const [cachedCourses, cachedStats] = await Promise.all([
                AsyncStorage.getItem(CACHE_KEY_COURSES),
                AsyncStorage.getItem(CACHE_KEY_COURSE_STATS),
            ]);
            if (cachedCourses) {
                setCourses(JSON.parse(cachedCourses));
                setLoading(false);
                setIsInitialLoad(false);
            }
            if (cachedStats) {
                setCourseStats(JSON.parse(cachedStats));
            }
            fetchCourses();
        } catch (error) {
            console.error('Error loading cached courses:', error);
            fetchCourses();
        }
    };

    const fetchCourseStats = async (userId: string, courseIds: string[]) => {
        try {
            const { data, error } = await supabase
                .from('attendance_logs')
                .select('class_id, status')
                .eq('student_id', userId)
                .in('class_id', courseIds);

            if (error) {
                console.error('Error fetching course stats:', error);
                return {};
            }

            const stats: CourseStats = {};
            courseIds.forEach(id => {
                const courseLogs = data?.filter(l => l.class_id === id) || [];
                const total = courseLogs.length;
                const present = courseLogs.filter(l => l.status === 'present' || l.status === 'late').length;
                stats[id] = {
                    percentage: total > 0 ? Math.round((present / total) * 100) : -1,
                    total,
                };
            });
            return stats;
        } catch (error) {
            console.error('Error in fetchCourseStats:', error);
            return {};
        }
    };

    const fetchCourses = async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                const data = await getStudentClasses(user.id);
                setCourses(data);
                await AsyncStorage.setItem(CACHE_KEY_COURSES, JSON.stringify(data));

                // Fetch attendance stats for all courses
                if (data.length > 0) {
                    const stats = await fetchCourseStats(user.id, data.map(c => c.id));
                    setCourseStats(stats);
                    await AsyncStorage.setItem(CACHE_KEY_COURSE_STATS, JSON.stringify(stats));
                }
            }
        } catch (error) {
            console.error('Error fetching student courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsInitialLoad(false);
        }
    };

    useEffect(() => {
        loadCachedData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCourses();
    };

    // Group courses by department
    const groupedCourses = React.useMemo(() => {
        const groups: Record<string, Class[]> = {};
        courses.forEach(course => {
            const dept = course.department || 'Other';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(course);
        });
        return groups;
    }, [courses]);

    const getDeptColor = (dept: string) => {
        if (dept.includes('Computer')) return colorPalette.frozenLake;
        if (dept.includes('Software')) return colorPalette.yellowGreen;
        return colorPalette.inkBlack;
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage >= 75) return PURE_GREEN;
        if (percentage >= 50) return '#F59E0B';
        return '#EF4444';
    };

    const getPercentageBgColor = (percentage: number) => {
        if (percentage >= 75) return isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)';
        if (percentage >= 50) return isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)';
        return isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)';
    };

    // Percentage Badge Component (no SVG needed)
    const PercentageBadge = ({ percentage }: { percentage: number }) => {
        const hasData = percentage >= 0;
        const color = hasData ? getPercentageColor(percentage) : colors.text.tertiary;
        const bgColor = hasData ? getPercentageBgColor(percentage) : (isDark ? colorPalette.grey[800] : colorPalette.grey[100]);

        return (
            <View style={[styles.percentageBadge, { backgroundColor: bgColor, borderColor: hasData ? color : 'transparent', borderWidth: hasData ? 2 : 0 }]}>
                <Text style={[styles.percentageText, { color: color }]}>
                    {hasData ? `${percentage}%` : '—'}
                </Text>
            </View>
        );
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

    const CourseCardSkeleton = () => (
        <View style={[styles.courseCard, {
            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
            borderLeftColor: isDark ? colorPalette.grey[600] : colorPalette.grey[300],
            borderLeftWidth: 3,
        }]}>
            <View style={styles.courseItemHeader}>
                <View style={styles.courseBasicInfo}>
                    <View style={styles.codeRow}>
                        <SkeletonBox style={{ width: 70, height: 22, borderRadius: 20 }} />
                        <SkeletonBox style={{ width: 60, height: 14 }} />
                    </View>
                    <SkeletonBox style={{ width: '85%', height: 18, marginBottom: 8 }} />
                    <View style={styles.scheduleRow}>
                        <SkeletonBox style={{ width: 14, height: 14, borderRadius: 7 }} />
                        <SkeletonBox style={{ width: 120, height: 12 }} />
                    </View>
                </View>
            </View>
        </View>
    );

    const DeptGroupSkeleton = () => (
        <View style={styles.deptGroup}>
            <View style={styles.deptHeader}>
                <SkeletonBox style={{ width: 4, height: 18, borderRadius: 2 }} />
                <SkeletonBox style={{ width: 150, height: 14 }} />
            </View>
            {[1, 2].map((i) => (
                <CourseCardSkeleton key={i} />
            ))}
        </View>
    );

    const CoursesSkeleton = () => (
        <View>
            {[1, 2].map((i) => (
                <DeptGroupSkeleton key={i} />
            ))}
        </View>
    );

    // Show course attendance detail if a course is selected
    if (selectedCourse) {
        return (
            <StudentCourseAttendanceScreen
                course={selectedCourse}
                onBack={() => setSelectedCourse(null)}
            />
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View
                style={[
                    styles.headerSection,
                    {
                        backgroundColor: colors.black,
                        paddingTop: insets.top + layout.spacing.sm,
                    },
                ]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>My Courses</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colorPalette.frozenLake[500]]} />
                }
            >
                {isInitialLoad && loading ? (
                    <CoursesSkeleton />
                ) : courses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="library-outline" size={80} color={colors.text.tertiary} />
                        <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Courses Found</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.text.secondary }]}>
                            You are not enrolled in any courses yet.
                        </Text>
                    </View>
                ) : (
                    Object.entries(groupedCourses).map(([dept, deptCourses]) => {
                        const deptColors = getDeptColor(dept);
                        const accentColor = deptColors[500];
                        const bgColor = isDark ? deptColors[900] : deptColors[50];

                        return (
                            <View key={dept} style={styles.deptGroup}>
                                <View style={styles.deptHeader}>
                                    <View style={[styles.deptLine, { backgroundColor: accentColor }]} />
                                    <Text style={[styles.deptTitle, { color: colors.text.primary }]}>
                                        {dept} <Text style={{ color: colors.text.tertiary, fontSize: 13, fontFamily: 'Montserrat_500Medium' }}>({deptCourses.length})</Text>
                                    </Text>
                                </View>

                                {deptCourses.map(course => {
                                    const stats = courseStats[course.id];
                                    const percentage = stats?.percentage ?? -1;

                                    return (
                                        <TouchableOpacity
                                            key={course.id}
                                            style={[styles.courseCard, {
                                                backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                            }]}
                                            onPress={() => setSelectedCourse(course)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.courseItemHeader}>
                                                <View style={styles.courseBasicInfo}>
                                                    <View style={styles.codeRow}>
                                                        <View style={[styles.codeBadge, { backgroundColor: bgColor }]}>
                                                            <Text style={[styles.courseCode, { color: accentColor }]}>{course.course_code}</Text>
                                                        </View>
                                                        {course.level && (
                                                            <Text style={[styles.levelText, { color: colors.text.tertiary }]}>{course.level} Level</Text>
                                                        )}
                                                    </View>
                                                    <Text style={[styles.courseTitle, { color: colors.text.primary }]} numberOfLines={2}>{course.title}</Text>
                                                    {course.schedule && (
                                                        <View style={styles.scheduleRow}>
                                                            <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                                                            <Text style={[styles.scheduleText, { color: colors.text.tertiary }]}>{course.schedule}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={styles.courseRight}>
                                                    <PercentageBadge percentage={percentage} />
                                                    <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} style={{ marginTop: 6 }} />
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerSection: {
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.md,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: layout.spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
    },
    headerInfo: {
        marginTop: 4,
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: layout.spacing.md,
        paddingBottom: 40,
    },
    loadingContainer: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyState: {
        marginTop: 80,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        marginTop: layout.spacing.lg,
    },
    emptySubtitle: {
        fontSize: 15,
        fontFamily: 'Montserrat_500Medium',
        marginTop: 8,
        textAlign: 'center',
    },
    deptGroup: {
        marginBottom: layout.spacing.lg,
    },
    deptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: layout.spacing.sm,
        paddingHorizontal: layout.spacing.xs,
    },
    deptLine: {
        width: 4,
        height: 18,
        borderRadius: 2,
        marginRight: 8,
    },
    deptTitle: {
        fontSize: 13,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.5,
    },
    courseCard: {
        borderRadius: 16,
        padding: layout.spacing.md,
        marginBottom: layout.spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 3,
    },
    courseItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    courseBasicInfo: {
        flex: 1,
        marginRight: layout.spacing.md,
    },
    courseRight: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    codeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
    },
    courseCode: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    levelText: {
        fontSize: 11,
        fontFamily: 'Montserrat_600SemiBold',
    },
    courseTitle: {
        fontSize: 15,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 4,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    scheduleText: {
        fontSize: 11,
        fontFamily: 'Montserrat_500Medium',
    },
    percentageBadge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentageText: {
        fontSize: 13,
        fontFamily: 'Montserrat_700Bold',
    },
});
