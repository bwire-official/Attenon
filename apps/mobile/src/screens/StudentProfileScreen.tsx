import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import type { Profile } from '../lib/supabase';

interface StudentProfileScreenProps {
    onBack?: () => void;
}

interface ProfileInfoItem {
    label: string;
    value: string | null;
    icon: string;
    color?: 'frozenLake' | 'inkBlack' | 'yellowGreen';
}

export const StudentProfileScreen = ({ onBack }: StudentProfileScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const userProfile = await getCurrentUser();
            setProfile(userProfile);
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.headerSection, {
                    backgroundColor: colors.black,
                    paddingTop: insets.top + layout.spacing.md,
                }]}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBack}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: colors.white }]}>Profile</Text>
                        <View style={styles.headerRight} />
                    </View>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

    const profileInfo: ProfileInfoItem[] = [
        {
            label: 'Full Name',
            value: profile?.full_name || 'Not set',
            icon: 'person-outline',
            color: 'frozenLake',
        },
        {
            label: 'Email',
            value: profile?.email || 'Not set',
            icon: 'mail-outline',
            color: 'inkBlack',
        },
        {
            label: 'Registration Number',
            value: profile?.reg_number || 'Not set',
            icon: 'id-card-outline',
            color: 'yellowGreen',
        },
        {
            label: 'Level',
            value: profile?.level || 'Not set',
            icon: 'school-outline',
            color: 'frozenLake',
        },
        {
            label: 'Department',
            value: profile?.department || 'Not set',
            icon: 'business-outline',
            color: 'inkBlack',
        },
        {
            label: 'Faculty',
            value: profile?.faculty || 'Not set',
            icon: 'library-outline',
            color: 'yellowGreen',
        },
        {
            label: 'Role',
            value: profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Not set',
            icon: 'person-circle-outline',
            color: 'frozenLake',
        },
        {
            label: 'Face Verification',
            value: profile?.is_face_registered ? 'Verified' : 'Not Verified',
            icon: 'scan-outline',
            color: 'yellowGreen',
        },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background, flex: 1 }]}>
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
                        style={styles.backButton}
                        onPress={onBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Profile</Text>
                    <View style={styles.headerRight} />
                </View>
            </View>

            {/* Content Section */}
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
                    bounces={true}
                >
                    {/* Avatar Section */}
                    <View style={[styles.avatarSection, {
                        backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                    }]}>
                        <View style={[styles.avatarContainer, {
                            backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100],
                        }]}>
                            <Ionicons
                                name="person"
                                size={64}
                                color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]}
                            />
                        </View>
                        <Text style={[styles.profileName, { color: colors.text.primary }]}>
                            {profile?.full_name || 'Student'}
                        </Text>
                        <Text style={[styles.profileEmail, { color: colors.text.secondary }]}>
                            {profile?.email || 'No email available'}
                        </Text>
                    </View>


                    {/* Profile Information */}
                    <View style={styles.infoSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                            Personal Information
                        </Text>
                        <View style={[styles.infoCard, {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                        }]}>
                            {profileInfo.map((item, index) => {
                                const itemColor = item.color ? colorPalette[item.color] : null;
                                const hasColor = itemColor !== null;

                                return (
                                    <View key={index}>
                                        <View style={styles.infoItem}>
                                            <View style={[styles.infoIconContainer, {
                                                backgroundColor: hasColor
                                                    ? (isDark ? itemColor[900] : itemColor[100])
                                                    : (isDark ? colorPalette.grey[800] : colorPalette.grey[100]),
                                            }]}>
                                                <Ionicons
                                                    name={item.icon as any}
                                                    size={20}
                                                    color={hasColor
                                                        ? (isDark ? itemColor[300] : itemColor[600])
                                                        : (isDark ? colorPalette.grey[300] : colorPalette.grey[600])
                                                    }
                                                />
                                            </View>
                                            <View style={styles.infoContent}>
                                                <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>
                                                    {item.label}
                                                </Text>
                                                <Text style={[styles.infoValue, {
                                                    color: item.value === 'Verified'
                                                        ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                                        : item.value === 'Not Verified'
                                                            ? '#EF4444'
                                                            : colors.text.primary,
                                                }]}>
                                                    {item.value}
                                                </Text>
                                            </View>
                                        </View>
                                        {index < profileInfo.length - 1 && (
                                            <View style={[styles.infoDivider, {
                                                backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                                            }]} />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Account Status */}
                    <View style={styles.infoSection}>
                        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                            Account Status
                        </Text>
                        <View style={[styles.statusCard, {
                            backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                        }]}>
                            <View style={styles.statusItem}>
                                <View style={[styles.statusIconContainer, {
                                    backgroundColor: profile?.is_face_registered
                                        ? (isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100])
                                        : (isDark ? colorPalette.grey[800] : colorPalette.grey[200]),
                                }]}>
                                    <Ionicons
                                        name={profile?.is_face_registered ? 'checkmark-circle' : 'close-circle'}
                                        size={24}
                                        color={profile?.is_face_registered
                                            ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                            : colors.text.secondary}
                                    />
                                </View>
                                <View style={styles.statusContent}>
                                    <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>
                                        Face Verification
                                    </Text>
                                    <Text style={[styles.statusValue, {
                                        color: profile?.is_face_registered
                                            ? (isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600])
                                            : '#EF4444',
                                    }]}>
                                        {profile?.is_face_registered ? 'Verified' : 'Not Verified'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        minHeight: 400,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xxl * 2,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: layout.spacing.xxl,
        paddingHorizontal: layout.spacing.lg,
        marginBottom: layout.spacing.xl,
        borderRadius: layout.borderRadius.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.md,
    },
    profileName: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.xs,
        textAlign: 'center',
    },
    profileEmail: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        textAlign: 'center',
    },
    infoSection: {
        marginBottom: layout.spacing.xl,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: layout.spacing.md,
    },
    infoCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: layout.spacing.md,
    },
    infoIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        marginBottom: layout.spacing.xs / 2,
    },
    infoValue: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    infoDivider: {
        height: 1,
        marginLeft: 56,
    },
    statusCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    statusContent: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        marginBottom: layout.spacing.xs / 2,
    },
    statusValue: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
    },
    errorContainer: {
        padding: layout.spacing.xl,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        textAlign: 'center',
    },
});
