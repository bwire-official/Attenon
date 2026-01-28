import { useState, useCallback, useRef } from 'react';
import { FaceDetectionResult, checkFaceQuality } from '../services/local-face-detector';

export type ValidationState = 'IDLE' | 'SEARCHING' | 'QUALITY_CHECK' | 'LIVENESS_CHECK' | 'SUCCESS';

interface UseFaceValidationOptions {
    enabled: boolean;
}

export const useFaceValidation = ({
    enabled,
}: UseFaceValidationOptions) => {
    const [validationState, setValidationState] = useState<ValidationState>('IDLE');
    const [currentInstruction, setCurrentInstruction] = useState<string>('Initializing...');
    const [faceResult, setFaceResult] = useState<FaceDetectionResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // State validation flags
    const [validation, setValidation] = useState({
        faceDetected: false,
        centered: false,
        eyesOpen: false,
        goodLighting: true,
    });

    const consecutiveSuccessCount = useRef(0);
    const REQUIRED_SUCCESS_FRAMES = 3;

    const resetValidation = useCallback(() => {
        setValidationState('IDLE');
        setFaceResult(null);
        setError(null);
        consecutiveSuccessCount.current = 0;
        setValidation({
            faceDetected: false,
            centered: false,
            eyesOpen: false,
            goodLighting: true,
        });
    }, []);

    const processFaces = useCallback((faces: any[], frameWidth: number, frameHeight: number) => {
        if (!enabled) return;

        if (!faces || faces.length === 0) {
            setValidationState('SEARCHING');
            setCurrentInstruction('Position your face in the frame');
            setFaceResult(null);
            setValidation(prev => ({ ...prev, faceDetected: false }));
            consecutiveSuccessCount.current = 0;
            return;
        }

        // Use the first face
        const face = faces[0];

        // Map Vision Camera face to our generic result
        const result: FaceDetectionResult = {
            faceDetected: true,
            bounds: face.bounds,
            yawAngle: face.yawAngle,
            rollAngle: face.rollAngle,
            pitchAngle: face.pitchAngle,
            smileProbability: face.smilingProbability,
            leftEyeOpenProbability: face.leftEyeOpenProbability,
            rightEyeOpenProbability: face.rightEyeOpenProbability,
        };

        setFaceResult(result);

        // Quality Check
        const quality = checkFaceQuality(result, frameWidth, frameHeight);

        setValidation({
            faceDetected: true,
            centered: quality.isCentered,
            eyesOpen: quality.areEyesOpen,
            goodLighting: true,
        });

        // State Machine
        if (quality.issues.length > 0) {
            setValidationState('QUALITY_CHECK');
            setCurrentInstruction(quality.issues[0]);
            consecutiveSuccessCount.current = 0;
            return;
        }

        // If quality is good, check liveness (Smile)
        if (quality.isSmiling) {
            consecutiveSuccessCount.current += 1;
            setValidationState('SUCCESS');
            setCurrentInstruction('Perfect!');
        } else {
            setValidationState('LIVENESS_CHECK');
            setCurrentInstruction('Smile to verify you are human!');
            consecutiveSuccessCount.current = 0;
        }

    }, [enabled]);

    return {
        validationState,
        currentInstruction,
        faceResult,
        validation,
        error,
        processFaces, // Exposed to be called from Frame Processor
        resetValidation,
        isReadyToCapture: validationState === 'SUCCESS' && consecutiveSuccessCount.current >= REQUIRED_SUCCESS_FRAMES,
    };
};

