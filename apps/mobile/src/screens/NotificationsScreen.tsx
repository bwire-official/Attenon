import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
    const insets = useSafeAreaInsets();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;

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
                return isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600];
            case 'course':
                return isDark ? colorPalette.inkBlack[300] : colorPalette.inkBlack[600];
            case 'student':
                return isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600];
            case 'system':
                return isDark ? colorPalette.grey[400] : colorPalette.grey[600];
            default:
                return colors.text.primary;
        }
    };

    const getNotificationBg = (type: Notification['type']) => {
        switch (type) {
            case 'attendance':
                return isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100];
            case 'course':
                return isDark ? colorPalette.inkBlack[900] : colorPalette.inkBlack[100];
            case 'student':
                return isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100];
            case 'system':
                return isDark ? colorPalette.grey[800] : colorPalette.grey[200];
            default:
                return isDark ? colorPalette.grey[800] : colorPalette.grey[100];
        }
    };



    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                        onPress={onBack}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={24}
                            color={colors.white}
                        />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>
                        Notifications
                    </Text>
                    <View style={styles.headerRight} />
                </View>
            </View>

            {/* Content Section */}
            <View style={[styles.contentSection, { backgroundColor: colors.white }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >


                    <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                        Recent Updates
                    </Text>

                    {/* Notifications List */}
                    <View style={styles.notificationsList}>
                        {mockNotifications.map((notification) => (
                            <TouchableOpacity
                                key={notification.id}
                                style={[styles.notificationItem, {
                                    backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                    opacity: notification.read ? 0.7 : 1,
                                }]}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.notificationIconWrapper, {
                                    backgroundColor: getNotificationBg(notification.type),
                                }]}>
                                    <Ionicons
                                        name={getNotificationIcon(notification.type) as any}
                                        size={24}
                                        color={getNotificationColor(notification.type)}
                                    />
                                </View>
                                <View style={styles.notificationContent}>
                                    <View style={styles.notificationHeader}>
                                        <Text style={[styles.notificationTitle, {
                                            color: colors.text.primary,
                                            fontFamily: notification.read ? 'Montserrat_500Medium' : 'Montserrat_600SemiBold',
                                        }]} numberOfLines={1}>
                                            {notification.title}
                                        </Text>
                                        <Text style={[styles.notificationTime, {
                                            color: colors.text.tertiary,
                                        }]}>
                                            {notification.time}
                                        </Text>
                                    </View>
                                    <Text style={[styles.notificationMessage, {
                                        color: colors.text.secondary,
                                    }]} numberOfLines={2}>
                                        {notification.message}
                                    </Text>
                                </View>
                                {!notification.read && (
                                    <View style={[styles.unreadDot, {
                                        backgroundColor: colorPalette.yellowGreen[500],
                                    }]} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
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
        fontSize: 20,
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
        paddingTop: layout.spacing.xxl * 2,
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xl * 2,
    },

    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: layout.spacing.md,
    },
    notificationsList: {
        gap: layout.spacing.md,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    notificationIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
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
        marginBottom: 2,
    },
    notificationTitle: {
        fontSize: 14,
        flex: 1,
        marginRight: layout.spacing.sm,
    },
    notificationMessage: {
        fontSize: 12,
        lineHeight: 18,
    },
    notificationTime: {
        fontSize: 10,
        fontFamily: 'Montserrat_400Regular',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: layout.spacing.sm,
    },
});

