"""Face recognition endpoints."""
from typing import List, Optional

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.supabase import get_supabase_client

# Note: face_recognition requires dlib which needs C++ build tools
# For development without face_recognition, we'll use mock data
try:
    import face_recognition
    import numpy as np
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False
    print("Warning: face_recognition not available. Using mock mode.")

router = APIRouter()
settings = get_settings()


class FaceEncodingResponse(BaseModel):
    """Response for face registration."""
    success: bool
    encoding: Optional[List[float]] = None
    message: Optional[str] = None


class FaceMatchResponse(BaseModel):
    """Response for face verification."""
    success: bool
    match: bool
    user_id: Optional[str] = None
    email: Optional[str] = None
    full_name: Optional[str] = None
    reg_number: Optional[str] = None
    confidence: Optional[float] = None
    message: Optional[str] = None


def extract_face_encoding(image_data: bytes) -> Optional[List[float]]:
    """Extract 128-dimensional face encoding from image bytes."""
    if not FACE_RECOGNITION_AVAILABLE:
        # Return mock encoding for development
        import random
        return [random.uniform(-1, 1) for _ in range(128)]
    
    try:
        # Load image
        import io
        from PIL import Image
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Detect faces
        face_locations = face_recognition.face_locations(image_array)
        
        if len(face_locations) == 0:
            return None
        
        if len(face_locations) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple faces detected. Please ensure only one face is visible."
            )
        
        # Get encoding
        encodings = face_recognition.face_encodings(image_array, face_locations)
        
        if len(encodings) == 0:
            return None
        
        return encodings[0].tolist()
    except HTTPException:
        raise
    except Exception as e:
        print(f"Face encoding error: {e}")
        return None


@router.post("/register-face", response_model=FaceEncodingResponse)
async def register_face(
    file: UploadFile = File(...),
    user_id: str = Form(...),
):
    """
    Register a face for a user.
    
    - Detects face in the uploaded image
    - Generates 128-dimensional encoding
    - Returns the encoding to be saved to Supabase
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Read image data
    image_data = await file.read()
    
    # Extract face encoding
    encoding = extract_face_encoding(image_data)
    
    if encoding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the image. Please try again with a clear photo."
        )
    
    return FaceEncodingResponse(
        success=True,
        encoding=encoding,
        message="Face encoding generated successfully"
    )


@router.post("/verify-face", response_model=FaceMatchResponse)
async def verify_face(
    file: UploadFile = File(...),
    class_id: Optional[str] = Form(None),
):
    """
    Verify a face against the database.
    
    - Detects face in the uploaded image
    - Generates 128-dimensional encoding
    - Queries Supabase to find matching user
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Read image data
    image_data = await file.read()
    
    # Extract face encoding
    encoding = extract_face_encoding(image_data)
    
    if encoding is None:
        return FaceMatchResponse(
            success=True,
            match=False,
            message="No face detected in the image"
        )
    
    # Query Supabase for matching face
    try:
        supabase = get_supabase_client()
        
        # Call the match_face RPC function
        result = supabase.rpc(
            'match_face',
            {
                'query_embedding': encoding,
                'match_threshold': settings.FACE_MATCH_THRESHOLD,
                'match_count': 1
            }
        ).execute()
        
        if result.data and len(result.data) > 0:
            match = result.data[0]
            confidence = match.get('similarity', 0) * 100
            
            return FaceMatchResponse(
                success=True,
                match=True,
                user_id=match.get('user_id'),
                email=match.get('email'),
                full_name=match.get('full_name'),
                reg_number=match.get('reg_number'),
                confidence=round(confidence, 2),
                message=f"Face matched with {confidence:.1f}% confidence"
            )
        else:
            return FaceMatchResponse(
                success=True,
                match=False,
                message="No matching face found in the database"
            )
    except Exception as e:
        print(f"Face matching error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error matching face against database"
        )
