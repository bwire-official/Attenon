import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getInstructorStudentDetails, StudentDetails } from '../services/instructor-data';

interface InstructorStudentDetailsScreenProps {
    studentId: string;
    onBack: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

export const InstructorStudentDetailsScreen = ({ studentId, onBack }: InstructorStudentDetailsScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });
        return () => backHandler.remove();
    }, [onBack]);

    const [details, setDetails] = useState<StudentDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'courses' | 'attendance'>('courses');

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const user = await getCurrentUser();
                if (user) {
                    const data = await getInstructorStudentDetails(user.id, studentId);
                    setDetails(data);
                }
            } catch (error) {
                console.error('Error fetching student details:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [studentId]);

    const stats = useMemo(() => {
        if (!details) return { courses: 0, attendanceRate: 0, present: 0, total: 0 };
        const total = details.attendance.length;
        const present = details.attendance.filter(r => r.status === 'present').length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return {
            courses: details.courses.length,
            attendanceRate: rate,
            present,
            total
        };
    }, [details]);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.black }]}>
                <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    if (!details) {
        return (
            <View style={[styles.container, { backgroundColor: colors.black }]}>
                <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
                <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
                    <Text style={{ color: colors.text.secondary }}>Student details not found</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 1. Fixed Black Background for Header Area */}
            <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />

            {/* 2. Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[2]} // Adjust index for sticky tabs if needed
            >
                {/* Spacer to push content down below header */}
                <View style={{ height: HEADER_HEIGHT - SHEET_OVERLAP }} />

                {/* White Sheet Container */}
                <View style={[styles.whiteSheet, {
                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    minHeight: SCREEN_HEIGHT - (HEADER_HEIGHT - SHEET_OVERLAP)
                }]}>

                    {/* Avatar & Profile */}
                    <View style={styles.profileSection}>
                        <View style={[styles.avatarContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                            <View style={[styles.avatar, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100] }]}>
                                <Text style={[styles.avatarText, { color: isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600] }]}>
                                    {details.profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.studentName, { color: colors.text.primary }]}>{details.profile.full_name}</Text>
                        <Text style={[styles.studentRole, { color: colors.text.tertiary }]}>
                            {details.profile.department || 'Student'}
                        </Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="id-card-outline" size={14} color={colors.text.tertiary} />
                            <Text style={[styles.locationText, { color: colors.text.secondary }]}>
                                {details.profile.reg_number || 'No Reg No'}
                            </Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.courses}</Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Courses</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.attendanceRate}%</Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Attendance</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>{details.profile.level || '-'}</Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Level</Text>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={[styles.tabContainer, { backgroundColor: isDark ? colorPalette.grey[900] : colors.white, borderBottomColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200] }]}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'courses' && styles.activeTab]}
                            onPress={() => setActiveTab('courses')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'courses' ? colors.primary : colors.text.tertiary }]}>Enrolled Courses</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'attendance' && styles.activeTab]}
                            onPress={() => setActiveTab('attendance')}
                        >
                            <Text style={[styles.tabText, { color: activeTab === 'attendance' ? colors.primary : colors.text.tertiary }]}>Attendance History</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    <View style={[styles.tabContent, { paddingBottom: insets.bottom + layout.spacing.xl }]}>
                        {activeTab === 'courses' ? (
                            <View>
                                {details.courses.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="library-outline" size={48} color={colors.text.tertiary} />
                                        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No courses found</Text>
                                    </View>
                                ) : (
                                    details.courses.map(course => (
                                        <View key={course.id} style={[styles.card, {
                                            backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                            borderLeftColor: colorPalette.frozenLake[400],
                                            borderLeftWidth: 4
                                        }]}>
                                            <View style={[styles.iconBox, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[50] }]}>
                                                <Ionicons name="library-outline" size={20} color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]} />
                                            </View>
                                            <View style={styles.cardInfo}>
                                                <View style={styles.cardHeaderRow}>
                                                    <Text style={[styles.courseCode, { color: colorPalette.frozenLake[500] }]}>{course.course_code}</Text>
                                                </View>
                                                <Text style={[styles.courseTitle, { color: colors.text.primary }]} numberOfLines={1}>{course.title}</Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        ) : (
                            <View>
                                {details.attendance.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
                                        <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No attendance records</Text>
                                    </View>
                                ) : (
                                    details.attendance.map(record => (
                                        <View key={record.id} style={[styles.card, {
                                            backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                            borderLeftColor: record.status === 'present' ? colorPalette.frozenLake[400] : '#EF4444',
                                            borderLeftWidth: 4
                                        }]}>
                                            <View style={styles.cardInfo}>
                                                <Text style={[styles.historyDate, { color: colors.text.primary }]}>{formatDate(record.date)}</Text>
                                                <Text style={[styles.historyCourseCode, { color: colors.text.secondary }]}>{record.course_code}</Text>
                                            </View>

                                            <View style={[styles.statusBadge, {
                                                backgroundColor: record.status === 'present'
                                                    ? (isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100])
                                                    : (isDark ? '#7F1D1D' : '#FEE2E2')
                                            }]}>
                                                <Text style={[styles.statusText, {
                                                    color: record.status === 'present'
                                                        ? (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[700])
                                                        : (isDark ? '#FCA5A5' : '#B91C1C')
                                                }]}>
                                                    {record.status.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                    ))
                                )}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* 3. Fixed Header Overlay (Back Button + Title) */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Student Profile</Text>
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
        zIndex: 10, // Topmost
        paddingHorizontal: layout.spacing.xl,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44, // Standard nav height
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
        overflow: 'visible', // Ensure avatar can pop out
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileSection: {
        alignItems: 'center',
        marginTop: -60, // Negative margin to pull avatar up
        marginBottom: layout.spacing.lg,
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
        fontSize: 20,
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
    tabContent: {
        paddingHorizontal: layout.spacing.xl,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: layout.spacing.xl,
        gap: layout.spacing.sm,
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.lg,
        marginBottom: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    cardInfo: {
        flex: 1,
    },
    cardHeaderRow: {
        marginBottom: 2,
    },
    courseCode: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    courseTitle: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
    },
    historyDate: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 2,
        letterSpacing: -0.5,
    },
    historyCourseCode: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: layout.spacing.sm,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
    },
});
