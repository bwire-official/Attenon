// Adapted for generic usage (Vision Camera)
export interface FaceDetectionResult {
    faceDetected: boolean;
    bounds?: {
        x: number; y: number;
        width: number; height: number;
    };
    // Vision Camera Face Detector typically returns these:
    yawAngle?: number;
    rollAngle?: number;
    pitchAngle?: number;
    smileProbability?: number;
    leftEyeOpenProbability?: number;
    rightEyeOpenProbability?: number;
}

export interface FaceQualityCheck {
    isCentered: boolean;
    hasGoodSize: boolean;
    areEyesOpen: boolean;
    isSmiling: boolean;
    issues: string[];
}


/**
 * Checks if the detected face meets quality standards.
 */
export const checkFaceQuality = (
    result: FaceDetectionResult,
    imageWidth: number = 0,
    imageHeight: number = 0
): FaceQualityCheck => {
    const issues: string[] = [];

    if (!result.faceDetected || !result.bounds) {
        return {
            isCentered: false,
            hasGoodSize: false,
            areEyesOpen: false,
            isSmiling: false,
            issues: ['No face detected']
        };
    }

    // 1. Centered Check (if image dimensions are provided)
    let isCentered = true; // Default true if no dimensions
    if (imageWidth > 0 && imageHeight > 0) {
        const { x, y, width, height } = result.bounds;
        const faceCenterX = x + width / 2;
        const faceCenterY = y + height / 2;

        const imgCenterX = imageWidth / 2;
        const imgCenterY = imageHeight / 2;

        // Allow 20% deviation from center
        const xDev = Math.abs(faceCenterX - imgCenterX) / imageWidth;
        const yDev = Math.abs(faceCenterY - imgCenterY) / imageHeight;

        if (xDev > 0.2 || yDev > 0.2) {
            isCentered = false;
            issues.push('Center your face');
        }
    }

    // 2. Size Check (Face should be close enough)
    let hasGoodSize = true;
    if (imageWidth > 0) {
        const faceWidthRatio = result.bounds.width / imageWidth;
        if (faceWidthRatio < 0.25) {
            hasGoodSize = false;
            issues.push('Move closer');
        }
    }

    // 3. Eyes Open Check
    // Probability ranges 0.0 - 1.0. use 0.4 as threshold (sometimes it's low even when open)
    const leftOpen = (result.leftEyeOpenProbability ?? 0) > 0.4;
    const rightOpen = (result.rightEyeOpenProbability ?? 0) > 0.4;
    const areEyesOpen = leftOpen && rightOpen;

    if (!areEyesOpen) {
        issues.push('Open your eyes');
    }

    // 4. Smiling Check (Liveness)
    const isSmiling = (result.smileProbability ?? 0) > 0.6;

    return {
        isCentered,
        hasGoodSize,
        areEyesOpen,
        isSmiling,
        issues
    };
};
