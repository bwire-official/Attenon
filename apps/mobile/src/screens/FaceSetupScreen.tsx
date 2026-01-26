import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface FaceSetupScreenProps {
    onComplete?: () => void;
    onSkip?: () => void;
}

export const FaceSetupScreen = ({ onComplete, onSkip }: FaceSetupScreenProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const handleCaptureFace = async () => {
        setLoading(true);
        setError(null);

        // TODO: Implement camera capture and face registration
        // This will be implemented when integrating with the face API
        setTimeout(() => {
            setLoading(false);
            // Simulate success
            setCapturedImage('captured');
        }, 2000);
    };

    const handleRegisterFace = async () => {
        setLoading(true);
        setError(null);

        // TODO: Send captured image to face registration API
        setTimeout(() => {
            setLoading(false);
            onComplete?.();
        }, 1500);
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
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.helloText, { color: colors.white }]}>Setup</Text>
                    <Text style={[styles.signInText, { color: colors.white }]}>Face Verification</Text>
                </View>
            </View>

            {/* Content Section */}
            <View style={[styles.contentSection, { backgroundColor: colors.white }]}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={[
                            styles.content,
                            { paddingBottom: Math.max(insets.bottom, layout.spacing.xl) },
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* Error Message */}
                        {error && (
                            <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="alert-circle" size={20} color="#DC2626" />
                                <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
                            </View>
                        )}

                        {/* Face Icon or Captured Image */}
                        <View style={styles.faceContainer}>
                            {capturedImage ? (
                                <View style={[styles.faceIconWrapper, { borderColor: '#10B981' }]}>
                                    <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                                </View>
                            ) : (
                                <View
                                    style={[
                                        styles.faceIconWrapper,
                                        { borderColor: colorPalette.grey[300] },
                                    ]}
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={80}
                                        color={colorPalette.grey[400]}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Instructions */}
                        <View style={styles.instructionsContainer}>
                            <Text style={[styles.title, { color: colorPalette.grey[900] }]}>
                                Register Your Face
                            </Text>
                            <Text style={[styles.description, { color: colorPalette.grey[600] }]}>
                                We'll use face recognition for attendance tracking. This is secure and only
                                used for verification.
                            </Text>

                            <View style={styles.tipsList}>
                                <View style={styles.tipItem}>
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={20}
                                        color={colorPalette.grey[700]}
                                    />
                                    <Text style={[styles.tipText, { color: colorPalette.grey[700] }]}>
                                        Find good lighting
                                    </Text>
                                </View>
                                <View style={styles.tipItem}>
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={20}
                                        color={colorPalette.grey[700]}
                                    />
                                    <Text style={[styles.tipText, { color: colorPalette.grey[700] }]}>
                                        Look directly at the camera
                                    </Text>
                                </View>
                                <View style={styles.tipItem}>
                                    <Ionicons
                                        name="checkmark-circle-outline"
                                        size={20}
                                        color={colorPalette.grey[700]}
                                    />
                                    <Text style={[styles.tipText, { color: colorPalette.grey[700] }]}>
                                        Remove glasses if possible
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.actionsContainer}>
                            {!capturedImage ? (
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        {
                                            backgroundColor: colors.black,
                                            opacity: loading ? 0.5 : 1,
                                        },
                                    ]}
                                    onPress={handleCaptureFace}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator color={colors.white} />
                                    ) : (
                                        <>
                                            <Ionicons name="camera-outline" size={20} color={colors.white} />
                                            <Text style={[styles.actionButtonText, { color: colors.white }]}>
                                                CAPTURE FACE
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
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
                                        onPress={() => setCapturedImage(null)}
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
                            {!capturedImage && (
                                <TouchableOpacity
                                    style={styles.skipButton}
                                    onPress={onSkip}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.skipButtonText, { color: colorPalette.grey[600] }]}>
                                        Skip for now
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
    headerTextContainer: {
        marginTop: layout.spacing.md,
    },
    helloText: {
        fontSize: 32,
        fontFamily: 'Montserrat_300Light',
        marginBottom: layout.spacing.xs / 2,
    },
    signInText: {
        fontSize: 32,
        fontFamily: 'Montserrat_700Bold',
    },
    contentSection: {
        flex: 1,
        marginTop: -35,
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        overflow: 'hidden',
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: layout.spacing.xl,
        paddingTop: layout.spacing.xxl * 2,
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
        marginVertical: layout.spacing.xxl,
    },
    faceIconWrapper: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 3,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionsContainer: {
        marginBottom: layout.spacing.xxl,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Montserrat_700Bold',
        marginBottom: layout.spacing.md,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        fontFamily: 'Montserrat_400Regular',
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: layout.spacing.xl,
    },
    tipsList: {
        gap: layout.spacing.md,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.spacing.sm,
    },
    tipText: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },
    actionsContainer: {
        marginTop: layout.spacing.xxl,
        gap: layout.spacing.md,
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
});
