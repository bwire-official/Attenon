import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

const GRID_GAP = layout.spacing.md;

// Mock Data
const ENROLLED_COURSES = [
    { id: '1', code: 'CSC 401', title: 'Advanced Algorithms', instructor: 'Dr. Smith', schedule: 'Mon, Wed 9:00 AM', attendance: 92 },
    { id: '2', code: 'CSC 412', title: 'Database Systems', instructor: 'Prof. Johnson', schedule: 'Tue, Thu 11:00 AM', attendance: 85 },
    { id: '3', code: 'CSC 405', title: 'Software Engineering', instructor: 'Dr. Williams', schedule: 'Mon, Wed 2:00 PM', attendance: 78 },
    { id: '4', code: 'CSC 420', title: 'Machine Learning', instructor: 'Prof. Brown', schedule: 'Tue, Thu 3:00 PM', attendance: 95 },
];

const RECENT_ATTENDANCE = [
    { id: '1', course: 'CSC 401', date: 'Dec 07, 2025', status: 'Present', time: '09:05 AM' },
    { id: '2', course: 'CSC 412', date: 'Dec 06, 2025', status: 'Present', time: '11:00 AM' },
    { id: '3', course: 'CSC 405', date: 'Dec 04, 2025', status: 'Absent', time: '-' },
];

interface StudentDashboardProps {
    onNavigateToNotifications?: () => void;
    onNavigateToSettings?: () => void;
}

