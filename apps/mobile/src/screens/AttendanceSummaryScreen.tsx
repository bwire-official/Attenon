import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    BackHandler,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { supabase } from '../lib/supabase';

interface AttendanceSummaryScreenProps {
    sessionId: string;
    onContinue: () => void;
    onTakeAnother: () => void;
}

interface SessionSummary {
    courseName: string;
    courseCode: string;
    startedAt: string;
    endedAt: string;
    duration: number;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    percentage: number;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout

export const AttendanceSummaryScreen = ({
    sessionId,
    onContinue,
    onTakeAnother,
}: AttendanceSummaryScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [summary, setSummary] = useState<SessionSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onContinue();
            return true;
        });
        return () => backHandler.remove();
    }, [onContinue]);

    useEffect(() => {
        fetchSummary();
    }, [sessionId]);

    const fetchSummary = async () => {
        let timeoutId: NodeJS.Timeout | null = null;
        try {
            setLoading(true);
            setError(null);
            setTimedOut(false);

            // Create a timeout promise with cleanup
            const timeoutPromise = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), FETCH_TIMEOUT_MS);
            });

            // Create the fetch promise
            const fetchPromise = async () => {
                const { data: session, error: sessionError } = await supabase
                    .from('attendance_sessions')
                    .select(`
                        *,
                        classes (
                            title,
                            course_code
                        )
                    `)
                    .eq('id', sessionId)
                    .single();

                if (sessionError) throw sessionError;
                if (!session) throw new Error('Session not found');

                const { data: logs } = await supabase
                    .from('attendance_logs')
                    .select('status')
                    .eq('session_id', sessionId);

                const { count: totalStudents } = await supabase
                    .from('enrollments')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', session.class_id);

                const presentCount = logs?.filter(l => l.status === 'present').length || 0;
                const absentCount = logs?.filter(l => l.status === 'absent').length || 0;
                const percentage = totalStudents ? Math.round((presentCount / totalStudents) * 100) : 0;

                return {
                    courseName: session.classes?.title || 'Unknown Course',
                    courseCode: session.classes?.course_code || 'N/A',
                    startedAt: session.started_at,
                    endedAt: session.ended_at || new Date().toISOString(),
                    duration: session.duration_minutes,
                    totalStudents: totalStudents || 0,
                    presentCount,
                    absentCount,
                    percentage,
                };
            };

            // Race between fetch and timeout
            const result = await Promise.race([fetchPromise(), timeoutPromise]);
            // Clear timeout on success
            if (timeoutId) clearTimeout(timeoutId);
            setSummary(result);
        } catch (err: any) {
            console.error('Error fetching summary:', err);
            if (err?.message === 'TIMEOUT') {
                setTimedOut(true);
                setError('Request timed out. Please check your connection.');
            } else {
                setError(err?.message || 'Failed to load summary. Please try again.');
            }
        } finally {
            // Always clear the timeout to prevent memory leaks
            if (timeoutId) clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Loading state
    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={colorPalette.frozenLake[500]} />
                    <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading summary...</Text>
                </View>
            </View>
        );
    }

    // Error or timeout state
    if (error || timedOut || !summary) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />
                <View style={styles.centerContent}>
                    <View style={[styles.errorIconBox, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                        <Ionicons
                            name={timedOut ? 'time-outline' : 'cloud-offline-outline'}
                            size={48}
                            color={timedOut ? '#F59E0B' : '#EF4444'}
                        />
                    </View>
                    <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
                        {timedOut ? 'Request Timed Out' : 'Something Went Wrong'}
                    </Text>
                    <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
                        {error || 'Unable to load the session summary.'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colorPalette.frozenLake[500] }]}
                        onPress={fetchSummary}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={20} color="#fff" />
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={onContinue}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.skipButtonText, { color: colors.text.secondary }]}>
                            Back to Dashboard
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Fixed Header Overlay */}
                <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={onContinue} style={styles.backButton}>
                            <Ionicons name="close" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.white }]}>Summary</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Fixed Header Background */}
            <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />

            {/* Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Spacer */}
                <View style={{ height: HEADER_HEIGHT - SHEET_OVERLAP }} />

                {/* White Sheet */}
                <View style={[styles.whiteSheet, {
                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    minHeight: SCREEN_HEIGHT - (HEADER_HEIGHT - SHEET_OVERLAP)
                }]}>
                    {/* Success Icon */}
                    <View style={styles.successIconContainer}>
                        <View style={[styles.successCircle, { backgroundColor: colorPalette.frozenLake[100] }]}>
                            <Ionicons name="checkmark-circle" size={64} color={colorPalette.frozenLake[500]} />
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.text.primary }]}>Session Complete</Text>
                    <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
                        Attendance has been recorded
                    </Text>

                    {/* Course Info */}
                    <View style={[styles.courseCard, { backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.frozenLake[50] }]}>
                        <View style={[styles.codeBadge, { backgroundColor: colorPalette.frozenLake[500] }]}>
                            <Text style={styles.codeBadgeText}>{summary.courseCode}</Text>
                        </View>
                        <Text style={[styles.courseName, { color: colors.text.primary }]}>{summary.courseName}</Text>
                        <View style={styles.timeInfo}>
                            <View style={styles.timeItem}>
                                <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
                                <Text style={[styles.timeText, { color: colors.text.secondary }]}>
                                    {formatDate(summary.startedAt)}
                                </Text>
                            </View>
                            <View style={styles.timeItem}>
                                <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                                <Text style={[styles.timeText, { color: colors.text.secondary }]}>
                                    {formatTime(summary.startedAt)} - {formatTime(summary.endedAt)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                            <Ionicons name="people" size={24} color={colorPalette.frozenLake[500]} />
                            <Text style={[styles.statValue, { color: colors.text.primary }]}>{summary.totalStudents}</Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total Students</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                            <Ionicons name="checkmark-circle" size={24} color={colorPalette.yellowGreen[500]} />
                            <Text style={[styles.statValue, { color: colorPalette.yellowGreen[500] }]}>{summary.presentCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Present</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                            <Text style={[styles.statValue, { color: '#EF4444' }]}>{summary.absentCount}</Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Absent</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                            <Ionicons name="analytics" size={24} color="#3B82F6" />
                            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{summary.percentage}%</Text>
                            <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Attendance Rate</Text>
                        </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: colorPalette.frozenLake[500] }]}
                            onPress={onContinue}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.primaryButtonText}>Back to Dashboard</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.secondaryButton, {
                                backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                borderColor: colorPalette.frozenLake[500],
                            }]}
                            onPress={onTakeAnother}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="add-circle-outline" size={20} color={colorPalette.frozenLake[500]} />
                            <Text style={[styles.secondaryButtonText, { color: colorPalette.frozenLake[500] }]}>
                                Take Another Attendance
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Header Overlay */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onContinue} style={styles.backButton}>
                        <Ionicons name="close" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Summary</Text>
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
        paddingTop: layout.spacing.xl,
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xxl,
    },
    successIconContainer: {
        alignItems: 'center',
        marginBottom: layout.spacing.lg,
    },
    successCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
        marginBottom: layout.spacing.xl,
    },
    courseCard: {
        padding: layout.spacing.md,
        borderRadius: 16,
        marginBottom: layout.spacing.lg,
    },
    codeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: layout.spacing.sm,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 6,
    },
    codeBadgeText: {
        fontSize: 11,
        fontFamily: 'Montserrat_700Bold',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    courseName: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.sm,
    },
    timeInfo: {
        gap: 4,
    },
    timeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeText: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: layout.spacing.sm,
        marginBottom: layout.spacing.xl,
    },
    statCard: {
        width: '48%',
        padding: layout.spacing.md,
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    statValue: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },
    actionsContainer: {
        gap: layout.spacing.md,
        marginTop: 'auto',
    },
    primaryButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        color: '#FFFFFF',
    },
    secondaryButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        marginTop: layout.spacing.md,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: layout.spacing.xl,
    },
    errorIconBox: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    errorTitle: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
        marginBottom: layout.spacing.xl,
        lineHeight: 22,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 28,
        gap: 8,
        marginBottom: layout.spacing.md,
    },
    retryButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        color: '#fff',
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    skipButtonText: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
    },
});
