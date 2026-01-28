import logging
import io
from typing import Optional, List

from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status, Header, Depends
from pydantic import BaseModel
import numpy as np
from PIL import Image

from app.core.config import get_settings
from app.core.supabase import get_supabase_client
from app.core.security import verify_token

# Get logger
logger = logging.getLogger("attenon-api.face")

# Check for InsightFace (used for face encoding)
try:
    from insightface.app import FaceAnalysis
    INSIGHTFACE_AVAILABLE = True
    logger.info("InsightFace loaded - Face recognition enabled!")
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    logger.error("InsightFace not available. Install with: pip install insightface onnxruntime")

# Check for OpenCV (used for real-time validation)
try:
    import cv2
    OPENCV_AVAILABLE = True
    logger.info("OpenCV loaded - Real-time face validation enabled!")
except ImportError:
    OPENCV_AVAILABLE = False
    logger.warning("OpenCV not available. Validation will not work.")

router = APIRouter()
settings = get_settings()

# Global InsightFace app instance (expensive to create, so we reuse it)
_face_app = None

def get_face_app() -> FaceAnalysis:
    """Get or create InsightFace app instance."""
    global _face_app
    if _face_app is None:
        if not INSIGHTFACE_AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="InsightFace not installed. Install with: pip install insightface onnxruntime"
            )
        # Initialize with BUFFALO_L model (provides 512-dim embeddings)
        _face_app = FaceAnalysis(
            name='buffalo_l',
            providers=['CPUExecutionProvider']  # Use CPU by default, can add CUDAExecutionProvider for GPU
        )
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))  # ctx_id=-1 for CPU, 0+ for GPU
    return _face_app


class FaceEncodingResponse(BaseModel):
    """Response for face registration."""
    success: bool
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
    """Extract 512-dimensional face encoding from image bytes using InsightFace."""
    logger.info(f"Extracting face encoding from image ({len(image_data)} bytes)...")
    
    if not INSIGHTFACE_AVAILABLE:
        logger.error("InsightFace not available!")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="InsightFace not installed."
        )
    
    try:
        # Load image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        image_array = np.array(image)
        
        # Get InsightFace app instance
        app = get_face_app()
        
        # Detect and extract face embeddings
        faces = app.get(image_array)
        
        if len(faces) == 0:
            logger.warning("No faces detected in image")
            return None
        
        if len(faces) > 1:
            logger.error(f"Multiple faces detected: {len(faces)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Multiple faces detected. Please ensure only one face is visible."
            )
        
        # Get embedding (512-dimensional vector)
        embedding = faces[0].embedding
        
        # Normalize embedding (L2 normalization)
        norm = np.linalg.norm(embedding)
        
        # Check for zero norm to avoid division by zero
        if np.isclose(norm, 0.0):
            logger.error(
                f"Failed to normalize face embedding: zero norm detected. "
                f"Faces detected: {len(faces)}, embedding shape: {embedding.shape}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to normalize face embedding: zero norm"
            )
        
        embedding = embedding / norm
        
        embedding_list = embedding.tolist()
        logger.info(f"Successfully generated {len(embedding_list)}-dimensional embedding")
        
        return embedding_list
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Face encoding extraction failed")
        return None


