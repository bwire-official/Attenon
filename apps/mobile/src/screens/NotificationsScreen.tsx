import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { useNotifications, AppNotification } from '../hooks/useNotifications';
import { getCurrentUser } from '../services/session';

interface NotificationProps {
    onBack?: () => void;
}

export const NotificationsScreen = ({ onBack }: NotificationProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        getCurrentUser().then(profile => {
            if (profile) setUserId(profile.id);
        });
    }, []);

    const { notifications, loading, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications(userId);

    const getNotificationIcon = (type: AppNotification['type']) => {
        switch (type) {
            case 'attendance_session_started':
                return 'radio';
            case 'student_attended':
                return 'checkmark-circle';
            case 'system':
                return 'notifications';
            default:
                return 'notifications';
        }
    };

    const getNotificationColor = (type: AppNotification['type']) => {
        switch (type) {
            case 'attendance_session_started':
                return isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600];
            case 'student_attended':
                return isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600];
            case 'system':
                return isDark ? colorPalette.grey[400] : colorPalette.grey[600];
            default:
                return colors.text.primary;
        }
    };

    const getNotificationBg = (type: AppNotification['type']) => {
        switch (type) {
            case 'attendance_session_started':
                return isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100];
            case 'student_attended':
                return isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100];
            case 'system':
                return isDark ? colorPalette.grey[800] : colorPalette.grey[200];
            default:
                return isDark ? colorPalette.grey[800] : colorPalette.grey[100];
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };



    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
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
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                >
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                            {unreadCount > 0 ? `Unread (${unreadCount})` : 'Notifications'}
                        </Text>
                        {notifications.length > 0 && (
                            <TouchableOpacity onPress={markAllAsRead}>
                                <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all as read</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Notifications List */}
                    <View style={styles.notificationsList}>
                        {loading && notifications.length === 0 ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : notifications.length === 0 ? (
                            <View style={styles.centerContainer}>
                                <Ionicons name="notifications-off-outline" size={48} color={colors.text.tertiary} />
                                <Text style={[styles.emptyText, { color: colors.text.secondary }]}>No notifications yet</Text>
                            </View>
                        ) : (
                            notifications.map((notification) => (
                                <TouchableOpacity
                                    key={notification.id}
                                    style={[styles.notificationItem, {
                                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                        opacity: notification.is_read ? 0.7 : 1,
                                    }]}
                                    activeOpacity={0.7}
                                    onPress={() => markAsRead(notification.id)}
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
                                                fontFamily: notification.is_read ? 'Montserrat_500Medium' : 'Montserrat_600SemiBold',
                                            }]} numberOfLines={1}>
                                                {notification.title}
                                            </Text>
                                            <Text style={[styles.notificationTime, {
                                                color: colors.text.tertiary,
                                            }]}>
                                                {formatTime(notification.created_at)}
                                            </Text>
                                        </View>
                                        <Text style={[styles.notificationMessage, {
                                            color: colors.text.secondary,
                                        }]} numberOfLines={2}>
                                            {notification.message}
                                        </Text>
                                    </View>
                                    {!notification.is_read && (
                                        <View style={[styles.unreadDot, {
                                            backgroundColor: colorPalette.yellowGreen[500],
                                        }]} />
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
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

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
    },
    markAllText: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
    },
    centerContainer: {
        paddingVertical: layout.spacing.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: layout.spacing.md,
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
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

