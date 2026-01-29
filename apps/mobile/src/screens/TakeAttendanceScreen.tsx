import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    BackHandler,
    TextInput,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { getCurrentUser } from '../services/session';
import { getInstructorClasses } from '../services/data';
import type { Class } from '../lib/supabase';

interface TakeAttendanceScreenProps {
    onBack: () => void;
    onStartManual?: (courseId: string) => void;
    onStartAutomatic?: (courseId: string, duration: number) => Promise<{ success: boolean; error?: string }>;
}

type AttendanceMode = 'manual' | 'automatic' | null;
type Step = 'mode' | 'duration' | 'course';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 200;
const SHEET_OVERLAP = 50;

const DURATION_OPTIONS = [
    { label: '5 minutes', value: 5 },
    { label: '10 minutes', value: 10 },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: 'Custom', value: -1 },
];

export const TakeAttendanceScreen = ({ onBack, onStartManual, onStartAutomatic }: TakeAttendanceScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [step, setStep] = useState<Step>('mode');
    const [selectedMode, setSelectedMode] = useState<AttendanceMode>(null);
    const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
    const [customDuration, setCustomDuration] = useState('');
    const [courses, setCourses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Class | null>(null);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });
        return () => backHandler.remove();
    }, [handleBack]);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const user = await getCurrentUser();
            if (user) {
                const data = await getInstructorClasses(user.id);
                setCourses(data);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = React.useCallback(() => {
        if (step === 'course') {
            if (selectedMode === 'automatic') {
                setStep('duration');
            } else {
                setStep('mode');
            }
        } else if (step === 'duration') {
            setStep('mode');
        } else {
            onBack();
        }
    }, [step, selectedMode, onBack]);

    const handleModeSelect = (mode: AttendanceMode) => {
        setSelectedMode(mode);
        if (mode === 'automatic') {
            setStep('duration');
        } else {
            setStep('course');
        }
    };

    const handleDurationSelect = (duration: number) => {
        if (duration === -1) {
            // Custom duration selected
            setSelectedDuration(null);
        } else {
            setSelectedDuration(duration);
        }
    };

    const handleDurationContinue = () => {
        const duration = selectedDuration ?? parseInt(customDuration, 10);
        if (duration && duration > 0) {
            setStep('course');
        }
    };

    const handleCourseSelect = (course: Class) => {
        setSelectedCourse(course);
    };

    const handleStartAttendance = async () => {
        if (!selectedCourse) return;

        if (selectedMode === 'manual') {
            onStartManual?.(selectedCourse.id);
        } else if (selectedMode === 'automatic') {
            const duration = selectedDuration ?? parseInt(customDuration, 10);
            setIsStarting(true);
            try {
                const result = await onStartAutomatic?.(selectedCourse.id, duration);
                if (result && !result.success) {
                    Alert.alert('Error', result.error || 'Failed to start session');
                }
            } catch (error: any) {
                Alert.alert('Error', error?.message || 'Network error');
            } finally {
                setIsStarting(false);
            }
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 'mode':
                return 'Take Attendance';
            case 'duration':
                return 'Set Duration';
            case 'course':
                return 'Select Course';
            default:
                return 'Take Attendance';
        }
    };

    const getStepSubtitle = () => {
        switch (step) {
            case 'mode':
                return 'Choose how you want to take attendance';
            case 'duration':
                return 'How long should students have to mark attendance?';
            case 'course':
                return 'Select the course for this attendance session';
            default:
                return '';
        }
    };

    const renderModeSelection = () => (
        <View style={styles.contentSection}>
            {/* Manual Mode Card */}
            <TouchableOpacity
                style={[
                    styles.modeCard,
                    {
                        backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                        borderColor: selectedMode === 'manual'
                            ? colorPalette.frozenLake[500]
                            : (isDark ? colorPalette.grey[700] : colorPalette.grey[200]),
                        borderWidth: selectedMode === 'manual' ? 2 : 1,
                    }
                ]}
                onPress={() => handleModeSelect('manual')}
                activeOpacity={0.8}
            >
                <View style={[styles.modeIconContainer, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[50] }]}>
                    <Ionicons name="camera" size={20} color={colorPalette.frozenLake[500]} />
                </View>
                <View style={styles.modeInfo}>
                    <Text style={[styles.modeTitle, { color: colors.text.primary }]}>Manual Capture</Text>
                    <Text style={[styles.modeDescription, { color: colors.text.secondary }]}>Capture each student's face yourself</Text>
                </View>
                <View style={[styles.radioOuter, { borderColor: selectedMode === 'manual' ? colorPalette.frozenLake[500] : colorPalette.grey[400] }]}>
                    {selectedMode === 'manual' && <View style={[styles.radioInner, { backgroundColor: colorPalette.frozenLake[500] }]} />}
                </View>
            </TouchableOpacity>

            {/* Automatic Mode Card */}
            <TouchableOpacity
                style={[
                    styles.modeCard,
                    {
                        backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                        borderColor: selectedMode === 'automatic'
                            ? colorPalette.frozenLake[500]
                            : (isDark ? colorPalette.grey[700] : colorPalette.grey[200]),
                        borderWidth: selectedMode === 'automatic' ? 2 : 1,
                    }
                ]}
                onPress={() => handleModeSelect('automatic')}
                activeOpacity={0.8}
            >
                <View style={[styles.modeIconContainer, { backgroundColor: isDark ? '#1E3A5F' : '#E0F2FE' }]}>
                    <Ionicons name="notifications" size={20} color="#0EA5E9" />
                </View>
                <View style={styles.modeInfo}>
                    <Text style={[styles.modeTitle, { color: colors.text.primary }]}>Automatic Prompt</Text>
                    <Text style={[styles.modeDescription, { color: colors.text.secondary }]}>Students mark their own attendance</Text>
                </View>
                <View style={[styles.radioOuter, { borderColor: selectedMode === 'automatic' ? colorPalette.frozenLake[500] : colorPalette.grey[400] }]}>
                    {selectedMode === 'automatic' && <View style={[styles.radioInner, { backgroundColor: colorPalette.frozenLake[500] }]} />}
                </View>
            </TouchableOpacity>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? colorPalette.grey[800] : '#FEF3C7' }]}>
                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                <Text style={[styles.infoText, { color: isDark ? colors.text.secondary : '#92400E' }]}>
                    {selectedMode === 'automatic'
                        ? 'Students who don\'t respond within the time limit will be marked absent automatically.'
                        : 'Select a mode to continue. You can use manual capture for in-person verification.'}
                </Text>
            </View>
        </View>
    );

    const renderDurationSelection = () => (
        <View style={styles.contentSection}>
            <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((option) => (
                    <TouchableOpacity
                        key={option.value}
                        style={[
                            styles.durationCard,
                            {
                                backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                borderColor: selectedDuration === option.value
                                    ? colorPalette.frozenLake[500]
                                    : (isDark ? colorPalette.grey[700] : colorPalette.grey[200]),
                                borderWidth: selectedDuration === option.value ? 2 : 1,
                            }
                        ]}
                        onPress={() => handleDurationSelect(option.value)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.durationCardContent}>
                            {option.value === -1 ? (
                                <Ionicons name="pencil" size={16} color={colorPalette.frozenLake[500]} />
                            ) : (
                                <Text style={[styles.durationValue, { color: colorPalette.frozenLake[500] }]}>{option.value}</Text>
                            )}
                            <Text style={[styles.durationLabel, { color: colors.text.primary }]}>
                                {option.value === -1 ? 'Custom' : 'min'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Custom Duration Input */}
            {selectedDuration === null && (
                <View style={styles.customInputContainer}>
                    <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>Enter custom duration (minutes)</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: isDark ? colorPalette.grey[800] : colors.white, borderColor: isDark ? colorPalette.grey[700] : colorPalette.grey[300] }]}>
                        <TextInput
                            style={[styles.textInput, { color: colors.text.primary }]}
                            value={customDuration}
                            onChangeText={setCustomDuration}
                            placeholder="e.g., 20"
                            placeholderTextColor={colors.text.tertiary}
                            keyboardType="numeric"
                        />
                        <Text style={[styles.inputSuffix, { color: colors.text.secondary }]}>min</Text>
                    </View>
                </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
                style={[
                    styles.continueButton,
                    {
                        backgroundColor: (selectedDuration || parseInt(customDuration, 10) > 0)
                            ? colorPalette.frozenLake[500]
                            : colorPalette.grey[400],
                    }
                ]}
                onPress={handleDurationContinue}
                disabled={!selectedDuration && !parseInt(customDuration, 10)}
                activeOpacity={0.8}
            >
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? colorPalette.grey[800] : '#DBEAFE', marginTop: layout.spacing.lg }]}>
                <Ionicons name="time" size={20} color="#3B82F6" />
                <Text style={[styles.infoText, { color: isDark ? colors.text.secondary : '#1E40AF' }]}>
                    Students will receive a push notification and have this time to mark their attendance using facial recognition.
                </Text>
            </View>
        </View>
    );

    const renderCourseSelection = () => (
        <View style={styles.contentSection}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colorPalette.frozenLake[500]} />
                    <Text style={[styles.loadingText, { color: colors.text.secondary }]}>Loading your courses...</Text>
                </View>
            ) : courses.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="library-outline" size={64} color={colors.text.tertiary} />
                    <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>No Courses Found</Text>
                    <Text style={[styles.emptyDescription, { color: colors.text.secondary }]}>
                        You don't have any courses assigned yet.
                    </Text>
                </View>
            ) : (
                <>
                    {/* Selected Mode Badge */}
                    <View style={[styles.selectedModeBadge, { backgroundColor: isDark ? colorPalette.grey[800] : colorPalette.frozenLake[50] }]}>
                        <Ionicons
                            name={selectedMode === 'manual' ? 'camera' : 'notifications'}
                            size={16}
                            color={colorPalette.frozenLake[500]}
                        />
                        <Text style={[styles.selectedModeText, { color: colorPalette.frozenLake[600] }]}>
                            {selectedMode === 'manual' ? 'Manual Capture' : `Automatic (${selectedDuration ?? customDuration} min)`}
                        </Text>
                    </View>

                    {/* Course List */}
                    <View style={styles.courseList}>
                        {courses.map((course) => (
                            <TouchableOpacity
                                key={course.id}
                                style={[
                                    styles.courseCard,
                                    {
                                        backgroundColor: isDark ? colorPalette.grey[800] : colors.white,
                                        borderLeftColor: selectedCourse?.id === course.id ? colorPalette.frozenLake[500] : colorPalette.frozenLake[300],
                                        borderLeftWidth: 3,
                                    }
                                ]}
                                onPress={() => handleCourseSelect(course)}
                                activeOpacity={0.8}
                            >
                                <View style={styles.courseInfo}>
                                    <View style={[styles.codeBadge, { backgroundColor: isDark ? colorPalette.frozenLake[900] : colorPalette.frozenLake[50] }]}>
                                        <Text style={[styles.courseCode, { color: colorPalette.frozenLake[500] }]}>{course.course_code}</Text>
                                    </View>
                                    <Text style={[styles.courseTitle, { color: colors.text.primary }]} numberOfLines={1}>{course.title}</Text>
                                </View>
                                <View style={[styles.radioOuter, { borderColor: selectedCourse?.id === course.id ? colorPalette.frozenLake[500] : colorPalette.grey[400] }]}>
                                    {selectedCourse?.id === course.id && <View style={[styles.radioInner, { backgroundColor: colorPalette.frozenLake[500] }]} />}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Start Button */}
                    <TouchableOpacity
                        style={[
                            styles.startButton,
                            {
                                backgroundColor: selectedCourse && !isStarting
                                    ? colorPalette.frozenLake[500]
                                    : colorPalette.grey[400],
                            }
                        ]}
                        onPress={handleStartAttendance}
                        disabled={!selectedCourse || isStarting}
                        activeOpacity={0.8}
                    >
                        {isStarting ? (
                            <>
                                <ActivityIndicator size="small" color={colors.white} />
                                <Text style={styles.startButtonText}>
                                    {selectedMode === 'manual' ? 'Starting...' : 'Sending...'}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name={selectedMode === 'manual' ? 'camera' : 'send'} size={22} color={colors.white} />
                                <Text style={styles.startButtonText}>
                                    {selectedMode === 'manual' ? 'Start Capturing' : 'Send Notification'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

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
                    {/* Step Indicator */}
                    <View style={styles.stepIndicator}>
                        <View style={[styles.stepDot, step === 'mode' && styles.stepDotActive, { backgroundColor: step === 'mode' ? colorPalette.frozenLake[500] : colorPalette.grey[300] }]} />
                        {selectedMode === 'automatic' && (
                            <View style={[styles.stepDot, step === 'duration' && styles.stepDotActive, { backgroundColor: step === 'duration' ? colorPalette.frozenLake[500] : (step === 'course' ? colorPalette.frozenLake[500] : colorPalette.grey[300]) }]} />
                        )}
                        <View style={[styles.stepDot, step === 'course' && styles.stepDotActive, { backgroundColor: step === 'course' ? colorPalette.frozenLake[500] : colorPalette.grey[300] }]} />
                    </View>

                    {/* Step Title & Subtitle */}
                    <View style={styles.stepHeader}>
                        <Text style={[styles.stepTitle, { color: colors.text.primary }]}>{getStepTitle()}</Text>
                        <Text style={[styles.stepSubtitle, { color: colors.text.secondary }]}>{getStepSubtitle()}</Text>
                    </View>

                    {/* Step Content */}
                    {step === 'mode' && renderModeSelection()}
                    {step === 'duration' && renderDurationSelection()}
                    {step === 'course' && renderCourseSelection()}
                </View>
            </ScrollView>

            {/* Fixed Header Overlay */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top + layout.spacing.md }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.white }]}>Take Attendance</Text>
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
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: layout.spacing.lg,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stepDotActive: {
        width: 24,
    },
    stepHeader: {
        alignItems: 'center',
        marginBottom: layout.spacing.xl,
    },
    stepTitle: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    stepSubtitle: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
        paddingHorizontal: layout.spacing.lg,
    },
    contentSection: {
        flex: 1,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: 16,
        marginBottom: layout.spacing.sm,
    },
    modeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: layout.spacing.md,
    },
    modeInfo: {
        flex: 1,
        marginRight: layout.spacing.sm,
    },
    modeTitle: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: 2,
    },
    modeDescription: {
        fontSize: 12,
        fontFamily: 'Montserrat_500Medium',
        lineHeight: 16,
    },
    radioOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.lg,
        gap: layout.spacing.sm,
        marginTop: layout.spacing.lg,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'Montserrat_500Medium',
        lineHeight: 18,
    },
    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: layout.spacing.md,
        justifyContent: 'center',
    },
    durationCard: {
        paddingVertical: layout.spacing.sm,
        paddingHorizontal: layout.spacing.md,
        borderRadius: 30,
        minWidth: 80,
        alignItems: 'center',
    },
    durationCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    durationValue: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    durationLabel: {
        fontSize: 12,
        fontFamily: 'Montserrat_600SemiBold',
    },
    customInputContainer: {
        marginBottom: layout.spacing.md,
    },
    inputLabel: {
        fontSize: 13,
        fontFamily: 'Montserrat_600SemiBold',
        marginBottom: layout.spacing.xs,
        textAlign: 'center',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: layout.spacing.lg,
        alignSelf: 'center',
        width: '60%',
        height: 44,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    inputSuffix: {
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
    },
    continueButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: layout.spacing.xl,
        borderRadius: 50,
        gap: layout.spacing.sm,
        alignSelf: 'center',
        minWidth: 160,
    },
    continueButtonText: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: layout.spacing.xxl,
    },
    loadingText: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        marginTop: layout.spacing.md,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: layout.spacing.xxl,
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
    selectedModeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: layout.spacing.md,
        paddingVertical: layout.spacing.sm,
        borderRadius: 20,
        gap: layout.spacing.xs,
        marginBottom: layout.spacing.lg,
    },
    selectedModeText: {
        fontSize: 13,
        fontFamily: 'Montserrat_600SemiBold',
    },
    courseList: {
        gap: layout.spacing.sm,
        marginBottom: layout.spacing.lg,
    },
    courseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: layout.spacing.sm,
        paddingHorizontal: layout.spacing.md,
        borderRadius: 12,
    },
    codeBadge: {
        paddingHorizontal: layout.spacing.sm,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    courseInfo: {
        flex: 1,
        marginRight: layout.spacing.sm,
    },
    courseCode: {
        fontSize: 10,
        fontFamily: 'Montserrat_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    courseTitle: {
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: layout.spacing.xxl,
        borderRadius: 50,
        gap: layout.spacing.sm,
        alignSelf: 'center',
        marginBottom: layout.spacing.xl,
    },
    startButtonText: {
        fontSize: 15,
        fontFamily: 'Montserrat_600SemiBold',
        color: '#FFFFFF',
    },
});
