import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { AttendanceApi } from '../services/attendance-api';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { useFaceValidation } from '../hooks/useFaceValidation';
import { Worklets } from 'react-native-worklets-core';

interface StudentSelfAttendanceScreenProps {
    sessionId: string;
    courseName?: string;
    onBack: () => void;
    onComplete: () => void;
}

type AttendanceState = 'camera' | 'verifying' | 'success' | 'error' | 'expired';

export const StudentSelfAttendanceScreen = ({
    sessionId,
    courseName,
    onBack,
    onComplete
}: StudentSelfAttendanceScreenProps) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [state, setState] = useState<AttendanceState>('camera');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // Vision Camera Setup
    const device = useCameraDevice('front');
    const { hasPermission, requestPermission } = useCameraPermission();
    const camera = useRef<Camera>(null);

    // Face Detection Setup
    const { detectFaces } = useFaceDetector({
        performanceMode: 'fast',
        landmarkMode: 'none',
        contourMode: 'none',
        classificationMode: 'all',
        minFaceSize: 0.15,
    });

    // Validation Hook
    const {
        validationState,
        currentInstruction,
        processFaces,
        resetValidation,
        isReadyToCapture,
    } = useFaceValidation({
        enabled: state === 'camera' && !capturedImage && hasPermission && device !== undefined,
    });

    const runProcessFaces = Worklets.createRunOnJS(processFaces);

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        const faces = detectFaces(frame);
        runProcessFaces(faces, frame.width, frame.height);
    }, [detectFaces, runProcessFaces]);

    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (state === 'camera' || state === 'error') {
                onBack();
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, [state]);

    // No auto-redirect - user taps Continue button

    const handleCapture = async () => {
        if (!camera.current || state !== 'camera') return;
        try {
            const photo = await camera.current.takePhoto({
                flash: 'off',
                enableShutterSound: false,
            });
            setCapturedImage(`file://${photo.path}`);
        } catch (err) {
            console.error('Capture error:', err);
            setErrorMessage('Failed to capture image. Please try again.');
            setState('error');
        }
    };

    // Auto-capture when liveness check passes
    useEffect(() => {
        if (isReadyToCapture && state === 'camera' && !capturedImage) {
            handleCapture();
        }
    }, [isReadyToCapture, state, capturedImage]);

    const handleVerify = async () => {
        if (!capturedImage) return;

        setState('verifying');
        setErrorMessage('');

        try {
            const result = await AttendanceApi.markSelfAttendance(sessionId, capturedImage);

            if (result.success) {
                setState('success');
            } else {
                // Check for specific error types
                if (result.error?.includes('expired')) {
                    setState('expired');
                } else if (result.error?.includes('verification failed') || result.error?.includes('Face')) {
                    setErrorMessage(result.error || 'Face verification failed.');
                    setState('error');
                } else {
                    setErrorMessage(result.error || 'An error occurred. Please try again.');
                    setState('error');
                }
            }
        } catch (err: any) {
            console.error('Verification error:', err);
            setErrorMessage('Network error. Please check your connection.');
            setState('error');
        }
    };

    const handleRetry = () => {
        setCapturedImage(null);
        setErrorMessage('');
        setState('camera');
        resetValidation();
    };

    const getBorderColor = () => {
        if (capturedImage) return colorPalette.frozenLake[500];
        switch (validationState) {
            case 'SUCCESS': return colorPalette.frozenLake[500];
            case 'LIVENESS_CHECK': return '#3B82F6';
            case 'QUALITY_CHECK': return '#F59E0B';
            case 'SEARCHING':
            default: return colorPalette.frozenLake[500];
        }
    };

    const getIconForState = () => {
        if (capturedImage) return "checkmark-circle";
        switch (validationState) {
            case 'SUCCESS': return "checkmark-circle";
            case 'LIVENESS_CHECK': return "happy-outline";
            case 'QUALITY_CHECK': return "warning-outline";
            case 'SEARCHING':
            default: return "scan-outline";
        }
    };

    // Success Screen - Pure green color
    if (state === 'success') {
        const successGreen = '#22C55E';
        const successGreenDark = '#16A34A';
        return (
            <View style={[styles.fullScreen, { backgroundColor: successGreen }]}>
                <View style={styles.resultContent}>
                    <View style={styles.successIconCircle}>
                        <Ionicons name="checkmark" size={70} color={successGreen} />
                    </View>
                    <Text style={styles.resultTitle}>Attendance Marked!</Text>
                    <Text style={styles.resultSubtitle}>
                        {courseName
                            ? `Your attendance for ${courseName} has been recorded successfully.`
                            : 'Your attendance has been recorded successfully.'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.resultButton, { backgroundColor: colors.white }]}
                        onPress={onComplete}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.resultButtonText, { color: successGreenDark }]}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color={successGreenDark} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Expired Screen
    if (state === 'expired') {
        return (
            <View style={[styles.fullScreen, { backgroundColor: colorPalette.grey[700] }]}>
                <View style={styles.resultContent}>
                    <Ionicons name="hourglass-outline" size={100} color={colors.white} />
                    <Text style={styles.resultTitle}>Session Expired</Text>
                    <Text style={styles.resultSubtitle}>The attendance window has closed.</Text>
                    <TouchableOpacity
                        style={[styles.resultButton, { backgroundColor: colors.white }]}
                        onPress={onBack}
                    >
                        <Text style={[styles.resultButtonText, { color: colorPalette.grey[700] }]}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Error Screen
    if (state === 'error') {
        return (
            <View style={[styles.fullScreen, { backgroundColor: '#EF4444' }]}>
                <View style={styles.resultContent}>
                    <Ionicons name="close-circle" size={100} color={colors.white} />
                    <Text style={styles.resultTitle}>Verification Failed</Text>
                    <Text style={styles.resultSubtitle}>{errorMessage}</Text>
                    <TouchableOpacity
                        style={[styles.resultButton, { backgroundColor: colors.white }]}
                        onPress={handleRetry}
                    >
                        <Text style={[styles.resultButtonText, { color: '#EF4444' }]}>Try Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onBack}
                    >
                        <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Camera / Verifying Screen
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + layout.spacing.md, backgroundColor: colors.black }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.white }]}>Mark Attendance</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <View style={[styles.content, { backgroundColor: isDark ? colors.background : colors.white }]}>
                {courseName && (
                    <View style={styles.courseInfo}>
                        <Text style={[styles.courseName, { color: colors.text.primary }]}>{courseName}</Text>
                    </View>
                )}

                {/* Camera Preview */}
                <View style={styles.cameraContainer}>
                    <View style={[
                        styles.faceIconWrapper,
                        {
                            borderColor: getBorderColor(),
                            overflow: 'hidden'
                        }
                    ]}>
                        {capturedImage ? (
                            <Image
                                source={{ uri: capturedImage }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                        ) : !device ? (
                            <ActivityIndicator size="large" color={colorPalette.frozenLake[500]} />
                        ) : hasPermission ? (
                            <Camera
                                style={{ width: '100%', height: '100%' }}
                                device={device}
                                isActive={state === 'camera' && !capturedImage}
                                ref={camera}
                                photo={true}
                                frameProcessor={frameProcessor}
                            />
                        ) : (
                            <View style={styles.permissionContainer}>
                                <Ionicons name="camera-outline" size={50} color={colorPalette.grey[400]} />
                                <Text style={styles.permissionText}>Camera access required</Text>
                                <TouchableOpacity
                                    style={[styles.permissionButton, { backgroundColor: colorPalette.frozenLake[500] }]}
                                    onPress={requestPermission}
                                >
                                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Verifying Overlay */}
                        {state === 'verifying' && (
                            <View style={styles.verifyingOverlay}>
                                <ActivityIndicator size="large" color={colors.white} />
                                <Text style={styles.verifyingText}>Verifying...</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Live Feedback Instructions */}
                <View style={styles.instructionsContainer}>
                    {!capturedImage && (
                        <View style={[
                            styles.statusMessage,
                            { backgroundColor: validationState === 'LIVENESS_CHECK' ? '#EBF8FF' : colorPalette.grey[50] }
                        ]}>
                            {validationState === 'SEARCHING' && <ActivityIndicator size={14} color={colorPalette.grey[600]} />}
                            <Ionicons
                                name={getIconForState()}
                                size={18}
                                color={getBorderColor()}
                            />
                            <Text style={[
                                styles.statusText,
                                { color: colorPalette.grey[800], fontSize: 15 }
                            ]}>
                                {currentInstruction || 'Position your face in the frame'}
                            </Text>
                        </View>
                    )}

                    {capturedImage && (
                        <Text style={[styles.instructions, { color: colors.text.secondary }]}>
                            Review your photo and verify
                        </Text>
                    )}
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {!capturedImage ? (
                        hasPermission && device && (
                            <View style={{ height: 56, justifyContent: 'center', alignItems: 'center', backgroundColor: colorPalette.grey[50], borderRadius: 28, paddingHorizontal: 20 }}>
                                <Text style={{ color: colorPalette.grey[600], fontSize: 13, fontFamily: 'Montserrat_600SemiBold' }}>
                                    Follow instructions to auto-capture
                                </Text>
                            </View>
                        )
                    ) : state !== 'verifying' && (
                        <>
                            <TouchableOpacity
                                style={[styles.verifyButton, { backgroundColor: colorPalette.frozenLake[500] }]}
                                onPress={handleVerify}
                            >
                                <Ionicons name="checkmark" size={22} color={colors.white} />
                                <Text style={styles.verifyButtonText}>Verify & Mark Attendance</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.retakeButton}
                                onPress={handleRetry}
                            >
                                <Text style={[styles.retakeText, { color: colors.text.secondary }]}>Retake Photo</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fullScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resultContent: {
        alignItems: 'center',
        padding: 40,
    },
    successIconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    resultTitle: {
        fontSize: 28,
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        marginTop: 24,
        textAlign: 'center',
    },
    resultSubtitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
        color: 'rgba(255,255,255,0.85)',
        marginTop: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 24,
    },
    resultButton: {
        marginTop: 40,
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    resultButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    secondaryButton: {
        marginTop: 16,
        padding: 12,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
        color: 'rgba(255,255,255,0.7)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xl,
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
    },
    content: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -20,
        padding: layout.spacing.xl,
        alignItems: 'center',
    },
    courseInfo: {
        marginBottom: layout.spacing.md,
    },
    courseName: {
        fontSize: 18,
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
    },
    instructions: {
        fontSize: 14,
        fontFamily: 'Montserrat_500Medium',
        marginTop: layout.spacing.md,
        textAlign: 'center',
    },
    cameraContainer: {
        alignItems: 'center',
        marginVertical: layout.spacing.lg,
    },
    faceIconWrapper: {
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    instructionsContainer: {
        marginBottom: layout.spacing.lg,
        alignItems: 'center',
    },
    statusMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        minWidth: 200,
    },
    statusText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },
    permissionContainer: {
        alignItems: 'center',
        gap: 12,
    },
    permissionText: {
        fontFamily: 'Montserrat_500Medium',
        color: '#999',
    },
    permissionButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    permissionButtonText: {
        fontFamily: 'Montserrat_600SemiBold',
        color: '#fff',
    },
    verifyingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    verifyingText: {
        fontFamily: 'Montserrat_600SemiBold',
        color: '#fff',
        fontSize: 16,
    },
    actions: {
        width: '100%',
        alignItems: 'center',
        gap: layout.spacing.md,
        marginTop: layout.spacing.md,
    },
    verifyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        gap: 10,
        width: '100%',
    },
    verifyButtonText: {
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        fontSize: 16,
    },
    retakeButton: {
        padding: 12,
    },
    retakeText: {
        fontFamily: 'Montserrat_600SemiBold',
        fontSize: 14,
    },
});
