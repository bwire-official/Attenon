
"""Attendance routes."""
import logging
import httpx
from typing import Optional, List
from datetime import datetime, timedelta

from fastapi import APIRouter, Header, HTTPException, status, Depends, UploadFile, File, Form
from pydantic import BaseModel

from app.core.supabase import get_supabase_client
from app.core.config import get_settings
from app.core.security import verify_token
# Import face extraction from face.py
from app.api.routes.face import extract_face_encoding

router = APIRouter()
logger = logging.getLogger("attenon-api.attendance")
settings = get_settings()

class StartSessionRequest(BaseModel):
    class_id: str
    duration_minutes: int

class StartSessionResponse(BaseModel):
    success: bool
    session_id: str
    message: str

class MarkAttendanceResponse(BaseModel):
    success: bool
    status: str
    message: str

async def send_expo_notifications(tokens: List[str], title: str, body: str, data: dict = None):
    """Send push notifications via Expo API."""
    if not tokens:
        return

    logger.info(f"Sending push notifications to {len(tokens)} devices...")
    
    messages = []
    for token in tokens:
        if not token.startswith("ExponentPushToken["):
            continue
            
        message = {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "channelId": "attendance-channel", # Setup channel on client
        }
        messages.append(message)
    
    if not messages:
        return

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                }
            )
            response.raise_for_status()
            logger.info(f"Notification response: status={response.status_code}, body={response.text}")
    except Exception as e:
        logger.exception(f"Failed to send notifications: {e}")

@router.post("/start-session", response_model=StartSessionResponse)
async def start_session(
    request: StartSessionRequest,
    authorization: str = Header(None)
):
    """
    Start an automatic attendance session.
    Instructor only.
    """
    # 1. Auth Check
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    user_id = payload.get("sub")
    role = payload.get("role", "student")
    
    if role != "instructor":
        # Double check profile if metadata isn't set correct
        supabase = get_supabase_client()
        profile = supabase.table("profiles").select("role").eq("id", user_id).single().execute()
        if not profile.data or profile.data.get("role") != "instructor":
             raise HTTPException(status_code=403, detail="Only instructors can start sessions")

    # 2. Create Session
    supabase = get_supabase_client()
    
    # Calculate expiry (DB trigger handles this, but we can also pass it if we want explicit control)
    # Let's rely on the DB trigger we created for consistency
    
    try:
        session_data = {
            "class_id": request.class_id,
            "instructor_id": user_id,
            "duration_minutes": request.duration_minutes,
            "is_active": True,
            "started_at": datetime.utcnow().isoformat()
            # expires_at is auto-calculated by DB trigger
        }
        
        result = supabase.table("attendance_sessions").insert(session_data).execute()
        
        if not result.data:
             raise HTTPException(status_code=500, detail="Failed to create session")
             
        session = result.data[0]
        session_id = session.get("id")
        
        logger.info(f"Session started: {session_id} for class {request.class_id}")
        
        # 3. Notify Students
        # Fetch Class Info
        class_info = supabase.table("classes").select("title, course_code").eq("id", request.class_id).single().execute()
        course_name = class_info.data.get("course_code", "Class")
        
        # Fetch Enrolled Students with Push Tokens
        # We need a join: enrollments -> profiles.push_token
        # Supabase-py join syntax can be tricky. Let's do two steps or RPC if needed.
        # Simple approach: Get student_ids from enrollments, then get tokens from profiles.
        
        enrollments = supabase.table("enrollments").select("student_id").eq("class_id", request.class_id).execute()
        student_ids = [e['student_id'] for e in enrollments.data]
        
        if student_ids:
            profiles = supabase.table("profiles").select("push_token").in_("id", student_ids).not_.is_("push_token", "null").execute()
            tokens = [p['push_token'] for p in profiles.data if p.get('push_token')]
            
            if tokens:
                await send_expo_notifications(
                    tokens=tokens,
                    title="Attendance Started!",
                    body=f"Tap to mark attendance for {course_name}. You have {request.duration_minutes} minutes.",
                    data={"screen": "FaceAttendance", "sessionId": session_id, "classId": request.class_id}
                )
        
        return StartSessionResponse(
            success=True,
            session_id=session_id,
            message="Session started and notifications sent."
        )

    except Exception as e:
        logger.exception(f"Error starting session: {e}")
        raise HTTPException(status_code=500, detail=str(e)) from e

