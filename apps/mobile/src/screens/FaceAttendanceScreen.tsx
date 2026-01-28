import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';
import { verifyFace } from '../services/face-api';
import { logAttendance, getActiveSession } from '../services/data';
import { getCurrentUser } from '../services/session';
import { Class } from '../lib/supabase';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

interface FaceAttendanceScreenProps {
    classData: Class | null;
    onBack: () => void;
    onComplete: () => void;
}

export const FaceAttendanceScreen = ({ classData, onBack, onComplete }: FaceAttendanceScreenProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Vision Camera Setup
    const device = useCameraDevice('front');
    const { hasPermission, requestPermission } = useCameraPermission();
    const camera = useRef<Camera>(null);

    // Request permission on mount
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission]);

    // If no class data, show error (should not happen)
    if (!classData) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text.primary }}>No class selected.</Text>
                <TouchableOpacity onPress={onBack} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleTakePicture = async () => {
        if (!camera.current) return;
        try {
            const photo = await camera.current.takePhoto({
                flash: 'off',
                enableShutterSound: false,
            });
            setCapturedImage(`file://${photo.path}`);
        } catch (err) {
            console.error(err);
            setError('Failed to take picture.');
        }
    };

    const handleVerifyAndMark = async () => {
        if (!capturedImage) return;

        setVerifying(true);
        setError(null);

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), 15000)
        );

        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                setError('Session expired. Please log in again.');
                setVerifying(false);
                return;
            }

            // 1. Verify Face with timeout
            const verification = await Promise.race([
                verifyFace(capturedImage, classData.id),
                timeoutPromise
            ]) as any;

            if (!verification.success || !verification.match) {
                setError(verification.error || 'Face not recognized. Please try again.');
                setVerifying(false);
                return;
            }

            // 2. Check for active session again to be safe
            const activeSession = await getActiveSession(classData.id);
            if (!activeSession || !activeSession.is_active) {
                setError('No active attendance session found for this class.');
                setVerifying(false);
                return;
            }

            // 3. Log Attendance
            const result = await logAttendance(
                currentUser.id,
                classData.id,
                activeSession.id,
                'present',
                verification.confidence
            );

            if (result) {
                setSuccess(true);
                setTimeout(() => {
                    onComplete();
                }, 2000);
            } else {
                setError('Failed to mark attendance in database.');
            }

        } catch (err: any) {
            console.error('Attendance error:', err);
            if (err.message === 'TIMEOUT') {
                setError('Request timed out. Please check your connection and try again.');
            } else {
                setError('An unexpected error occurred.');
            }
        } finally {
            setVerifying(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.headerSection, { paddingTop: insets.top + layout.spacing.md, backgroundColor: colors.black }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="close" size={24} color={colors.white} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.white }]}>Mark Attendance</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <View style={[styles.contentSection, { backgroundColor: colors.white }]}>
                <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>

                    {/* Class Info */}
                    <View style={styles.classInfo}>
                        <Text style={styles.courseCode}>{classData.course_code}</Text>
                        <Text style={styles.classTitle}>{classData.title}</Text>
                    </View>

                    {success ? (
                        <View style={styles.successContainer}>
                            <Ionicons name="checkmark-circle" size={80} color={colorPalette.yellowGreen[500]} />
                            <Text style={styles.successText}>Attendance Marked!</Text>
                            <Text style={styles.successSubtext}>You have been marked present.</Text>
                        </View>
                    ) : (
                        <>
                            {/* Face Preview */}
                            <View style={[styles.previewContainer, error ? { borderColor: colors.error } : {}]}>
                                {capturedImage ? (
                                    <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                                ) : !device ? (
                                    <ActivityIndicator size="large" color={colors.primary} />
                                ) : hasPermission ? (
                                    <Camera
                                        style={styles.previewImage}
                                        device={device}
                                        isActive={true}
                                        ref={camera}
                                        photo={true}
                                    />
                                ) : (
                                    <View style={styles.placeholderContainer}>
                                        <Ionicons name="camera-outline" size={60} color={colorPalette.grey[400]} />
                                        <Text style={styles.placeholderText}>Camera Access Required</Text>
                                        <TouchableOpacity onPress={requestPermission} style={{ marginTop: 10 }}>
                                            <Text style={{ color: colors.primary }}>Grant Permission</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {error && (
                                <View style={styles.errorContainer}>
                                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                                    <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                                </View>
                            )}

                            {/* Actions */}
                            <View style={styles.actions}>
                                {!capturedImage ? (
                                    hasPermission ? (
                                        <TouchableOpacity
                                            style={[styles.captureButton, { backgroundColor: colors.black }]}
                                            onPress={handleTakePicture}
                                        >
                                            <Ionicons name="camera" size={24} color={colors.white} />
                                            <Text style={[styles.buttonText, { color: colors.white }]}>Capture Face</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.captureButton, { backgroundColor: colors.primary }]}
                                            onPress={requestPermission}
                                        >
                                            <Text style={[styles.buttonText, { color: colors.white }]}>Allow Camera</Text>
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.verifyButton, { backgroundColor: colors.primary, opacity: verifying ? 0.7 : 1 }]}
                                            onPress={handleVerifyAndMark}
                                            disabled={verifying}
                                        >
                                            {verifying ? (
                                                <ActivityIndicator color={colors.white} />
                                            ) : (
                                                <Text style={[styles.buttonText, { color: colors.white }]}>Verify & Mark Attendance</Text>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.retakeButton}
                                            onPress={() => setCapturedImage(null)}
                                            disabled={verifying}
                                        >
                                            <Text style={styles.retakeText}>Retake Photo</Text>
                                        </TouchableOpacity>
                                    </>
                                )}
                            </View>
                        </>
                    )}

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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.spacing.xl,
        paddingBottom: layout.spacing.xl * 2,
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
        flex: 1,
        textAlign: 'center',
    },
    contentSection: {
        flex: 1,
        marginTop: -30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    content: {
        padding: layout.spacing.xl,
        alignItems: 'center',
    },
    classInfo: {
        alignItems: 'center',
        marginBottom: layout.spacing.xl,
        marginTop: layout.spacing.md,
    },
    courseCode: {
        fontSize: 14,
        fontFamily: 'Montserrat_700Bold',
        color: colorPalette.frozenLake[600],
        marginBottom: 4,
        backgroundColor: colorPalette.frozenLake[100],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    classTitle: {
        fontSize: 20,
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },
    previewContainer: {
        width: 250,
        height: 250,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        overflow: 'hidden',
        marginBottom: layout.spacing.lg,
        borderWidth: 2,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        alignItems: 'center',
        gap: 10,
    },
    placeholderText: {
        fontFamily: 'Montserrat_400Regular',
        color: '#999',
    },
    actions: {
        width: '100%',
        gap: layout.spacing.md,
    },
    captureButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
        gap: 10,
    },
    verifyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
        gap: 10,
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    retakeButton: {
        alignItems: 'center',
        padding: 10,
    },
    retakeText: {
        fontFamily: 'Montserrat_600SemiBold',
        color: '#666',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        width: '100%',
    },
    errorText: {
        fontFamily: 'Montserrat_500Medium',
        flex: 1,
        fontSize: 14,
    },
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 16,
    },
    successText: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        color: colorPalette.yellowGreen[600],
    },
    successSubtext: {
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        color: '#666',
    },
});
