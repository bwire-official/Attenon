import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface Notification {
    id: string;
    type: 'attendance' | 'course' | 'student' | 'system';
    title: string;
    message: string;
    time: string;
    read: boolean;
    value?: string;
}

const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'attendance',
        title: 'Weekly Attendance Report',
        message: 'Your weekly attendance is 92%, up 4% from last week',
        time: '2 hours ago',
        read: false,
        value: '92%',
    },
    {
        id: '2',
        type: 'course',
        title: 'New Course Assignment',
        message: 'You have been assigned to teach CS101 - Introduction to Programming',
        time: '5 hours ago',
        read: false,
    },
    {
        id: '3',
        type: 'student',
        title: 'Student Registration',
        message: '5 new students registered for your courses today',
        time: '1 day ago',
        read: true,
        value: '5',
    },
    {
        id: '4',
        type: 'attendance',
        title: 'Low Attendance Alert',
        message: 'CS201 has attendance below 75% this week',
        time: '2 days ago',
        read: true,
        value: '75%',
    },
    {
        id: '5',
        type: 'system',
        title: 'System Update',
        message: 'New features available: Enhanced reporting and analytics',
        time: '3 days ago',
        read: true,
    },
];

export const NotificationsScreen = ({ onBack }: { onBack?: () => void }) => {
    const { colors, isDark } = useTheme();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;
    const isSmallScreen = SCREEN_WIDTH < 375;

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'attendance':
                return 'trending-up';
            case 'course':
                return 'library';
            case 'student':
                return 'people';
            case 'system':
                return 'notifications';
            default:
                return 'notifications';
        }
    };

    const getNotificationColor = (type: Notification['type']) => {
        switch (type) {
            case 'attendance':
                return isDark ? colorPalette.grey[100] : colors.text.primary;
            case 'course':
                return isDark ? colorPalette.grey[100] : colors.text.primary;
            case 'student':
                return isDark ? colorPalette.grey[100] : colors.text.primary;
            case 'system':
                return isDark ? colorPalette.grey[100] : colors.text.primary;
            default:
                return colors.text.primary;
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={onBack}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons 
                        name="arrow-back" 
                        size={24} 
                        color={colors.text.primary} 
                    />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Notifications</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Summary */}
                <View style={styles.statsSummary}>
                    <View style={[styles.statBox, { 
                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    }]}>
                        <Ionicons 
                            name="trending-up" 
                            size={isTablet ? 28 : 24} 
                            color={colors.text.primary} 
                        />
                        <Text style={[styles.statNumber, { color: colors.text.primary }]}>92%</Text>
                        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Weekly Attendance</Text>
                    </View>
                    <View style={[styles.statBox, { 
                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    }]}>
                        <Ionicons 
                            name="notifications" 
                            size={isTablet ? 28 : 24} 
                            color={colors.text.primary} 
                        />
                        <Text style={[styles.statNumber, { color: colors.text.primary }]}>3</Text>
                        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Unread</Text>
                    </View>
                    <View style={[styles.statBox, { 
                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    }]}>
                        <Ionicons 
                            name="checkmark-circle" 
                            size={isTablet ? 28 : 24} 
                            color={colors.text.primary} 
                        />
                        <Text style={[styles.statNumber, { color: colors.text.primary }]}>2</Text>
                        <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Read</Text>
                    </View>
                </View>

                {/* Notifications List */}
                <View style={styles.notificationsList}>
                    {mockNotifications.map((notification) => (
                        <TouchableOpacity
                            key={notification.id}
                            style={[styles.notificationItem, {
                                backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                borderLeftColor: notification.read 
                                    ? 'transparent' 
                                    : (isDark ? colorPalette.grey[100] : colors.text.primary),
                            }]}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.notificationIconWrapper, {
                                backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[100],
                            }]}>
                                <Ionicons 
                                    name={getNotificationIcon(notification.type) as any} 
                                    size={isTablet ? 24 : 20} 
                                    color={getNotificationColor(notification.type)} 
                                />
                            </View>
                            <View style={styles.notificationContent}>
                                <View style={styles.notificationHeader}>
                                    <Text style={[styles.notificationTitle, { 
                                        color: colors.text.primary,
                                        fontWeight: notification.read ? '500' : '600',
                                    }]}>
                                        {notification.title}
                                    </Text>
                                    {notification.value && (
                                        <View style={[styles.valueBadge, {
                                            backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                                        }]}>
                                            <Text style={[styles.valueText, { 
                                                color: colors.text.primary,
                                            }]}>
                                                {notification.value}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.notificationMessage, { 
                                    color: colors.text.secondary,
                                }]}>
                                    {notification.message}
                                </Text>
                                <Text style={[styles.notificationTime, { 
                                    color: colors.text.tertiary,
                                }]}>
                                    {notification.time}
                                </Text>
                            </View>
                            {!notification.read && (
                                <View style={[styles.unreadDot, {
                                    backgroundColor: isDark ? colorPalette.grey[100] : colors.text.primary,
                                }]} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: layout.spacing.lg,
        marginTop: layout.spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: layout.spacing.xl * 2,
    },
    statsSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: layout.spacing.xl,
        gap: layout.spacing.sm,
    },
    statBox: {
        flex: 1,
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: layout.spacing.xs,
        marginBottom: layout.spacing.xs / 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
    },
    notificationsList: {
        gap: layout.spacing.md,
    },
    notificationItem: {
        flexDirection: 'row',
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    notificationIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: layout.spacing.xs,
    },
    notificationTitle: {
        fontSize: 15,
        flex: 1,
    },
    valueBadge: {
        paddingHorizontal: layout.spacing.sm,
        paddingVertical: layout.spacing.xs / 2,
        borderRadius: layout.borderRadius.sm,
        marginLeft: layout.spacing.sm,
    },
    valueText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    notificationMessage: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: layout.spacing.xs,
    },
    notificationTime: {
        fontSize: 11,
        fontWeight: '400',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: layout.spacing.sm,
        alignSelf: 'center',
    },
});

