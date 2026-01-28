import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { registerFace } from '../services/face-api';
import { getCurrentUser } from '../services/session';
import { supabase } from '../lib/supabase';
import { useFaceValidation } from '../hooks/useFaceValidation';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

interface FaceSetupScreenProps {
    onComplete?: () => void;
    onSkip?: () => void;
}

export const FaceSetupScreen = ({ onComplete, onSkip }: FaceSetupScreenProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(true);

    // Animation states
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

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
        validation,
        error: hookError,
        processFaces,
        resetValidation,
        isReadyToCapture,
    } = useFaceValidation({
        enabled: !capturedImage && hasPermission && !loading && isCameraActive && !isRegistered,
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
        if (hookError && !capturedImage && !isRegistered) {
            setError(hookError);
        }
    }, [hookError, capturedImage, isRegistered]);

    const handleTakePicture = useCallback(async () => {
        if (!camera.current || loading) return;

        setLoading(true);
        setError(null);

        try {
            const photo = await camera.current.takePhoto({
                flash: 'off',
                enableShutterSound: false,
            });

            setCapturedImage(`file://${photo.path}`);
            setIsCameraActive(false);

        } catch (err) {
            console.error(err);
            setError('Failed to take picture.');
        } finally {
            setLoading(false);
        }
    }, [loading]);

    useEffect(() => {
        if (isReadyToCapture && !capturedImage && !loading && !isRegistered) {
            handleTakePicture();
        }
    }, [isReadyToCapture, capturedImage, loading, isRegistered, handleTakePicture]);

    // Success Animation
    useEffect(() => {
        if (isRegistered) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [isRegistered]);

    const handleRetake = () => {
        setCapturedImage(null);
        setLoading(false);
        setIsCameraActive(true);
        resetValidation();
        setError(null);
    };

    const handleRegisterFace = async () => {
        if (!capturedImage) {
            setError('Please capture a photo first.');
            return;
        }

        if (loading) return;

        setLoading(true);
        setError(null);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 15000)
        );

        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                setError('User session not found. Please log in again.');
                setLoading(false);
                return;
            }

            const response = await Promise.race([
                registerFace(capturedImage, currentUser.id),
                timeoutPromise
            ]) as any;

            if (!response.success) {
                setError(response.error || 'Face detection failed. Please try again with better lighting.');
                setLoading(false);
                return;
            }

            // The Python API (registerFace) already persisted the encoding to the DB
            // using the Service Role. No need to update again from the frontend.

            // SUCCESS! Switch to success state
            setIsRegistered(true);
            setLoading(false);

        } catch (err: any) {
            console.error('Registration error:', err);
            if (err.message === 'TIMEOUT') {
                setError('Request timed out. Please check your connection and try again.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
            setLoading(false);
        }
    };

    const getBorderColor = () => {
        if (isRegistered) return colorPalette.yellowGreen[500];
        if (capturedImage) return colorPalette.yellowGreen[500];
        switch (validationState) {
            case 'SUCCESS': return colorPalette.yellowGreen[500];
            case 'LIVENESS_CHECK': return '#3B82F6';
            case 'QUALITY_CHECK': return '#F59E0B';
            case 'SEARCHING':
            default: return colors.primary;
        }
    };

    const getIconForState = () => {
        if (isRegistered || capturedImage) return "checkmark-circle";
        switch (validationState) {
            case 'SUCCESS': return "checkmark-circle";
            case 'LIVENESS_CHECK': return "happy-outline";
            case 'QUALITY_CHECK': return "warning-outline";
            case 'SEARCHING':
            default: return "scan-outline";
        }
    };

    if (!device && !capturedImage && !isRegistered) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 20, color: colors.text.primary }}>Loading Camera...</Text>
            </View>
        );
    }

    // SUCCESS UI COMPONENT
    if (isRegistered) {
        return (
            <View style={[styles.container, { backgroundColor: colors.white }]}>
                <View style={[styles.successContent, { paddingTop: insets.top + 60 }]}>
                    <Animated.View style={[styles.successIconContainer, { transform: [{ scale: scaleAnim }] }]}>
                        <View style={[styles.successCircleLarge, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                            <View style={[styles.successCircleMedium, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                                <Ionicons name="shield-checkmark" size={100} color="#22C55E" />
                            </View>
                        </View>
                    </Animated.View>

                    <Animated.View style={[styles.successTextContainer, { opacity: fadeAnim }]}>
                        <Text style={[styles.successTitle, { color: colorPalette.grey[900] }]}>Verification Completed</Text>
                        <Text style={[styles.successDescription, { color: colorPalette.grey[600] }]}>
                            Your face profile has been registered successfully. You can now use biometric attendance for your classes.
                        </Text>
                    </Animated.View>

                    <Animated.View style={[styles.successButtonContainer, { opacity: fadeAnim }]}>
                        <TouchableOpacity
                            style={[styles.doneButton, { backgroundColor: colors.black }]}
                            onPress={() => onComplete?.()}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.doneButtonText}>GO TO DASHBOARD</Text>
                            <Ionicons name="arrow-forward" size={20} color={colors.white} />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>
        );
    }

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
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.helloText, { color: colors.white }]}>Setup</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>Face Verification</Text>
                </View>
            </View>

            {/* Content Section */}
            <View style={[styles.contentSection, { backgroundColor: colors.white }]}>
                <ScrollView
                    contentContainerStyle={[
                        styles.content,
                        { paddingBottom: Math.max(insets.bottom, 20) }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {error && (
                        <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="alert-circle" size={20} color="#DC2626" />
                            <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
                        </View>
                    )}

                    {/* Camera Preview */}
                    <View style={styles.faceContainer}>
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
                            ) : hasPermission && device ? (
                                <Camera
                                    style={{ width: '100%', height: '100%' }}
                                    device={device}
                                    isActive={isCameraActive}
                                    ref={camera}
                                    photo={true}
                                    frameProcessor={frameProcessor}
                                />
                            ) : (
                                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                                    <Ionicons name="camera-outline" size={32} color={colorPalette.grey[400]} />
                                    <Text style={{ textAlign: 'center', fontSize: 11, marginTop: 6, color: colorPalette.grey[500] }}>Camera Access Required</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Smart Instructions */}
                    <View style={styles.instructionsContainer}>
                        <Text style={[styles.title, { color: colorPalette.grey[900] }]}>
                            {capturedImage ? 'Review Photo' : 'Register Your Face'}
                        </Text>

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
                                    {currentInstruction}
                                </Text>
                            </View>
                        )}

                        {capturedImage && (
                            <Text style={[styles.description, { color: colorPalette.grey[600], marginTop: 8 }]}>
                                Photo captured successfully. Press complete to secure your identity.
                            </Text>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        {!capturedImage ? (
                            hasPermission ? (
                                <View style={{ height: 56, justifyContent: 'center', alignItems: 'center', backgroundColor: colorPalette.grey[50], borderRadius: 28 }}>
                                    <Text style={{ color: colorPalette.grey[600], fontSize: 13, fontFamily: 'Montserrat_600SemiBold' }}>
                                        Follow instructions to auto-capture
                                    </Text>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                                    onPress={requestPermission}
                                >
                                    <Text style={[styles.actionButtonText, { color: colors.white }]}>
                                        ALLOW CAMERA
                                    </Text>
                                </TouchableOpacity>
                            )
                        ) : (
                            <>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: colors.black,
                                            opacity: loading ? 0.5 : 1,
                                        },
                                    ]}
                                    onPress={handleRegisterFace}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={colors.white} />
                                    ) : (
                                        <Text style={[styles.actionButtonText, { color: colors.white }]}>
                                            COMPLETE SETUP
                                        </Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.retakeButton,
                                        { opacity: loading ? 0.5 : 1 },
                                    ]}
                                    onPress={handleRetake}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.retakeButtonText, { color: colorPalette.grey[700] }]}>
                                        Retake Photo
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Skip Button */}
                        {!capturedImage && onSkip && (
                            <TouchableOpacity
                                style={styles.skipButton}
                                onPress={() => onSkip?.()}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.skipButtonText, { color: colorPalette.grey[600] }]}>
                                    Skip for now
                                </Text>
                            </TouchableOpacity>
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
        paddingBottom: layout.spacing.xl,
        overflow: 'hidden',
    },
    headerTextContainer: {
        marginTop: layout.spacing.md,
    },
    helloText: {
        fontSize: 24,
        fontFamily: 'Montserrat_300Light',
        marginBottom: layout.spacing.xs / 2,
    },
    signInText: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
    },
    contentSection: {
        flex: 1,
        marginTop: -25,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xl,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: layout.spacing.md,
        borderRadius: layout.borderRadius.md,
        marginBottom: layout.spacing.lg,
        gap: layout.spacing.sm,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },
    faceContainer: {
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
    title: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.md,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: layout.spacing.md,
    },
    statusMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        marginTop: layout.spacing.xs,
        minWidth: 200,
    },
    statusText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },
    actionsContainer: {
        marginTop: 'auto',
        gap: layout.spacing.md,
        paddingBottom: 20,
    },
    actionButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: layout.spacing.sm,
    },
    actionButtonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
    retakeButton: {
        alignItems: 'center',
        paddingVertical: layout.spacing.sm,
    },
    retakeButtonText: {
        fontSize: 14,
        fontFamily: 'Montserrat_600SemiBold',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: layout.spacing.md,
    },
    skipButtonText: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },
    // Success State Styles
    successContent: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    successIconContainer: {
        marginBottom: 40,
    },
    successCircleLarge: {
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(120, 196, 44, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successCircleMedium: {
        width: 170,
        height: 170,
        borderRadius: 85,
        backgroundColor: 'rgba(120, 196, 44, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successTextContainer: {
        alignItems: 'center',
        marginBottom: 60,
    },
    successTitle: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
        color: '#FFF',
        marginBottom: 16,
        textAlign: 'center',
    },
    successDescription: {
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 24,
    },
    successButtonContainer: {
        width: '100%',
        marginTop: 'auto',
        marginBottom: 40,
    },
    doneButton: {
        height: 60,
        borderRadius: 30,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    doneButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 1.2,
    },
});
