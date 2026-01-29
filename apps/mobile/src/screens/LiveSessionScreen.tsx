import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { layout } from '../theme/layout';
import { useActiveSession } from '../hooks/useActiveSession';
import { useSessionAttendance } from '../hooks/useSessionAttendance';
import { AttendanceApi } from '../services/attendance-api';

interface LiveSessionScreenProps {
    onBack: () => void;
    instructorId: string;
}

export const LiveSessionScreen = ({ onBack, instructorId }: LiveSessionScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    const { activeSession, formatTimeRemaining, timeRemaining, loading: sessionLoading } = useActiveSession(instructorId);
    const { attendees, loading: attendeesLoading } = useSessionAttendance(activeSession?.id || null);

    const handleEndSession = async () => {
        if (!activeSession) return;
        try {
            await AttendanceApi.endSession(activeSession.id);
            onBack();
        } catch (err) {
            console.error('Failed to end session:', err);
            Alert.alert('Error', 'Failed to end session. It may have already ended.');
        }
    };

    if (sessionLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!activeSession) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, padding: 20, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="stats-chart-outline" size={64} color={colors.text.secondary} />
                <Text style={[styles.noSessionTitle, { color: colors.text.primary }]}>Attendance Monitor</Text>
                <Text style={[styles.noSessionText, { color: colors.text.secondary }]}>
                    No sessions are currently active. Once you start a session from the dashboard, you can monitor student attendance here in real-time.
                </Text>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: colors.primary }]}
                    onPress={onBack}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: isDark ? '#1F2937' : colors.primary }]}>
                <View style={styles.headerTitleRow}>
                    <TouchableOpacity onPress={onBack} style={styles.iconButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.white} />
                    </TouchableOpacity>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.white }]}>Live Session</Text>
                        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                            {activeSession.course_code || 'Attendance'}
                        </Text>
                    </View>
                    <View style={{ width: 40 }} /> {/* Spacer */}
                </View>

                {/* Timer Card */}
                <View style={[styles.timerCard, { backgroundColor: colors.white }]}>
                    <Text style={[styles.timeLabel, { color: colors.text.secondary }]}>Time Remaining</Text>
                    <Text style={[styles.timeValue, { color: timeRemaining < 120 ? '#EF4444' : colors.primary }]}>
                        {formatTimeRemaining()}
                    </Text>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, {
                            backgroundColor: '#E5E7EB',
                            width: '100%'
                        }]}>
                            <View style={[styles.progressFill, {
                                backgroundColor: timeRemaining < 120 ? '#EF4444' : colors.primary,
                                width: `${activeSession.duration_minutes > 0 ? (timeRemaining / (activeSession.duration_minutes * 60)) * 100 : 0}%`
                            }]} />
                        </View>
                    </View>
                </View>
            </View>

            {/* Attendance List */}
            <View style={styles.content}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                        Attendance ({attendees.length})
                    </Text>
                    <View style={styles.liveIndicator}>
                        <View style={styles.pulseDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>

                <ScrollView
                    style={styles.attendeesList}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {attendees.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color={colors.text.secondary} />
                            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
                                Waiting for students to join...
                            </Text>
                        </View>
                    ) : (
                        attendees.map((attendee) => (
                            <View key={attendee.id} style={[styles.attendeeItem, { borderBottomColor: colors.border }]}>
                                <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                                        {attendee.profile?.full_name?.charAt(0) || '?'}
                                    </Text>
                                </View>
                                <View style={styles.attendeeInfo}>
                                    <Text style={[styles.attendeeName, { color: colors.text.primary }]}>
                                        {attendee.profile?.full_name || 'Unknown Student'}
                                    </Text>
                                    <Text style={[styles.attendeeReg, { color: colors.text.secondary }]}>
                                        {attendee.profile?.reg_number || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.attendeeTime}>
                                    <Text style={[styles.timeText, { color: colors.text.secondary }]}>
                                        {new Date(attendee.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                    <View style={styles.statusBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                                        <Text style={styles.statusText}>Present</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>

            {/* Footer Action */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.endButton, { backgroundColor: '#EF4444' }]}
                    onPress={handleEndSession}
                >
                    <Ionicons name="stop-circle-outline" size={24} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.endButtonText}>End Session Early</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 60,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.9,
    },
    timerCard: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        right: 20,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    timeLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
    },
    timeValue: {
        fontSize: 42,
        fontWeight: '800',
        fontVariant: ['tabular-nums'],
    },
    progressContainer: {
        width: '100%',
        marginTop: 12,
    },
    progressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    content: {
        flex: 1,
        marginTop: 60,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 6,
    },
    liveText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EF4444',
    },
    attendeesList: {
        flex: 1,
    },
    attendeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
    },
    attendeeInfo: {
        flex: 1,
    },
    attendeeName: {
        fontSize: 16,
        fontWeight: '600',
    },
    attendeeReg: {
        fontSize: 12,
    },
    attendeeTime: {
        alignItems: 'flex-end',
    },
    timeText: {
        fontSize: 12,
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#22c55e',
        marginLeft: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 15,
        borderTopWidth: 1,
    },
    endButton: {
        flexDirection: 'row',
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    endButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    noSessionTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 20,
    },
    noSessionText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 30,
    },
    backButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    backButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    }
});
