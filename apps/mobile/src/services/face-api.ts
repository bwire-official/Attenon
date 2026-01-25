// Face Recognition API service
// Communicates with the Python FastAPI backend for face processing
import { API_CONFIG, FACE_CONFIG } from '../lib/config';

interface FaceEncodingResponse {
    success: boolean;
    encoding?: number[];
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
// Returns the 128-dimensional face encoding vector.
export async function registerFace(imageUri: string, userId: string): Promise<FaceEncodingResponse> {
    try {
        const formData = new FormData();
        
        // Create file from URI
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, 'face.jpg');
        formData.append('user_id', userId);

        const apiResponse = await fetch(`${API_CONFIG.FACE_API_URL}/register-face`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
            },
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            return { 
                success: false, 
                error: data.detail || 'Failed to register face' 
            };
        }

        return {
            success: true,
            encoding: data.encoding,
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
        const formData = new FormData();
        
        // Create file from URI
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append('file', blob, 'face.jpg');
        
        if (classId) {
            formData.append('class_id', classId);
        }

        const apiResponse = await fetch(`${API_CONFIG.FACE_API_URL}/verify-face`, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json',
            },
        });

        const data = await apiResponse.json();

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
        });
        return response.ok;
    } catch {
        return false;
    }
}
