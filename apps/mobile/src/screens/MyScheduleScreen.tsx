import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getStudentClasses, getActiveSession } from '../services/data';
import type { Class } from '../lib/supabase';

interface MyScheduleScreenProps {
    onBack?: () => void;
    onNavigateToFaceAttendance?: (classData: Class) => void;
}

interface ClassWithEnrollment extends Class {
    enrollment: {
        student_id: string;
        class_id: string;
        enrolled_at: string;
    };
}

export const MyScheduleScreen = ({ onBack, onNavigateToFaceAttendance }: MyScheduleScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [classes, setClasses] = useState<ClassWithEnrollment[]>([]);
    const [activeSessions, setActiveSessions] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const user = await getCurrentUser();
            if (!user) {
                setError('User not found. Please log in again.');
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const studentClasses = await getStudentClasses(user.id);
            setClasses(studentClasses as ClassWithEnrollment[]);

            // Check for active sessions
            const sessionsMap: Record<string, boolean> = {};
            await Promise.all(studentClasses.map(async (cls) => {
                const session = await getActiveSession(cls.id);
                sessionsMap[cls.id] = !!session;
            }));
            setActiveSessions(sessionsMap);
        } catch (error) {
            console.error('Error loading schedule:', error);
            setError('Failed to load schedule. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        loadSchedule(true);
    };

    const formatSchedule = (schedule: string | null): string => {
        if (!schedule) return 'Schedule not available';
        try {
            const parsed = JSON.parse(schedule);
            if (typeof parsed === 'object') {
                const days = Object.keys(parsed);
                return days.map(day => `${day}: ${parsed[day]}`).join(', ');
            }
            return schedule;
        } catch {
            return schedule;
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.headerSection, {
                    backgroundColor: colors.black,
                    paddingTop: insets.top + layout.spacing.md,
                }]}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBack}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.white }]}>My Schedule</Text>
                        <View style={styles.headerRight} />
                    </View>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

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
                    <Text style={[styles.headerTitle, { color: colors.white }]}>My Schedule</Text>
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
                    {error ? (
                        <View style={styles.errorContainer}>
                            <Ionicons
                                name="alert-circle-outline"
                                size={48}
                                color={colors.error}
                            />
                            <Text style={[styles.errorText, { color: colors.text.primary }]}>
                                {error}
                            </Text>
                            <TouchableOpacity
                                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                                onPress={() => loadSchedule()}
                            >
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Schedule Section */
                        <View style={styles.scheduleSection}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={20}
                                    color={colors.text.primary}
                                />
                                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                                    Enrolled Classes
                                </Text>
                            </View>
                            {classes.length === 0 ? (
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
                                            No classes enrolled
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.classesList}>
                                    {classes.map((classItem) => (
                                        <View
                                            key={classItem.id}
                                            style={[styles.classCard, {
                                                backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                            }]}
                                        >
                                            <View style={styles.classHeader}>
                                                <View style={[styles.courseCodeContainer, {
                                                    backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100],
                                                }]}>
                                                    <Text style={[styles.courseCode, {
                                                        color: isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600],
                                                    }]}>
                                                        {classItem.course_code}
                                                    </Text>
                                                </View>
                                                {classItem.is_active && (
                                                    <View style={[styles.activeBadge, {
                                                        backgroundColor: isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100],
                                                    }]}>
                                                        <Text style={[styles.activeBadgeText, {
                                                            color: isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600],
                                                        }]}>
                                                            Active
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={[styles.classTitle, { color: colors.text.primary }]}>
                                                {classItem.title}
                                            </Text>
                                            {classItem.description && (
                                                <Text style={[styles.classDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                                                    {classItem.description}
                                                </Text>
                                            )}
                                            {classItem.schedule && (
                                                <View style={styles.scheduleContainer}>
                                                    <Ionicons
                                                        name="time-outline"
                                                        size={16}
                                                        color={colors.text.tertiary}
                                                    />
                                                    <Text style={[styles.scheduleText, { color: colors.text.tertiary }]}>
                                                        {formatSchedule(classItem.schedule)}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Mark Attendance Button */}
                                            {activeSessions[classItem.id] && (
                                                <TouchableOpacity
                                                    style={[styles.markAttendanceButton, { backgroundColor: colors.primary }]}
                                                    onPress={() => onNavigateToFaceAttendance?.(classItem)}
                                                >
                                                    <Ionicons name="scan-circle-outline" size={20} color={colors.white} />
                                                    <Text style={styles.markAttendanceText}>Mark Attendance</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}
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
    scheduleSection: {
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
    classesList: {
        gap: layout.spacing.md,
    },
    classCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    classHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: layout.spacing.sm,
    },
    courseCodeContainer: {
        paddingHorizontal: layout.spacing.sm,
        paddingVertical: layout.spacing.xs / 2,
        borderRadius: layout.borderRadius.sm,
    },
    courseCode: {
        fontSize: 14,
        fontFamily: 'Montserrat_700Bold',
    },
    activeBadge: {
        paddingHorizontal: layout.spacing.sm,
        paddingVertical: layout.spacing.xs / 2,
        borderRadius: layout.borderRadius.sm,
    },
    activeBadgeText: {
        fontSize: 11,
        fontFamily: 'Montserrat_600SemiBold',
        textTransform: 'uppercase',
    },
    classTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: layout.spacing.xs,
    },
    classDescription: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        marginBottom: layout.spacing.sm,
    },
    scheduleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.xs / 2,
        marginTop: layout.spacing.xs,
    },
    scheduleText: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
        flex: 1,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: layout.spacing.xl,
        minHeight: 400,
    },
    errorText: {
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
        marginTop: layout.spacing.md,
        marginBottom: layout.spacing.lg,
    },
    retryButton: {
        paddingHorizontal: layout.spacing.xl,
        paddingVertical: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
    },
    markAttendanceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    markAttendanceText: {
        color: '#FFFFFF',
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
    },
    retryText: {
        color: '#FFFFFF',
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 16,
    },
});
