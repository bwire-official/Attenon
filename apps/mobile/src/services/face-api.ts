// Face Recognition API service
// Communicates with the Python FastAPI backend for face processing
import { API_CONFIG, FACE_CONFIG } from '../lib/config';
import { getAccessToken } from './session';

interface FaceEncodingResponse {
    success: boolean;
    error?: string;
    message?: string;
}

interface FaceMatchResponse {
    success: boolean;
    match: boolean;
    user_id?: string;
    email?: string;
    full_name?: string;
    reg_number?: string;
    confidence?: number;
    error?: string;
}



// Register a face by sending an image to the Python API.
// Returns the 512-dimensional face encoding vector.
export async function registerFace(imageUri: string, userId: string): Promise<FaceEncodingResponse> {
    try {
        const formData = new FormData();

        // React Native: Use file URI directly
        formData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'face.jpg',
        } as any);
        formData.append('user_id', userId);

        console.log(`[Face API] Sending request to ${API_CONFIG.FACE_API_URL}/register-face`);

        const token = await getAccessToken();
        if (!token) {
            return {
                success: false,
                error: 'Authentication required. Please log in again.'
            };
        }

        const apiResponse = await fetch(`${API_CONFIG.FACE_API_URL}/register-face`, {
            method: 'POST',
            body: formData,
            headers: {
                'ngrok-skip-browser-warning': 'true',
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-cache',
        });

        console.log(`[Face API] Response status: ${apiResponse.status}`);
        const data = await apiResponse.json();
        console.log(`[Face API] Response data:`, data);

        if (!apiResponse.ok) {
            return {
                success: false,
                error: data.detail || 'Failed to register face'
            };
        }

        return {
            success: true,
            message: data.message,
        };
    } catch (error) {
        console.error('Face registration error:', error);
        return {
            success: false,
            error: 'Network error. Please check your connection.'
        };
    }
}

// Verify a face by sending an image to the Python API.
// Returns match result with user info and confidence.
export async function verifyFace(imageUri: string, classId?: string): Promise<FaceMatchResponse> {
    try {
        console.log(`[Face API] verifyFace called with imageUri: ${imageUri}`);
        
        const formData = new FormData();

        // React Native: Use file URI directly
        formData.append('file', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'face.jpg',
        } as any);

        if (classId) {
            formData.append('class_id', classId);
        }

        const token = await getAccessToken();
        if (!token) {
            return {
                success: false,
                match: false,
                error: 'Authentication required. Please log in again.'
            };
        }

        console.log(`[Face API] Sending verify request to ${API_CONFIG.FACE_API_URL}/verify-face`);
        const apiResponse = await fetch(`${API_CONFIG.FACE_API_URL}/verify-face`, {
            method: 'POST',
            body: formData,
            headers: {
                'ngrok-skip-browser-warning': 'true',
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-cache',
        });

        console.log(`[Face API] Response status: ${apiResponse.status}`);
        const data = await apiResponse.json();
        // Only log non-PII fields in development
        if (__DEV__) {
            const sanitizedData = { success: data.success, match: data.match, confidence: data.confidence };
            console.log(`[Face API] Response (sanitized):`, sanitizedData);
        }

        if (!apiResponse.ok) {
            return {
                success: false,
                match: false,
                error: data.detail || 'Failed to verify face'
            };
        }

        // Check if confidence meets threshold
        const meetsThreshold = data.confidence >= FACE_CONFIG.MIN_CONFIDENCE;

        return {
            success: true,
            match: data.match && meetsThreshold,
            user_id: data.user_id,
            email: data.email,
            full_name: data.full_name,
            reg_number: data.reg_number,
            confidence: data.confidence,
        };
    } catch (error) {
        console.error('Face verification error:', error);
        return {
            success: false,
            match: false,
            error: 'Network error. Please check your connection.'
        };
    }
}



// Check API health status.
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_CONFIG.FACE_API_URL}/`, {
            method: 'GET',
            headers: {
                'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning
            },
        });
        return response.ok;
    } catch {
        return false;
    }
}
