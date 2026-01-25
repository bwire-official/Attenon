import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { StudentListScreen } from './StudentListScreen';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

const GRID_GAP = layout.spacing.md;

interface InstructorDashboardProps {
    onNavigateToNotifications?: () => void;
}

export const InstructorDashboard = ({ onNavigateToNotifications }: InstructorDashboardProps) => {
    const [showStudentList, setShowStudentList] = useState(false);
    const { colors, isDark } = useTheme();
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

    const handleStudentListBack = () => {
        setShowStudentList(false);
    };

    if (showStudentList) {
        return <StudentListScreen onBack={handleStudentListBack} />;
    }

    const menuItems: Array<{
        id: string;
        icon: string;
        label: string;
        onPress: () => void;
        color?: 'frozenLake' | 'inkBlack' | 'yellowGreen' | null;
    }> = [
        { id: '1', icon: 'videocam', label: 'Start Class Session', onPress: () => { }, color: 'frozenLake' },
        { id: '2', icon: 'bar-chart', label: 'View Reports', onPress: () => { }, color: 'inkBlack' },
        { id: '3', icon: 'people', label: 'Student List', onPress: () => setShowStudentList(true), color: 'yellowGreen' },
        { id: '4', icon: 'library', label: 'Manage Courses', onPress: () => { } },
        { id: '5', icon: 'time-outline', label: 'Attendance History', onPress: () => { }, color: 'frozenLake' },
        { id: '6', icon: 'settings', label: 'Settings', onPress: () => { } },
        { id: '7', icon: 'calendar', label: 'Schedule', onPress: () => { }, color: 'inkBlack' },
        { id: '8', icon: 'apps', label: 'More', onPress: () => { } },
        { id: '9', icon: 'help-circle', label: 'Help & Support', onPress: () => { }, color: 'yellowGreen' },
    ];
    
    // Responsive breakpoints
    const isSmallScreen = SCREEN_WIDTH < 375;
    const isMediumScreen = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 768;
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

    const renderMenuItem = (item: typeof menuItems[0], index: number) => {
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
                        }]}>Good Afternoon,</Text>
                        <Text style={[styles.name, { 
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(20),
                        }]}>Dr. Smith</Text>
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

                <Text style={[styles.welcomeText, { 
                    color: colors.text.primary,
                    fontSize: getResponsiveFontSize(24),
                    marginTop: getResponsiveSpacing(layout.spacing.sm),
                    marginBottom: getResponsiveSpacing(layout.spacing.lg),
                }]}>What would you like today?</Text>

                {/* Quick Stats - Combined Card */}
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
                                name="calendar-outline" 
                                size={isTablet ? 24 : isSmallScreen ? 18 : 20} 
                                color={isDark ? colorPalette.frozenLake[300] : colorPalette.frozenLake[600]} 
                            />
                        </View>
                        <Text style={[styles.statValue, { 
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(32),
                        }]}>3</Text>
                        <Text style={[styles.statLabel, { 
                            color: colors.text.secondary,
                            fontSize: getResponsiveFontSize(12),
                        }]}>Today's Classes</Text>
                    </View>

                    <View style={[styles.statDivider, { 
                        backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                    }]} />

                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, {
                            backgroundColor: isDark ? colorPalette.inkBlack[900] : colorPalette.inkBlack[100],
                        }]}>
                            <Ionicons 
                                name="people-outline" 
                                size={isTablet ? 24 : isSmallScreen ? 18 : 20} 
                                color={isDark ? colorPalette.inkBlack[300] : colorPalette.inkBlack[600]} 
                            />
                        </View>
                        <Text style={[styles.statValue, { 
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(32),
                        }]}>133</Text>
                        <Text style={[styles.statLabel, { 
                            color: colors.text.secondary,
                            fontSize: getResponsiveFontSize(12),
                        }]}>Total Students</Text>
                    </View>

                    <View style={[styles.statDivider, { 
                        backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200],
                    }]} />

                    <View style={styles.statItem}>
                        <View style={[styles.statIconContainer, {
                            backgroundColor: isDark ? colorPalette.yellowGreen[900] : colorPalette.yellowGreen[100],
                        }]}>
                            <Ionicons 
                                name="library-outline" 
                                size={isTablet ? 24 : isSmallScreen ? 18 : 20} 
                                color={isDark ? colorPalette.yellowGreen[300] : colorPalette.yellowGreen[600]} 
                            />
                        </View>
                        <Text style={[styles.statValue, { 
                            color: colors.text.primary,
                            fontSize: getResponsiveFontSize(32),
                        }]}>5</Text>
                        <Text style={[styles.statLabel, { 
                            color: colors.text.secondary,
                            fontSize: getResponsiveFontSize(12),
                        }]}>Active Courses</Text>
                    </View>
                </View>

                <View style={[styles.gridContainer, {
                    marginTop: getResponsiveSpacing(layout.spacing.sm),
                }]}>
                    {menuItems.map((item, index) => renderMenuItem(item, index))}
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
        fontWeight: 'bold',
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
        fontWeight: 'bold',
    },
    welcomeText: {
        fontWeight: '600',
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
    statIcon: {
        marginBottom: layout.spacing.sm,
    },
    statValue: {
        fontWeight: 'bold',
        marginBottom: layout.spacing.xs / 2,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontWeight: '500',
        textAlign: 'center',
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
        fontWeight: '600',
        textAlign: 'center',
    },
});

