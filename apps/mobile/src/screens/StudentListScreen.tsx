import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getInstructorStudents, InstructorStudent } from '../services/instructor-data';

interface StudentListScreenProps {
    onBack: () => void;
    onSelectStudent: (student: InstructorStudent) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

export const StudentListScreen = ({ onBack, onSelectStudent }: StudentListScreenProps) => {

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            onBack();
            return true;
        });
        return () => backHandler.remove();
    }, [onBack]);
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [students, setStudents] = useState<InstructorStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStudents = async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                const data = await getInstructorStudents(user.id);
                setStudents(data);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStudents();
    };

    const getDeptColor = (dept?: string) => {
        if (!dept) return colorPalette.frozenLake;
        if (dept.includes('Computer')) return colorPalette.frozenLake;
        if (dept.includes('Software')) return colorPalette.yellowGreen;
        if (dept.includes('Cyber')) return colorPalette.inkBlack;
        return colorPalette.frozenLake;
    };

    const stats = useMemo(() => {
        const total = students.length;
        const depts = new Set(students.map(s => s.department).filter(Boolean)).size;
        // Count levels? 
        const levels = new Set(students.map(s => s.level).filter(Boolean)).size;
        return { total, depts, levels };
    }, [students]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* 1. Fixed Black Background */}
            <View style={[styles.headerBackground, { height: HEADER_HEIGHT, backgroundColor: colors.black }]} />

            {/* 2. Scrollable Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.white} // White because it's on black background usually if pulled down? Or use default logic.
                        progressViewOffset={HEADER_HEIGHT} // Start spinner below header? Or standard. 
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

                    {/* Quick Stats Header (Overlapping) */}
                    <View style={styles.statsHeader}>
                        <View style={[styles.iconContainer, { borderColor: isDark ? colorPalette.grey[900] : colors.white }]}>
                            <View style={[styles.mainIconCircle, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[100] }]}>
                                <Ionicons name="people" size={40} color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]} />
                            </View>
                        </View>

                        <Text style={[styles.pageTitle, { color: colors.text.primary }]}>My Students</Text>

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.total}</Text>
                                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.depts}</Text>
                                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Depts</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: colors.text.primary }]}>{stats.levels}</Text>
                                <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Levels</Text>
                            </View>
                        </View>
                    </View>

                    {/* Student List */}
                    <View style={[styles.listContainer, { paddingBottom: insets.bottom + layout.spacing.xl }]}>
                        {loading ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading...</Text>
                            </View>
                        ) : students.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={60} color={colors.text.tertiary} />
                                <Text style={[styles.emptyStateText, { color: colors.text.secondary }]}>No students yet.</Text>
                            </View>
                        ) : (
                            students.map((student) => {
                                const deptColor = getDeptColor(student.department);
                                const accentColor = isDark ? deptColor[300] : deptColor[600];
                                const badgeBg = isDark ? deptColor[900] : deptColor[100];

                                return (
                                    <TouchableOpacity
                                        key={student.id}
                                        style={[styles.studentCard, {
                                            backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                            borderLeftColor: accentColor,
                                        }]}
                                        onPress={() => onSelectStudent(student)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.cardContent}>
                                            <View style={[styles.avatar, { backgroundColor: badgeBg }]}>
                                                <Text style={[styles.avatarText, { color: accentColor }]}>
                                                    {student.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                                                </Text>
                                            </View>

                                            <View style={styles.studentInfo}>
                                                <Text style={[styles.studentName, { color: colors.text.primary }]}>{student.full_name}</Text>
                                                <View style={styles.studentMeta}>
                                                    <View style={[styles.badge, { backgroundColor: isDark ? colorPalette.grey[700] : colorPalette.grey[100] }]}>
                                                        <Text style={[styles.badgeText, { color: colors.text.secondary }]}>
                                                            {student.reg_number || 'N/A'}
                                                        </Text>
                                                    </View>
                                                    {student.department && (
                                                        <>
                                                            <Text style={[styles.bullet, { color: colors.text.tertiary }]}>•</Text>
                                                            <Text style={[styles.deptText, { color: colors.text.secondary }]} numberOfLines={1}>
                                                                {student.department}
                                                            </Text>
                                                        </>
                                                    )}
                                                </View>
                                            </View>

                                            <Ionicons
                                                name="chevron-forward"
                                                size={20}
                                                color={colors.text.tertiary}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* 3. Fixed Header Overlay */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    {/* Title hidden initially, could show on scroll but user wants simplified look */}
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Student List</Text>
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
        overflow: 'visible',
    },
    statsHeader: {
        alignItems: 'center',
        marginTop: -60,
        marginBottom: layout.spacing.xl,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.sm,
    },
    mainIconCircle: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageTitle: {
        fontSize: 22,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.md,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: layout.spacing.xxl,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#E5E7EB',
    },
    listContainer: {
        paddingHorizontal: layout.spacing.xl,
        gap: layout.spacing.md,
    },
    centerContainer: {
        alignItems: 'center',
        paddingVertical: layout.spacing.xl,
    },
    loadingText: {
        marginTop: layout.spacing.md,
        fontFamily: 'Montserrat_500Medium',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        gap: layout.spacing.md,
    },
    emptyStateText: {
        fontFamily: 'Montserrat_500Medium',
        fontSize: 16,
    },
    studentCard: {
        borderRadius: layout.borderRadius.lg,
        padding: layout.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderLeftWidth: 4,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    avatarText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 6,
    },
    studentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'Montserrat_600SemiBold',
    },
    bullet: {
        marginHorizontal: 8,
        fontSize: 10,
    },
    deptText: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        flex: 1,
    },
});