@router.post("/mark-attendance-self", response_model=MarkAttendanceResponse)
async def mark_attendance_self(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    authorization: str = Header(None)
):
    """
    Student marks their own attendance.
    Requires 1:1 Face Verification.
    """
    logger.info(f"====== MARK ATTENDANCE REQUEST RECEIVED ======")
    logger.info(f"Session ID: {session_id}")
    logger.info(f"File: {file.filename}, Content-Type: {file.content_type}")
    
    # 1. Auth Check
    if not authorization or not authorization.startswith("Bearer "):
         logger.error("No authorization header provided")
         raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    user_id = payload.get("sub")
    
    # Use service role client for database operations (has full access)
    from app.core.supabase import get_supabase_admin_client
    supabase = get_supabase_admin_client()
    
    # 2. Validate Session
    session = supabase.table("attendance_sessions").select("*").eq("id", session_id).single().execute()
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
        
    sess = session.data
    if not sess.get('is_active'):
         raise HTTPException(status_code=400, detail="Session is closed")
         
    expires_at = sess.get('expires_at')
    if expires_at:
        # Check if expired
        expiry = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if datetime.now(expiry.tzinfo) > expiry:
             raise HTTPException(status_code=400, detail="Session expired")

    # 3. Check Duplicate
    existing = supabase.table("attendance_logs").select("id").eq("session_id", session_id).eq("student_id", user_id).execute()
    if existing.data and len(existing.data) > 0:
         return MarkAttendanceResponse(success=True, status="present", message="Already marked present")

    # 4. Extract Face
    image_data = await file.read()
    import asyncio
    loop = asyncio.get_running_loop()
    live_embedding = await loop.run_in_executor(None, extract_face_encoding, image_data)
    
    if not live_embedding:
        raise HTTPException(status_code=400, detail="No face detected. Please try again.")

    # 5. Check if user has registered face
    profile = supabase.table("profiles").select("is_face_registered, face_encoding").eq("id", user_id).single().execute()
    
    if not profile.data:
        logger.error(f"Profile not found for user {user_id}")
        raise HTTPException(status_code=404, detail="User profile not found")
    
    if not profile.data.get("is_face_registered"):
        logger.warning(f"User {user_id} has not registered their face")
        raise HTTPException(status_code=400, detail="Please register your face first in Settings")
    
    if not profile.data.get("face_encoding"):
        logger.error(f"User {user_id} marked as registered but no face_encoding found")
        raise HTTPException(status_code=500, detail="Face data not found. Please re-register your face")
    
    # 6. 1:1 Verification (The "Trick")
    # Call the secure SQL function we created
    try:
        logger.info(f"=== Starting Face Verification ===")
        logger.info(f"User ID: {user_id}")
        logger.info(f"Embedding type: {type(live_embedding)}, length: {len(live_embedding) if live_embedding else 0}")
        logger.info(f"Threshold: {settings.FACE_MATCH_THRESHOLD}")
        
        # Pass the embedding as a list directly - Supabase Python client handles the conversion
        rpc_params = {
            "user_id": str(user_id),
            "query_embedding": live_embedding,  # Pass as list, not string
            "match_threshold": float(settings.FACE_MATCH_THRESHOLD)
        }
        
        logger.info(f"Calling RPC verify_face_match...")
        match_result = supabase.rpc("verify_face_match", rpc_params).execute()
        
        logger.info(f"RPC Response: data={match_result.data}, count={match_result.count}")
        
        # Check if there was an error in the response
        if hasattr(match_result, 'error') and match_result.error:
            logger.error(f"RPC Error: {match_result.error}")
            raise HTTPException(status_code=500, detail=f"Database RPC error: {match_result.error}")
        
        is_match = match_result.data
        logger.info(f"Match result: {is_match} (type: {type(is_match)})")
        
        if not is_match:
             logger.warning(f"Face verification FAILED - similarity below threshold {settings.FACE_MATCH_THRESHOLD}")
             raise HTTPException(status_code=403, detail="Face verification failed. Face does not match profile.")
             
        # 7. Mark Attendance
        logger.info(f"✅ Face verified successfully! Marking attendance...")
        log = {
            "class_id": sess.get("class_id"),
            "student_id": user_id,
            "session_id": session_id,
            "status": "present",
            "confidence": 0.99, # We verified it
            "timestamp": datetime.utcnow().isoformat()
        }
        
        insert_result = supabase.table("attendance_logs").insert(log).execute()
        logger.info(f"Attendance log inserted: {insert_result.data}")
        
        logger.info(f"✅ Attendance marked successfully for user {user_id}")
        return MarkAttendanceResponse(
            success=True, 
            status="present", 
            message="Attendance marked successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"❌ Verification error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error during verification: {str(e)}") from e

@router.get("/")
async def list_attendance():
    """List attendance records."""
    return {"message": "List attendance endpoint"}