@router.post("/register-face", response_model=FaceEncodingResponse)
async def register_face(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    authorization: str = Header(None)
):
    """
    Register or Update a face for a user.
    Uses JWT verification for security.
    """
    # 1. VERIFY JWT AUTHENTICATION
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    
    # 2. ENSURE USER IS WHO THEY SAY THEY ARE
    # The 'sub' field in Supabase JWT is the User ID
    jwt_user_id = payload.get("sub")
    if not jwt_user_id or jwt_user_id != user_id:
        logger.error(f"Security mismatch: JWT User {jwt_user_id} tried to register face for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security violation: User mismatch. You can only register your own face."
        )

    logger.info(f"Verified registration request for user: {user_id}")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Read image data
    image_data = await file.read()
    
    # Extract face encoding in a separate thread
    import asyncio
    loop = asyncio.get_event_loop()
    encoding = await loop.run_in_executor(None, extract_face_encoding, image_data)
    
    if encoding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected in the image. Please try again with a clear photo."
        )
    
    # SAVE TO DATABASE (Handling both New Registration and Updates)
    try:
        from app.core.supabase import get_supabase_admin_client
        supabase_admin = get_supabase_admin_client()
        logger.info(f"Updating Supabase profile for user {user_id}...")
        
        from datetime import datetime
        result = supabase_admin.table('profiles').update({
            'face_encoding': encoding,
            'is_face_registered': True,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', user_id).execute()
        
        # If no profile found to update, this might be a missing row in public.profiles
        if not result.data:
            logger.warning(f"No profile found for ID {user_id} while updating. Attempting to fetch user info to see if we should create it...")
            # We skip auto-creation here as the trigger SHOULD handle it, but we log precisely
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile record not found in database. Please contact support."
            )
            
        logger.info(f"SUCCESS: Face data persisted to DB for user {user_id}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Database update failed for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save face data to database: {str(e)}"
        )
    
    return FaceEncodingResponse(
        success=True,
        message="Face registered successfully"
    )


@router.post("/verify-face", response_model=FaceMatchResponse)
async def verify_face(
    file: UploadFile = File(...),
    class_id: Optional[str] = Form(None),
    authorization: str = Header(None)
):
    """
    Verify a face against the database.
    Uses JWT verification for session security.
    """
    # VERIFY JWT AUTHENTICATION
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )
    
    token = authorization.split(" ")[1]
    verify_token(token) # Just ensure token is valid, identification comes from face
    logger.info(f"Verification request received" + (f" for class {class_id}" if class_id else ""))
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Read image data
    image_data = await file.read()
    
    # Extract face encoding in a separate thread
    import asyncio
    loop = asyncio.get_event_loop()
    encoding = await loop.run_in_executor(None, extract_face_encoding, image_data)
    
    if encoding is None:
        logger.warning("No face detected in image for verification")
        return FaceMatchResponse(
            success=True,
            match=False,
            message="No face detected in the image"
        )
    
    logger.info(f"Encoding extracted, querying Supabase (threshold: {settings.FACE_MATCH_THRESHOLD})...")
    
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
            
            logger.info(f"MATCH FOUND: {match.get('full_name')} ({confidence:.2f}% confidence)")
            
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
            logger.info("No matching face found in database")
            return FaceMatchResponse(
                success=True,
                match=False,
                message="No matching face found in the database"
            )
    except Exception as e:
        logger.exception("Database match query failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error matching face against database"
        )


class FaceValidationResponse(BaseModel):
    """Response for face quality validation."""
    success: bool
    face_detected: bool
    face_centered: bool
    eyes_open: bool
    good_lighting: bool
    message: Optional[str] = None


@router.post("/validate-face", response_model=FaceValidationResponse)
async def validate_face(file: UploadFile = File(...)):
    """
    Validate face quality in real-time using OpenCV.
    
    - Detects if face is present
    - Checks if face is centered
    - Validates eyes are open
    - Checks lighting quality
    """
    logger.info(
        "Face validation request started",
        extra={"filename": file.filename, "content_type": file.content_type}
    )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    logger.debug("Reading image data...")
    # Read image data
    image_data = await file.read()
    logger.debug("Image data read successfully", extra={"byte_count": len(image_data)})
    
    try:
        logger.debug("Loading OpenCV validator...")
        # Use OpenCV validator - NO FALLBACK, FAIL IF NOT AVAILABLE
        from app.services.face_validator import get_validator
        
        validator = get_validator()
        logger.debug("Validator loaded, running validation...")
        
        result = validator.validate_face(image_data)
        
        logger.info(
            "Face validation completed",
            extra={
                "face_detected": result['face_detected'],
                "face_centered": result['face_centered'],
                "eyes_open": result['eyes_open'],
                "good_lighting": result['good_lighting']
            }
        )
        
        return FaceValidationResponse(
            success=True,
            face_detected=result['face_detected'],
            face_centered=result['face_centered'],
            eyes_open=result['eyes_open'],
            good_lighting=result['good_lighting'],
            message="Face validation complete"
        )
        
    except ImportError as e:
        logger.error(f"OpenCV not installed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Face validation service unavailable. Please try again later."
        )
    except ValueError as e:
        logger.warning(f"Face validation value error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid face image data"
        )
    except Exception as e:
        logger.exception("Face validation failed unexpectedly")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Face validation failed"
        ) from e