export const StudentDashboard = ({ onNavigateToNotifications, onNavigateToSettings }: StudentDashboardProps) => {
    const { colors, isDark } = useTheme();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

    const menuItems: Array<{
        id: string;
        icon: string;
        label: string;
        onPress: () => void;
        color?: 'frozenLake' | 'inkBlack' | 'yellowGreen' | null;
    }> = [
        { id: '1', icon: 'calendar-outline', label: 'My Schedule', onPress: () => { }, color: 'frozenLake' },
        { id: '2', icon: 'time-outline', label: 'Attendance History', onPress: () => { }, color: 'inkBlack' },
        { id: '3', icon: 'bar-chart-outline', label: 'My Statistics', onPress: () => { }, color: 'yellowGreen' },
        { id: '4', icon: 'library-outline', label: 'All Courses', onPress: () => { } },
        { id: '5', icon: 'notifications-outline', label: 'Notifications', onPress: () => { onNavigateToNotifications?.(); }, color: 'frozenLake' },
        { id: '6', icon: 'person-outline', label: 'Profile', onPress: () => { } },
        { id: '7', icon: 'settings-outline', label: 'Settings', onPress: () => { onNavigateToSettings?.(); }, color: 'inkBlack' },
        { id: '8', icon: 'help-circle-outline', label: 'Help & Support', onPress: () => { }, color: 'yellowGreen' },
    ];

    // Responsive breakpoints
    const isSmallScreen = SCREEN_WIDTH < 375;
    const isTablet = SCREEN_WIDTH >= 768;

    // Responsive font sizes
    const getResponsiveFontSize = (base: number) => {
        if (isSmallScreen) return base * 0.9;
        if (isTablet) return base * 1.2;
        return base;
    };

    // Responsive spacing
    const getResponsiveSpacing = (base: number) => {
        if (isSmallScreen) return base * 0.8;
        if (isTablet) return base * 1.3;
        return base;
    };

    // Calculate button size based on current screen width
    const SCREEN_PADDING = layout.spacing.md;
    const BUTTON_SIZE = (SCREEN_WIDTH - (SCREEN_PADDING * 2) - (GRID_GAP * 2)) / 3;

    const iconSize = isTablet ? 32 : isSmallScreen ? 24 : 28;
    const buttonTextSize = getResponsiveFontSize(11);

    const renderMenuItem = (item: typeof menuItems[0]) => {
        const getColorPalette = (colorName: string | null) => {
            if (!colorName) return null;
            return colorPalette[colorName as keyof typeof colorPalette];
        };

        const itemColor = getColorPalette(item.color);
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
                        minHeight: isSmallScreen ? 90 : isTablet ? 120 : 100,
                        paddingVertical: getResponsiveSpacing(layout.spacing.lg),
                    }
                ]}
                onPress={item.onPress}
                activeOpacity={0.8}
            >
                <View style={[styles.iconContainer, {
                    marginBottom: getResponsiveSpacing(layout.spacing.sm),
                    height: isTablet ? 44 : isSmallScreen ? 32 : 36,
                }]}>
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
                            fontSize: buttonTextSize,
                            lineHeight: isSmallScreen ? 12 : 13,
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

    const overallAttendance = 87.5;
    const totalPresent = 32;
    const totalAbsent = 5;
    const enrolledCoursesCount = ENROLLED_COURSES.length;
    const upcomingClassesToday = 2;

    return (
        <ScreenWrapper>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.header, {
                    marginBottom: getResponsiveSpacing(layout.spacing.xl),
                    marginTop: getResponsiveSpacing(layout.spacing.md),
                }]}>
                    <View style={styles.headerLeft}>
                        <Text style={[styles.greeting, {
                            color: colors.text.secondary,
                            fontSize: getResponsiveFontSize(14),
                        }]}>Welcome back,</Text>
                        <Text style={[styles.name, {
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(20),
                        }]}>Ben Wire</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.notificationButton, {
                            width: isTablet ? 48 : 40,
                            height: isTablet ? 48 : 40,
                            borderRadius: isTablet ? 24 : 20,
                        }]}
                        onPress={() => {
                            onNavigateToNotifications?.();
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="notifications-outline"
                            size={isTablet ? 28 : 24}
                            color={colors.text.primary}
                        />
                        <View style={[styles.notificationBadge, {
                            backgroundColor: '#EF4444',
                        }]}>
                            <Text style={[styles.badgeText, { color: colors.white }]}>3</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Overview Stats Card */}
                <View style={[styles.statsCard, {
                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    marginBottom: getResponsiveSpacing(layout.spacing.lg),
                    padding: getResponsiveSpacing(layout.spacing.lg),
                }]}>
                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, {
                            backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100],
                        }]}>
                            <Ionicons
                                name="checkmark-circle-outline"
                                size={isTablet ? 24 : isSmallScreen ? 18 : 20}
                                color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]}
                            />
                        </View>
                        <Text style={[styles.statValue, {
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(32),
                        }]}>{overallAttendance}%</Text>
                        <Text style={[styles.statLabel, {
                            color: colors.text.secondary,
                            fontSize: getResponsiveFontSize(12),
                        }]}>Attendance Rate</Text>
                    </View>

                    <View style={[styles.statDivider, {
                        backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                    }]} />

                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, {
                            backgroundColor: isDark ? colorPalette.inkBlack[900] : colorPalette.inkBlack[100],
                        }]}>
                            <Ionicons
                                name="library-outline"
                                size={isTablet ? 24 : isSmallScreen ? 18 : 20}
                                color={isDark ? colorPalette.inkBlack[300] : colorPalette.inkBlack[600]}
                            />
                        </View>
                        <Text style={[styles.statValue, {
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(32),
                        }]}>{enrolledCoursesCount}</Text>
                        <Text style={[styles.statLabel, {
                            color: colors.text.secondary,
                            fontSize: getResponsiveFontSize(12),
                        }]}>Enrolled Courses</Text>
                    </View>

                    <View style={[styles.statDivider, {
                        backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                    }]} />

                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, {
                            backgroundColor: isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100],
                        }]}>
                            <Ionicons
                                name="calendar-outline"
                                size={isTablet ? 24 : isSmallScreen ? 18 : 20}
                                color={isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600]}
                            />
                        </View>
                        <Text style={[styles.statValue, {
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(32),
                        }]}>{upcomingClassesToday}</Text>
                        <Text style={[styles.statLabel, {
                            color: colors.text.secondary,
                            fontSize: getResponsiveFontSize(12),
                        }]}>Today's Classes</Text>
                    </View>
                </View>

                {/* Enrolled Courses Section */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, {
                        color: colors.text.primary,
                        fontSize: getResponsiveFontSize(18),
                    }]}>My Courses</Text>
                    <TouchableOpacity onPress={() => { }}>
                        <Text style={[styles.seeAllText, {
                            color: colors.primary,
                            fontSize: getResponsiveFontSize(14),
                        }]}>See All</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.coursesScrollContent}
                    style={styles.coursesScroll}
                >
                    {ENROLLED_COURSES.map((course) => (
                        <TouchableOpacity
                            key={course.id}
                            style={[styles.courseCard, {
                                backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                width: SCREEN_WIDTH * 0.75,
                                marginRight: layout.spacing.md,
                            }]}
                            onPress={() => setSelectedCourse(course.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.courseHeader}>
                                <View style={[styles.courseIconContainer, {
                                    backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100],
                                }]}>
                                    <Ionicons
                                        name="book-outline"
                                        size={24}
                                        color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]}
                                    />
                                </View>
                                <View style={[styles.attendanceBadge, {
                                    backgroundColor: course.attendance >= 90
                                        ? (isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100])
                                        : course.attendance >= 75
                                            ? (isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100])
                                            : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                }]}>
                                    <Text style={[styles.attendanceBadgeText, {
                                        color: course.attendance >= 90
                                            ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                            : course.attendance >= 75
                                                ? (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600])
                                                : colors.text.secondary,
                                        fontSize: getResponsiveFontSize(12),
                                    }]}>{course.attendance}%</Text>
                                </View>
                            </View>
                            <Text style={[styles.courseCode, {
                                color: colors.text.primary,
                                fontSize: getResponsiveFontSize(16),
                            }]}>{course.code}</Text>
                            <Text style={[styles.courseTitle, {
                                color: colors.text.secondary,
                                fontSize: getResponsiveFontSize(14),
                            }]}>{course.title}</Text>
                            <View style={styles.courseMeta}>
                                <View style={styles.courseMetaItem}>
                                    <Ionicons name="person-outline" size={14} color={colors.text.tertiary} />
                                    <Text style={[styles.courseMetaText, {
                                        color: colors.text.tertiary,
                                        fontSize: getResponsiveFontSize(12),
                                    }]}>{course.instructor}</Text>
                                </View>
                                <View style={styles.courseMetaItem}>
                                    <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                                    <Text style={[styles.courseMetaText, {
                                        color: colors.text.tertiary,
                                        fontSize: getResponsiveFontSize(12),
                                    }]}>{course.schedule}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Quick Actions */}
                <Text style={[styles.sectionTitle, {
                    color: colors.text.primary,
                    fontSize: getResponsiveFontSize(18),
                    marginTop: getResponsiveSpacing(layout.spacing.lg),
                    marginBottom: getResponsiveSpacing(layout.spacing.md),
                }]}>Quick Actions</Text>

                <View style={[styles.gridContainer, {
                    marginTop: getResponsiveSpacing(layout.spacing.sm),
                }]}>
                    {menuItems.map((item) => renderMenuItem(item))}
                </View>

                {/* Recent Activity */}
                <Text style={[styles.sectionTitle, {
                    color: colors.text.primary,
                    fontSize: getResponsiveFontSize(18),
                    marginTop: getResponsiveSpacing(layout.spacing.xl),
                    marginBottom: getResponsiveSpacing(layout.spacing.md),
                }]}>Recent Activity</Text>

                <View style={styles.historyList}>
                    {RECENT_ATTENDANCE.map(item => (
                        <View key={item.id} style={[styles.historyItem, {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                        }]}>
                            <View style={styles.historyLeft}>
                                <View style={[styles.historyIconContainer, {
                                    backgroundColor: item.status === 'Present'
                                        ? (isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100])
                                        : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                }]}>
                                    <Ionicons
                                        name={item.status === 'Present' ? 'checkmark-circle' : 'close-circle'}
                                        size={20}
                                        color={item.status === 'Present'
                                            ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                            : colors.text.secondary}
                                    />
                                </View>
                                <View style={styles.historyInfo}>
                                    <Text style={[styles.historyCourse, {
                                        color: colors.text.primary,
                                        fontSize: getResponsiveFontSize(16),
                                    }]}>{item.course}</Text>
                                    <Text style={[styles.historyDate, {
                                        color: colors.text.secondary,
                                        fontSize: getResponsiveFontSize(12),
                                    }]}>{item.date} • {item.time}</Text>
                                </View>
                            </View>
                            <View style={[
                                styles.statusBadge,
                                item.status === 'Absent' ? styles.statusAbsent : styles.statusPresent,
                                {
                                    backgroundColor: item.status === 'Present'
                                        ? (isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100])
                                        : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    item.status === 'Absent' ? styles.statusTextAbsent : styles.statusTextPresent,
                                    {
                                        color: item.status === 'Present'
                                            ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                            : colors.text.secondary,
                                        fontSize: getResponsiveFontSize(12),
                                    }
                                ]}>
                                    {item.status}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: layout.spacing.xl * 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flex: 1,
    },
    greeting: {
        // Font size set inline
    },
    name: {
        fontFamily: 'Montserrat_700Bold',
    },
    notificationButton: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 6,
        right: 6,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    statsCard: {
        borderRadius: layout.borderRadius.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 120,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statDivider: {
        width: 1,
        height: 60,
        marginHorizontal: layout.spacing.sm,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.sm,
    },
    statValue: {
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xs / 2,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    sectionTitle: {
        fontFamily: 'Montserrat_600SemiBold',
    },
    seeAllText: {
        fontFamily: 'Montserrat_600SemiBold',
    },
    coursesScroll: {
        marginBottom: layout.spacing.lg,
    },
    coursesScrollContent: {
        paddingHorizontal: layout.spacing.md,
    },
    courseCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    courseIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    attendanceBadge: {
        paddingHorizontal: layout.spacing.sm,
        paddingVertical: layout.spacing.xs,
        borderRadius: layout.borderRadius.round,
    },
    attendanceBadgeText: {
        fontFamily: 'Montserrat_600SemiBold',
    },
    courseCode: {
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xs,
    },
    courseTitle: {
        marginBottom: layout.spacing.md,
    },
    courseMeta: {
        gap: layout.spacing.xs,
    },
    courseMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.xs,
    },
    courseMetaText: {
        // Font size set inline
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
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuButtonText: {
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
        fontFamily: 'Montserrat_600SemiBold',
    },
    statusTextPresent: {
        // Color set inline
    },
    statusTextAbsent: {
        // Color set inline
    },
});
