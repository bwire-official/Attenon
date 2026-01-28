import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { useAllCourses } from '../hooks/useAllCourses';

export const AllCoursesScreen = ({ onBack }: { onBack: () => void }) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const {
        loading,
        refreshing,
        enrolledIds,
        groupedCourses,
        handleEnroll,
        onRefresh
    } = useAllCourses();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Section - Matches AttendanceHistory Style */}
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
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Available Courses</Text>
                    <View style={styles.headerRight} />
                </View>
            </View>

            {/* Content Section - Signature Overlapping Card */}
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
                            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Fetching courses...</Text>
                        </View>
                    ) : Object.keys(groupedCourses).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="library-outline" size={80} color={colors.text.tertiary} />
                            <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No courses available right now.</Text>
                        </View>
                    ) : (
                        Object.entries(groupedCourses).sort().map(([group, groupCourses]) => (
                            <View key={group} style={styles.groupSection}>
                                <View style={styles.groupHeaderContainer}>
                                    <View style={[styles.groupLine, { backgroundColor: colors.primary }]} />
                                    <Text style={[styles.groupTitle, { color: colors.text.primary }]}>{group}</Text>
                                </View>

                                {groupCourses.map(course => {
                                    const isEnrolled = enrolledIds.has(course.id);
                                    return (
                                        <View key={course.id} style={[styles.courseCard, {
                                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                        }]}>
                                            <View style={styles.courseItemHeader}>
                                                <View style={styles.courseBasicInfo}>
                                                    <Text style={[styles.courseCode, { color: colors.primary }]}>{course.course_code}</Text>
                                                    <Text style={[styles.courseTitle, { color: colors.text.primary }]} numberOfLines={1}>{course.title}</Text>
                                                </View>

                                                <TouchableOpacity
                                                    style={[styles.actionButton, {
                                                        backgroundColor: isEnrolled ? 'transparent' : colors.primary,
                                                        borderColor: isEnrolled ? colorPalette.yellowGreen[500] : colors.primary,
                                                        borderWidth: 1
                                                    }]}
                                                    onPress={() => handleEnroll(course.id)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.actionButtonText, {
                                                        color: isEnrolled ? colorPalette.yellowGreen[500] : colors.white
                                                    }]}>
                                                        {isEnrolled ? 'JOINED' : 'ENROLL'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>

                                            {course.schedule && (
                                                <View style={styles.courseFooter}>
                                                    <View style={styles.scheduleContainer}>
                                                        <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                                                        <Text style={[styles.scheduleText, { color: colors.text.tertiary }]}>{course.schedule}</Text>
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        ))
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
    },
    groupSection: {
        marginBottom: layout.spacing.xl,
    },
    groupHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.sm,
        marginBottom: layout.spacing.md,
    },
    groupLine: {
        width: 4,
        height: 18,
        borderRadius: 2,
    },
    groupTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.5,
    },
    courseCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        marginBottom: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    courseItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    courseBasicInfo: {
        flex: 1,
        marginRight: layout.spacing.md,
    },
    courseCode: {
        fontSize: 12,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 2,
    },
    courseTitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    courseFooter: {
        marginTop: layout.spacing.sm,
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
        fontFamily: 'Montserrat_400Regular',
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: layout.borderRadius.round,
        minWidth: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 11,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1,
    },
});
