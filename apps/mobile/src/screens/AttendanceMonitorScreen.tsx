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
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { supabase } from '../lib/supabase';
import { CustomAlert } from '../components/CustomAlert';

interface AttendanceMonitorScreenProps {
    sessionId: string;
    courseName: string;
    courseCode: string;
    duration: number;
    expiresAt: string;
    onBack: () => void;
    onSessionExpired?: (sessionId: string) => void;
}

interface EnrolledStudent {
    id: string;
    email: string;
    full_name: string;
    reg_number: string;
    marked: boolean;
    marked_at?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

export const AttendanceMonitorScreen = ({
    sessionId,
    courseName,
    courseCode,
    duration,
    expiresAt,
    onBack,
    onSessionExpired,
}: AttendanceMonitorScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [students, setStudents] = useState<EnrolledStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [markingStudent, setMarkingStudent] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        icon?: string;
        iconColor?: string;
        actions: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
    }>({
        visible: false,
        title: '',
        message: '',
        actions: [],
    });

    const showAlert = (title: string, message: string, actions: any[], icon?: string, iconColor?: string) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            actions,
            icon,
            iconColor,
        });
    };

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });
        return () => backHandler.remove();
    }, [onBack]);

    useEffect(() => {
        fetchStudents({ showSpinner: true });

        // Subscribe to attendance logs in realtime
        const channel = supabase
            .channel('attendance-monitor')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'attendance_logs',
                    filter: `session_id=eq.${sessionId}`,
                },
                () => {
                    // Refresh student list when new attendance is marked (no big reload spinner)
                    fetchStudents({ showSpinner: false });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    useEffect(() => {
        // Update countdown timer
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const expiry = new Date(expiresAt).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeRemaining('Expired');
                clearInterval(interval);
            } else {
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    // Session expiry is now handled globally in InstructorDashboard
    // No need for local handling here

    const fetchStudents = async (options?: { isRefresh?: boolean; showSpinner?: boolean }) => {
        const { isRefresh = false, showSpinner = true } = options || {};
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (showSpinner) {
                setLoading(true);
            }

            // Get class_id from session
            const { data: sessionData } = await supabase
                .from('attendance_sessions')
                .select('class_id')
                .eq('id', sessionId)
                .single();

            if (!sessionData) throw new Error('Session not found');

            // Get all enrolled students
            const { data: enrollments } = await supabase
                .from('enrollments')
                .select(`
                    student_id,
                    profiles!enrollments_student_id_fkey (
                        id,
                        email,
                        full_name,
                        reg_number
                    )
                `)
                .eq('class_id', sessionData.class_id);

            // Get attendance logs for this session
            const { data: logs } = await supabase
                .from('attendance_logs')
                .select('student_id, timestamp')
                .eq('session_id', sessionId);

            // Merge data
            const studentList: EnrolledStudent[] = (enrollments || []).map((enrollment: any) => {
                const log = logs?.find(l => l.student_id === enrollment.profiles.id);
                return {
                    id: enrollment.profiles.id,
                    email: enrollment.profiles.email,
                    full_name: enrollment.profiles.full_name,
                    reg_number: enrollment.profiles.reg_number,
                    marked: !!log,
                    marked_at: log?.timestamp,
                };
            });

            // Sort: unmarked first, then by name
            studentList.sort((a, b) => {
                if (a.marked === b.marked) {
                    return a.full_name.localeCompare(b.full_name);
                }
                return a.marked ? 1 : -1;
            });

            setStudents(studentList);
        } catch (error) {
            console.error('Error fetching students:', error);
            showAlert(
                'Error',
                'Failed to load student list.',
                [{ text: 'OK', style: 'default' }],
                'alert-circle-outline',
                '#EF4444'
            );
        } finally {
            if (showSpinner) {
                setLoading(false);
            }
            if (isRefresh) {
                setRefreshing(false);
            }
        }
    };

    const handleManualMark = async (studentId: string, studentName: string) => {
        showAlert(
            'Manual Mark',
            `How do you want to mark ${studentName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Present',
                    style: 'default',
                    onPress: async () => {
                        try {
                            setMarkingStudent(studentId);

                            const { data: sessionData } = await supabase
                                .from('attendance_sessions')
                                .select('class_id')
                                .eq('id', sessionId)
                                .single();

                            if (!sessionData) {
                                throw new Error('Session not found');
                            }

                            const { error } = await supabase
                                .from('attendance_logs')
                                .insert({
                                    session_id: sessionId,
                                    class_id: sessionData.class_id,
                                    student_id: studentId,
                                    status: 'present',
                                    confidence: 1.0,
                                    timestamp: new Date().toISOString(),
                                });

                            if (error) {
                                throw error;
                            }

                            // Soft refresh without big reload spinner
                            await fetchStudents({ showSpinner: false });

                            showAlert(
                                'Marked Present',
                                `${studentName} has been marked present.`,
                                [{ text: 'OK', style: 'default' }],
                                'checkmark-circle-outline',
                                colorPalette.yellowGreen[500]
                            );
                        } catch (error: any) {
                            console.error('Error marking attendance:', error);
                            showAlert(
                                'Error',
                                error.message || 'Failed to mark attendance.',
                                [{ text: 'OK', style: 'default' }],
                                'alert-circle-outline',
                                '#EF4444'
                            );
                        } finally {
                            setMarkingStudent(null);
                        }
                    },
                },
                {
                    text: 'Mark Absent',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setMarkingStudent(studentId);

                            const { data: sessionData } = await supabase
                                .from('attendance_sessions')
                                .select('class_id')
                                .eq('id', sessionId)
                                .single();

                            if (!sessionData) {
                                throw new Error('Session not found');
                            }

                            const { error } = await supabase
                                .from('attendance_logs')
                                .insert({
                                    session_id: sessionId,
                                    class_id: sessionData.class_id,
                                    student_id: studentId,
                                    status: 'absent',
                                    confidence: 0.0,
                                    timestamp: new Date().toISOString(),
                                });

                            if (error) {
                                throw error;
                            }

                            // Soft refresh without big reload spinner
                            await fetchStudents({ showSpinner: false });

                            showAlert(
                                'Marked Absent',
                                `${studentName} has been marked absent.`,
                                [{ text: 'OK', style: 'default' }],
                                'close-circle-outline',
                                '#EF4444'
                            );
                        } catch (error: any) {
                            console.error('Error marking absence:', error);
                            showAlert(
                                'Error',
                                error.message || 'Failed to mark absence.',
                                [{ text: 'OK', style: 'default' }],
                                'alert-circle-outline',
                                '#EF4444'
                            );
                        } finally {
                            setMarkingStudent(null);
                        }
                    },
                },
            ],
            'person-circle-outline',
            colorPalette.frozenLake[500]
        );
    };

    const stats = {
        total: students.length,
        marked: students.filter(s => s.marked).length,
        pending: students.filter(s => !s.marked).length,
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                        onRefresh={() => fetchStudents({ isRefresh: true, showSpinner: false })}
                        tintColor={colorPalette.frozenLake[500]}
                        colors={[colorPalette.frozenLake[500]]}
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
                    {/* Session Info */}
                    <View style={[styles.sessionInfoCard, { backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.frozenLake[50] }]}>
                        <View style={styles.sessionHeader}>
                            <View style={[styles.codeBadge, { backgroundColor: colorPalette.frozenLake[500] }]}>
                                <Text style={styles.codeBadgeText}>{courseCode}</Text>
                            </View>
                            <Text style={[styles.courseName, { color: colors.text.primary }]}>{courseName}</Text>
                        </View>
                        <View style={styles.sessionStats}>
                            <View style={styles.stat}>
                                <Ionicons name="time" size={18} color={colorPalette.frozenLake[500]} />
                                <Text style={[styles.statValue, { color: colors.text.primary }]}>{timeRemaining}</Text>
                                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>remaining</Text>
                            </View>
                            <View style={[styles.statDivider, { backgroundColor: colors.text.tertiary }]} />
                            <View style={styles.stat}>
                                <Ionicons name="timer-outline" size={18} color="#3B82F6" />
                                <Text style={[styles.statValue, { color: colors.text.primary }]}>{duration}</Text>
                                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>minutes</Text>
                            </View>
                        </View>
                    </View>

                    {/* Stats Summary */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statsCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                            <Text style={[styles.statsValue, { color: colorPalette.frozenLake[500] }]}>{stats.marked}</Text>
                            <Text style={[styles.statsLabel, { color: colors.text.secondary }]}>Present</Text>
                        </View>
                        <View style={[styles.statsCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                            <Text style={[styles.statsValue, { color: '#F59E0B' }]}>{stats.pending}</Text>
                            <Text style={[styles.statsLabel, { color: colors.text.secondary }]}>Pending</Text>
                        </View>
                        <View style={[styles.statsCard, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white }]}>
                            <Text style={[styles.statsValue, { color: colors.text.primary }]}>{stats.total}</Text>
                            <Text style={[styles.statsLabel, { color: colors.text.secondary }]}>Total</Text>
                        </View>
                    </View>

                    {/* Students List */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Students</Text>
                        <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
                            Tap unmarked students to mark them present
                        </Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colorPalette.frozenLake[500]} />
                            <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading students...</Text>
                        </View>
                    ) : students.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
                            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Students Enrolled</Text>
                            <Text style={[styles.emptyDescription, { color: colors.text.secondary }]}>
                                This course has no enrolled students yet.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.studentsList}>
                            {students.map((student) => (
                                <TouchableOpacity
                                    key={student.id}
                                    style={[
                                        styles.studentCard,
                                        {
                                            backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                            borderLeftColor: student.marked ? colorPalette.frozenLake[500] : '#EF4444',
                                            opacity: markingStudent === student.id ? 0.6 : 1,
                                        }
                                    ]}
                                    onPress={() => !student.marked && handleManualMark(student.id, student.full_name)}
                                    disabled={student.marked || markingStudent === student.id}
                                    activeOpacity={student.marked ? 1 : 0.7}
                                >
                                    <View style={styles.studentInfo}>
                                        <View style={styles.studentHeader}>
                                            <Text style={[styles.studentName, { color: colors.text.primary }]} numberOfLines={1}>
                                                {student.full_name}
                                            </Text>
                                            {student.marked ? (
                                                <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                                    <Text style={[styles.statusText, { color: '#047857' }]}>Present</Text>
                                                </View>
                                            ) : (
                                                <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                                                    <Ionicons name="time" size={14} color="#EF4444" />
                                                    <Text style={[styles.statusText, { color: '#DC2626' }]}>Pending</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.studentDetails}>
                                            <Text style={[styles.studentEmail, { color: colors.text.secondary }]} numberOfLines={1}>
                                                {student.reg_number || student.email}
                                            </Text>
                                            {student.marked_at && (
                                                <Text style={[styles.markedTime, { color: colors.text.tertiary }]}>
                                                    Marked at {new Date(student.marked_at).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {markingStudent === student.id ? (
                                        <ActivityIndicator size="small" color={colorPalette.frozenLake[500]} />
                                    ) : !student.marked ? (
                                        <Ionicons name="create-outline" size={20} color={colors.text.tertiary} />
                                    ) : (
                                        <View style={{ width: 20 }} />
                                    )}
                                </TouchableOpacity>
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
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Attendance Monitor</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                actions={alertConfig.actions}
                icon={alertConfig.icon}
                iconColor={alertConfig.iconColor}
                onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
            />
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
    sessionInfoCard: {
        padding: layout.spacing.md,
        borderRadius: 16,
        marginBottom: layout.spacing.lg,
    },
    sessionHeader: {
        marginBottom: layout.spacing.sm,
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
    },
    sessionStats: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: layout.spacing.sm,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    statDivider: {
        width: 1,
        height: 20,
        opacity: 0.2,
    },
    statsRow: {
        flexDirection: 'row',
        gap: layout.spacing.sm,
        marginBottom: layout.spacing.lg,
    },
    statsCard: {
        flex: 1,
        padding: layout.spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },
    statsValue: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 2,
    },
    statsLabel: {
        fontSize: 11,
        fontFamily: 'Montserrat_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionHeader: {
        marginBottom: layout.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        fontFamily: 'Montserrat_500Medium',
    },
    loadingContainer: {
        paddingVertical: layout.spacing.xxl,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        marginTop: layout.spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: layout.spacing.xxl * 2,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        marginTop: layout.spacing.lg,
        marginBottom: layout.spacing.sm,
    },
    emptyDescription: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
    },
    studentsList: {
        gap: layout.spacing.sm,
    },
    studentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: 12,
        borderLeftWidth: 4,
    },
    studentInfo: {
        flex: 1,
        marginRight: layout.spacing.sm,
    },
    studentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    studentName: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        flex: 1,
        marginRight: layout.spacing.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontFamily: 'Montserrat_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    studentDetails: {
        gap: 2,
    },
    studentEmail: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    markedTime: {
        fontSize: 11,
        fontFamily: 'Montserrat_500Medium',
    },
});
