import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, RefreshControl, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StudentListScreen } from './StudentListScreen';
import { InstructorCoursesScreen } from './InstructorCoursesScreen';
import { InstructorScheduleScreen } from './InstructorScheduleScreen';
import { InstructorStudentDetailsScreen } from './InstructorStudentDetailsScreen';
import { InstructorSettingsScreen } from './InstructorSettingsScreen';
import { TakeAttendanceScreen } from './TakeAttendanceScreen';
import { AttendanceMonitorScreen } from './AttendanceMonitorScreen';
import { AttendanceSummaryScreen } from './AttendanceSummaryScreen';
import { InstructorAttendanceHistoryScreen } from './InstructorAttendanceHistoryScreen';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getInstructorStats, getInstructorRecentSessions, InstructorStats, RecentSession } from '../services/instructor-data';
import { supabase, type Profile } from '../lib/supabase';
import { useActiveSession } from '../hooks/useActiveSession';
import { useNotifications } from '../hooks/useNotifications';
import { AttendanceApi } from '../services/attendance-api';

const GRID_GAP = layout.spacing.md;

interface InstructorDashboardProps {
    onNavigateToNotifications?: () => void;
    onNavigateToLiveSession?: () => void;
}

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

export const InstructorDashboard = ({
    onNavigateToNotifications,
    onNavigateToLiveSession
}: InstructorDashboardProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    // State
    const [showStudentList, setShowStudentList] = useState(false);
    const [showMyCourses, setShowMyCourses] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState<InstructorStats>({ todayClasses: 0, totalStudents: 0, activeCourses: 0 });
    const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showTakeAttendance, setShowTakeAttendance] = useState(false);
    const [showMonitor, setShowMonitor] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // Active session subscription (Supabase Realtime - no polling)
    const { activeSession, activeSessions, formatTimeRemaining, timeRemaining, timeRemainingMap, sessionExpired, clearExpiredSession } = useActiveSession(userProfile?.id || null);
    const [selectedSessionForMonitor, setSelectedSessionForMonitor] = useState<string | null>(null);

    // Real notifications (Supabase Realtime)
    const { unreadCount: notificationCount } = useNotifications(userProfile?.id || null);

    const animateNav = (action: () => void) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        action();
    };

    const initializeDashboard = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) setRefreshing(true);
            else setLoading(true);

            const profile = await getCurrentUser();
            setUserProfile(profile);

            if (profile) {
                const [newStats, sessions] = await Promise.all([
                    getInstructorStats(profile.id),
                    getInstructorRecentSessions(profile.id)
                ]);
                setStats(newStats);
                setRecentSessions(sessions);
            }
        } catch (error) {
            console.error('Error initializing instructor dashboard:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        initializeDashboard();
    }, []);

    useEffect(() => {
        // Auto-redirect to summary when session expires (no matter which screen instructor is on)
        if (sessionExpired && !showSummary) {
            const sessionIdToComplete = sessionExpired;

            const handleExpiry = async () => {
                try {
                    console.log('[Dashboard] Session expired, redirecting to summary:', sessionIdToComplete);

                    // Get session info before closing
                    const { data: sessionData } = await supabase
                        .from('attendance_sessions')
                        .select('class_id')
                        .eq('id', sessionIdToComplete)
                        .single();

                    // Close the session if not already closed
                    const { error: updateError } = await supabase
                        .from('attendance_sessions')
                        .update({
                            is_active: false,
                            ended_at: new Date().toISOString()
                        })
                        .eq('id', sessionIdToComplete)
                        .eq('is_active', true);

                    if (updateError) {
                        console.error('[Dashboard] Error updating session:', updateError);
                    }

                    // Mark all students who didn't attend as absent
                    if (sessionData?.class_id) {
                        const absentCount = await AttendanceApi.markAbsentStudents(
                            sessionIdToComplete,
                            sessionData.class_id
                        );
                        console.log(`[Dashboard] Marked ${absentCount} students as absent`);
                    }

                    // Small delay for UI to update
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Clear the expired session flag
                    clearExpiredSession();

                    // Redirect to summary
                    animateNav(() => {
                        setCompletedSessionId(sessionIdToComplete);
                        setShowSummary(true);
                        // Close any other screens
                        setShowTakeAttendance(false);
                        setShowMonitor(false);
                        setShowSettings(false);
                        setShowMyCourses(false);
                        setShowSchedule(false);
                        setShowStudentList(false);
                        setShowHistory(false);
                    });
                } catch (error) {
                    console.error('[Dashboard] Error handling session expiry:', error);
                }
            };

            void handleExpiry();
        }
    }, [sessionExpired, showSummary, clearExpiredSession]);

    const onRefresh = () => {
        initializeDashboard(true);
    };

    // If an active session is detected, offer to go to Live Session screen
    useEffect(() => {
        if (activeSession && !showTakeAttendance && !showSettings && !showStudentList && !showMyCourses && !showSchedule) {
            // We could auto-navigate, but for now we'll just let the UI handle it via a banner or similar
            // Actually, the user asked for redirect after creation, but also "live" session visibility.
        }
    }, [activeSession]);

    if (selectedStudentId) {
        return (
            <InstructorStudentDetailsScreen
                studentId={selectedStudentId}
                onBack={() => animateNav(() => setSelectedStudentId(null))}
            />
        );
    }

    if (showSettings) {
        return (
            <InstructorSettingsScreen
                onBack={() => animateNav(() => setShowSettings(false))}
                onLogout={() => { }}
            />
        );
    }

    if (showStudentList) {
        return (
            <StudentListScreen
                onBack={() => animateNav(() => setShowStudentList(false))}
                onSelectStudent={(student) => animateNav(() => setSelectedStudentId(student.id))}
            />
        );
    }
    if (showMyCourses) {
        return <InstructorCoursesScreen onBack={() => animateNav(() => setShowMyCourses(false))} />;
    }

    if (showSchedule) {
        return <InstructorScheduleScreen onBack={() => animateNav(() => setShowSchedule(false))} />;
    }

    if (showHistory) {
        return (
            <InstructorAttendanceHistoryScreen
                onBack={() => animateNav(() => setShowHistory(false))}
                onViewSummary={(sessionId) => animateNav(() => {
                    setShowHistory(false);
                    setCompletedSessionId(sessionId);
                    setShowSummary(true);
                })}
            />
        );
    }

    if (showTakeAttendance) {
        return (
            <TakeAttendanceScreen
                onBack={() => animateNav(() => setShowTakeAttendance(false))}
                onStartManual={(courseId) => {
                    // TODO: Navigate to manual capture screen
                    console.log('Start manual attendance for course:', courseId);
                }}
                onStartAutomatic={async (courseId, duration) => {
                    // Call the backend API to start the session
                    const { AttendanceApi } = await import('../services/attendance-api');
                    const result = await AttendanceApi.startSession(courseId, duration);
                    if (result.success) {
                        console.log('Session started:', result.session_id);
                        // Show monitor screen
                        animateNav(() => {
                            setShowTakeAttendance(false);
                            setShowMonitor(true);
                        });
                        initializeDashboard(true);
                    } else {
                        console.error('Failed to start session:', result.error);
                    }
                    return result;
                }}
            />
        );
    }

    if (showSummary && completedSessionId) {
        return (
            <AttendanceSummaryScreen
                sessionId={completedSessionId}
                onContinue={() => animateNav(() => {
                    setShowSummary(false);
                    setCompletedSessionId(null);
                })}
                onTakeAnother={() => animateNav(() => {
                    setShowSummary(false);
                    setCompletedSessionId(null);
                    setShowTakeAttendance(true);
                })}
            />
        );
    }

    if (showMonitor) {
        // Find the session to monitor (selected one or first available)
        const sessionToMonitor = selectedSessionForMonitor
            ? activeSessions.find(s => s.id === selectedSessionForMonitor)
            : activeSession;

        if (sessionToMonitor) {
            return (
                <AttendanceMonitorScreen
                    sessionId={sessionToMonitor.id}
                    courseName={sessionToMonitor.course_title || 'Unknown Course'}
                    courseCode={sessionToMonitor.course_code || 'N/A'}
                    duration={sessionToMonitor.duration_minutes}
                    expiresAt={sessionToMonitor.expires_at}
                    onBack={() => animateNav(() => {
                        setShowMonitor(false);
                        setSelectedSessionForMonitor(null);
                    })}
                    onSessionExpired={(sessionId) => {
                        animateNav(() => {
                            setShowMonitor(false);
                            setSelectedSessionForMonitor(null);
                            setCompletedSessionId(sessionId);
                            setShowSummary(true);
                        });
                    }}
                />
            );
        }
    }

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const displayName = userProfile?.full_name || 'Instructor';

    const menuItems: Array<{
        id: string;
        icon: string;
        label: string;
        onPress: () => void;
        color?: 'frozenLake' | 'inkBlack' | 'yellowGreen' | null;
    }> = [
            { id: '1', icon: 'scan-outline', label: 'Take Attendance', onPress: () => animateNav(() => setShowTakeAttendance(true)), color: 'frozenLake' },
            { id: '2', icon: 'bar-chart-outline', label: 'Reports', onPress: () => { }, color: 'inkBlack' },
            { id: '3', icon: 'people-outline', label: 'Student List', onPress: () => animateNav(() => setShowStudentList(true)), color: 'frozenLake' },
            { id: '4', icon: 'library-outline', label: 'My Courses', onPress: () => animateNav(() => setShowMyCourses(true)) },
            { id: '5', icon: 'time-outline', label: 'History', onPress: () => animateNav(() => setShowHistory(true)), color: 'frozenLake' },
            { id: '7', icon: 'calendar-outline', label: 'Schedule', onPress: () => animateNav(() => setShowSchedule(true)), color: 'inkBlack' },
            { id: '6', icon: 'settings-outline', label: 'Settings', onPress: () => animateNav(() => setShowSettings(true)) },
            { id: '9', icon: 'help-circle-outline', label: 'Support', onPress: () => { }, color: 'frozenLake' },
        ];


    // Calculate button size based on current screen width
    const SCREEN_PADDING = layout.spacing.xl;
    const BUTTON_SIZE = (SCREEN_WIDTH - (SCREEN_PADDING * 2) - (GRID_GAP * 2)) / 3;
    const iconSize = 28;

    const renderMenuItem = (item: typeof menuItems[0]) => {
        const getColorPalette = (colorName: string | null | undefined) => {
            if (!colorName) return null;
            return colorPalette[colorName as keyof typeof colorPalette];
        };

        const itemColor = getColorPalette(item.color ?? null);
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
                        minHeight: 100,
                    }
                ]}
                onPress={item.onPress}
                activeOpacity={0.8}
            >
                <View style={styles.iconContainer}>
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

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.black }]}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={[colors.primary]}
                    tintColor={colors.white}
                />
            }
        >
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
                    <View style={styles.headerLeft}>
                        <View style={styles.greetingRow}>
                            <Text style={[styles.greeting, { color: colors.white }]}>
                                {getGreeting()}
                            </Text>
                        </View>
                        {loading ? (
                            <View style={{
                                width: 180,
                                height: 32,
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                borderRadius: 8,
                                marginTop: 4
                            }} />
                        ) : (
                            <Text style={[styles.name, { color: colors.white }]} numberOfLines={1}>
                                {displayName}
                            </Text>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            style={{
                                width: 40, height: 40,
                                justifyContent: 'center', alignItems: 'center',
                                backgroundColor: 'rgba(255,255,255,0.15)',
                                borderRadius: 12
                            }}
                            onPress={() => animateNav(() => setShowSettings(true))}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="settings-outline" size={20} color={colors.white} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.notificationButton}
                            onPress={() => onNavigateToNotifications?.()}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="notifications-outline"
                                size={24}
                                color={colors.white}
                            />
                            {notificationCount > 0 && (
                                <View style={[styles.notificationBadge, { backgroundColor: '#EF4444', borderColor: isDark ? colorPalette.grey[900] : colors.primary }]}>
                                    <Text style={[styles.badgeText, { color: colors.white }]}>{notificationCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Stats Section */}
                {loading ? (
                    <View style={styles.headerStatsPlaceholder}>
                        <View style={[styles.placeholderLine, { width: '80%' }]} />
                        <View style={[styles.placeholderLine, { width: '60%' }]} />
                    </View>
                ) : (
                    <View style={styles.headerStats}>
                        <View style={styles.headerStatItem}>
                            <View style={[styles.headerStatIcon, {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            }]}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={28}
                                    color={colors.white}
                                />
                            </View>
                            <Text style={[styles.headerStatValue, { color: colors.white }]}>
                                {stats.todayClasses}
                            </Text>
                            <Text style={[styles.headerStatLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                                Classes Today
                            </Text>
                        </View>

                        <View style={styles.headerStatItem}>
                            <View style={[styles.headerStatIcon, {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            }]}>
                                <Ionicons
                                    name="people-outline"
                                    size={28}
                                    color={colors.white}
                                />
                            </View>
                            <Text style={[styles.headerStatValue, { color: colors.white }]}>
                                {stats.totalStudents}
                            </Text>
                            <Text style={[styles.headerStatLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                                Total Students
                            </Text>
                        </View>

                        <View style={styles.headerStatItem}>
                            <View style={[styles.headerStatIcon, {
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                            }]}>
                                <Ionicons
                                    name="library-outline"
                                    size={28}
                                    color={colors.white}
                                />
                            </View>
                            <Text style={[styles.headerStatValue, { color: colors.white }]}>
                                {stats.activeCourses}
                            </Text>
                            <Text style={[styles.headerStatLabel, { color: 'rgba(255, 255, 255, 0.7)' }]}>
                                Courses
                            </Text>
                        </View>
                    </View>
                )}
            </View>


            {/* Active Session Banners (Realtime subscription - supports multiple) */}
            {activeSessions.length > 0 && (
                <View style={styles.activeSessionsContainer}>
                    {activeSessions.map((session, index) => {
                        const remaining = timeRemainingMap[session.id] || 0;
                        if (remaining <= 0) return null;

                        return (
                            <TouchableOpacity
                                key={session.id}
                                style={[
                                    styles.activeSessionBanner,
                                    {
                                        backgroundColor: index === 0
                                            ? colorPalette.frozenLake[600]
                                            : colorPalette.frozenLake[500],
                                        marginTop: index > 0 ? layout.spacing.sm : 0,
                                    }
                                ]}
                                onPress={() => {
                                    setSelectedSessionForMonitor(session.id);
                                    animateNav(() => setShowMonitor(true));
                                }}
                                activeOpacity={0.9}
                            >
                                <View style={styles.activeSessionContent}>
                                    <View style={styles.activeSessionInfo}>
                                        <View style={styles.liveIndicator}>
                                            <Ionicons name="radio" size={16} color="#fff" />
                                        </View>
                                        <View style={styles.activeSessionText}>
                                            <Text style={styles.activeSessionTitle}>
                                                {activeSessions.length > 1 ? `Session ${index + 1}` : 'Session Active'} - Tap to Monitor
                                            </Text>
                                            <Text style={styles.activeSessionCourse}>
                                                {session.course_code} - {session.course_title}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.activeSessionTimer}>
                                        <Text style={styles.timerText}>{formatTimeRemaining(session.id)}</Text>
                                        <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {/* Content Section */}
            <View style={[
                styles.contentSection,
                {
                    backgroundColor: colors.white,
                    paddingBottom: Math.max(insets.bottom, layout.spacing.xl),
                    paddingHorizontal: layout.spacing.xl,
                    paddingTop: layout.spacing.xxl * 2,
                    minHeight: layout.window.height * 0.6
                }
            ]}>
                {/* Quick Actions */}
                <Text style={[styles.sectionTitle, {
                    color: colors.text.primary,
                    marginBottom: layout.spacing.md,
                }]}>Management</Text>

                <View style={styles.gridContainer}>
                    {menuItems.map((item) => renderMenuItem(item))}
                </View>

                {/* Recent Activity */}
                <Text style={[styles.sectionTitle, {
                    color: colors.text.primary,
                    marginTop: layout.spacing.xl,
                    marginBottom: layout.spacing.md,
                }]}>Recent Sessions</Text>

                <View style={styles.historyList}>
                    {loading ? (
                        <View style={[styles.historyItem, {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                            paddingVertical: layout.spacing.xl,
                            alignItems: 'center'
                        }]}>
                            <Text style={{ color: colors.text.secondary }}>Loading activity...</Text>
                        </View>
                    ) : recentSessions.length === 0 ? (
                        <View style={[styles.historyItem, {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                            paddingVertical: layout.spacing.xl,
                            alignItems: 'center'
                        }]}>
                            <Text style={{ color: colors.text.secondary }}>No recent sessions found</Text>
                        </View>
                    ) : (
                        recentSessions.map(session => (
                            <View key={session.id} style={[styles.historyItem, {
                                backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                            }]}>
                                <View style={styles.historyLeft}>
                                    <View style={[styles.historyIconContainer, {
                                        backgroundColor: session.is_active
                                            ? (isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100])
                                            : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                    }]}>
                                        <Ionicons
                                            name={session.is_active ? 'radio' : 'checkmark-circle-outline'}
                                            size={20}
                                            color={session.is_active
                                                ? (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600])
                                                : colors.text.secondary}
                                        />
                                    </View>
                                    <View style={styles.historyInfo}>
                                        <Text style={[styles.historyCourse, {
                                            color: colors.text.primary,
                                        }]}>{session.class_title}</Text>
                                        <Text style={[styles.historyDate, {
                                            color: colors.text.secondary,
                                        }]}>{formatDate(session.started_at)}</Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    {
                                        backgroundColor: session.is_active
                                            ? (isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100])
                                            : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                    }
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        {
                                            color: session.is_active
                                                ? (isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600])
                                                : colors.text.secondary,
                                        }
                                    ]}>
                                        {session.is_active ? 'LIVE' : 'ENDED'}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </ScrollView >
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: layout.spacing.md,
    },
    headerLeft: {
        flex: 1,
    },
    greeting: {
        fontSize: 16,
        fontFamily: 'Montserrat_300Light',
        marginBottom: 4,
    },
    name: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        flexShrink: 1,
    },
    headerStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: layout.spacing.xl,
        paddingBottom: layout.spacing.lg,
    },
    headerStatItem: {
        alignItems: 'center',
        flex: 1,
    },
    headerStatIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    headerStatValue: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xs,
    },
    headerStatLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
    },
    contentSection: {
        flex: 1,
        marginTop: -35,
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        overflow: 'hidden',
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
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
        paddingVertical: layout.spacing.md,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.sm,
        height: 36,
    },
    menuButtonText: {
        fontSize: 11,
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
        fontSize: 14,
    },
    historyDate: {
        marginTop: 2,
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: layout.borderRadius.round,
    },
    statusText: {
        fontSize: 10,
        fontFamily: 'Montserrat_600SemiBold',
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerStatsPlaceholder: {
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: layout.spacing.xl,
        gap: layout.spacing.sm,
    },
    placeholderLine: {
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
    },
    activeSessionsContainer: {
        marginHorizontal: layout.spacing.xl,
        marginTop: -layout.spacing.lg,
        marginBottom: layout.spacing.md,
        gap: layout.spacing.sm,
    },
    activeSessionBanner: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    liveIndicator: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeSessionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: layout.spacing.md,
    },
    activeSessionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: layout.spacing.sm,
    },
    activeSessionText: {
        flex: 1,
    },
    activeSessionTitle: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 13,
        color: '#fff',
    },
    activeSessionCourse: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
    },
    activeSessionTimer: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: 16,
        color: '#fff',
    },
});

