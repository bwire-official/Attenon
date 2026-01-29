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
            providers=['CPUExecutionProvider'],
            allowed_modules=['detection', 'recognition']
        )
        # Standard detection size - works well with phone camera images
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
        logger.info("InsightFace FaceAnalysis initialized")
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


def fix_image_orientation(image: Image.Image) -> Image.Image:
    """Fix image orientation based on EXIF data (common issue with phone cameras)."""
    try:
        from PIL import ExifTags
        
        # Find the orientation tag
        orientation_key = None
        for key, val in ExifTags.TAGS.items():
            if val == 'Orientation':
                orientation_key = key
                break
        
        if orientation_key is None:
            return image
        
        exif = image._getexif()
        if exif is None:
            return image
        
        orientation = exif.get(orientation_key)
        if orientation is None:
            return image
        
        # Apply rotation based on EXIF orientation
        if orientation == 2:
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            image = image.rotate(180)
        elif orientation == 4:
            image = image.transpose(Image.FLIP_TOP_BOTTOM)
        elif orientation == 5:
            image = image.rotate(-90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 6:
            image = image.rotate(-90, expand=True)
        elif orientation == 7:
            image = image.rotate(90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 8:
            image = image.rotate(90, expand=True)
        
        logger.info(f"Fixed image orientation (EXIF orientation: {orientation})")
        return image
    except Exception as e:
        logger.warning(f"Could not fix EXIF orientation: {e}")
        return image


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
        
        # Fix EXIF orientation (critical for phone camera images)
        image = fix_image_orientation(image)
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Log image dimensions for debugging
        width, height = image.size
        logger.info(f"Image size after processing: {width}x{height}")
        
        # Resize very large images to improve detection (InsightFace works best around 640x640)
        max_dimension = 1280
        if width > max_dimension or height > max_dimension:
            scale = max_dimension / max(width, height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            image = image.resize((new_width, new_height), Image.LANCZOS)
            logger.info(f"Resized image to: {new_width}x{new_height}")
        
        image_array = np.array(image)
        
        # InsightFace expects BGR format (like OpenCV), but PIL gives RGB
        # Convert RGB to BGR for InsightFace
        image_array_bgr = image_array[:, :, ::-1]
        
        # Get InsightFace app instance
        app = get_face_app()
        
        # Detect and extract face embeddings
        faces = app.get(image_array_bgr)
        
        if len(faces) == 0:
            logger.warning(f"No faces detected in image ({width}x{height})")
            # Try with original RGB just in case
            faces = app.get(image_array)
            if len(faces) == 0:
                logger.warning("Still no faces detected after RGB fallback")
                return None
            logger.info("Face detected using RGB fallback")
        
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
    verify_token(token)
    logger.info(f"Verification request received" + (f" for class {class_id}" if class_id else ""))
    
    # Validate file type
    logger.info(f"File content type: {file.content_type}, filename: {file.filename}")
    if not file.content_type or not file.content_type.startswith("image/"):
        logger.error(f"Invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Read image data
    image_data = await file.read()
    logger.info(f"Received image data: {len(image_data)} bytes")
    
    if len(image_data) < 1000:
        logger.error(f"Image data too small: {len(image_data)} bytes - likely corrupted or empty")
        return FaceMatchResponse(
            success=True,
            match=False,
            message="Invalid image data received. Please try again."
        )
    
    # Extract face encoding in a separate thread
    import asyncio
    loop = asyncio.get_event_loop()
    encoding = await loop.run_in_executor(None, extract_face_encoding, image_data)
    
    if encoding is None:
        logger.warning("No face detected in image for verification")
        return FaceMatchResponse(
            success=True,
            match=False,
            message="No face detected in the image. Please ensure your face is clearly visible and try again."
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
