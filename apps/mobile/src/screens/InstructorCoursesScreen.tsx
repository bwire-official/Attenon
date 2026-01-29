import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, Alert, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { CustomAlert } from '../components/CustomAlert';
import { getCurrentUser } from '../services/session';
import { getInstructorClasses } from '../services/data';
import { getClassStudentCount } from '../services/instructor-data';
import type { Class } from '../lib/supabase';

interface InstructorCoursesScreenProps {
    onBack: () => void;
}

export const InstructorCoursesScreen = ({ onBack }: InstructorCoursesScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });
        return () => backHandler.remove();
    }, [onBack]);

    const [courses, setCourses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Custom Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        icon: 'information-circle',
        actions: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
    });

    const fetchCourses = async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                const data = await getInstructorClasses(user.id);
                setCourses(data);
            }
        } catch (error) {
            console.error('Error fetching instructor courses:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCourses();
    };

    const handleCoursePress = async (course: Class) => {
        try {
            const count = await getClassStudentCount(course.id);
            setAlertConfig({
                title: course.course_code,
                message: `${count} Student${count !== 1 ? 's' : ''} Enrolled`,
                icon: 'people',
                actions: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } catch (error) {
            setAlertConfig({
                title: 'Error',
                message: 'Could not fetch enrollment count',
                icon: 'alert-circle',
                actions: [{ text: 'OK', onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        }
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

    // Function to get distinct color for department
    const getDeptColor = (dept: string) => {
        if (dept.includes('Computer')) return colorPalette.frozenLake;
        if (dept.includes('Software')) return colorPalette.yellowGreen;
        return colorPalette.inkBlack;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <CustomAlert
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                actions={alertConfig.actions as any}
                onClose={() => setAlertVisible(false)}
                icon={alertConfig.icon}
            />

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
                    <Text style={[styles.headerTitle, { color: colors.white }]}>My Courses</Text>
                    <View style={styles.headerRight} />
                </View>
            </View>

            {/* Content Section */}
            <View style={[styles.contentSection, {
                backgroundColor: isDark ? colorPalette.grey[50] : colors.white
            }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: Math.max(insets.bottom, layout.spacing.xl) },
                    ]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                            colors={[colors.primary]}
                        />
                    }
                >
                    {loading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading courses...</Text>
                        </View>
                    ) : courses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="library-outline" size={80} color={colors.text.tertiary} />
                            <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>You haven't been assigned any courses yet.</Text>
                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            {Object.entries(groupedCourses).map(([dept, deptCourses]) => {
                                const deptColor = getDeptColor(dept);
                                const accentColor = isDark ? deptColor[300] : deptColor[600];
                                const bgColor = isDark ? deptColor[900] : deptColor[100];

                                return (
                                    <View key={dept} style={styles.deptSection}>
                                        <View style={styles.deptHeader}>
                                            <View style={[styles.deptLine, { backgroundColor: accentColor }]} />
                                            <Text style={[styles.deptTitle, { color: colors.text.primary }]}>
                                                {dept} <Text style={{ color: colors.text.tertiary, fontSize: 13, fontFamily: 'Montserrat_500Medium' }}>({deptCourses.length})</Text>
                                            </Text>
                                        </View>

                                        {deptCourses.map(course => (
                                            <TouchableOpacity
                                                key={course.id}
                                                onPress={() => handleCoursePress(course)}
                                                activeOpacity={0.7}
                                                style={[styles.courseCard, {
                                                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                                    borderLeftColor: accentColor,
                                                    borderLeftWidth: 4,
                                                }]}
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
                                                        <Text style={[styles.courseTitle, { color: colors.text.primary }]}>{course.title}</Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                );
                            })}
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
        fontSize: 24,
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
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    loadingText: {
        marginTop: layout.spacing.md,
        fontFamily: 'Montserrat_500Medium',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: layout.spacing.md,
    },
    emptyStateText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: layout.spacing.xl,
    },
    listContainer: {
        gap: layout.spacing.xl,
    },
    deptSection: {
        // marginBottom: layout.spacing.xl,
    },
    deptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
        gap: layout.spacing.sm,
    },
    deptLine: {
        width: 4,
        height: 24,
        borderRadius: 2,
    },
    deptTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
    },
    courseCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        marginBottom: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    courseItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    courseBasicInfo: {
        flex: 1,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.sm,
        marginBottom: 8,
    },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    courseCode: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    levelText: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    courseTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        letterSpacing: -0.2,
    },
    courseFooter: {
        marginTop: layout.spacing.md,
        paddingTop: layout.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    scheduleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    scheduleText: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
});
