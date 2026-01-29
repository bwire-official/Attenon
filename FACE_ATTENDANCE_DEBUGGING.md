# Face Attendance - Debugging Guide

## Issues Fixed

### 1. Database Functions Created ✅
- Created `verify_face_match(user_id, query_embedding, match_threshold)` function
- Created `match_face(query_embedding, match_threshold, match_count)` function
- Both functions use pgvector extension for cosine similarity matching
- Permissions granted to `authenticated` and `service_role` roles

### 2. Backend Code Updated ✅
- Changed from `anon` client to `service_role` (admin) client for database operations
- Pass embedding as list (not string) to RPC function
- Added comprehensive logging to trace the entire flow
- Better error handling and messages

### 3. Frontend UI Improved ✅
- Circular camera frame (matches FaceSetupScreen)
- Live feedback with icons
- Auto-capture (no manual button)

## How to Test

### Step 1: Restart the Backend Server
The backend needs to be restarted to load the new code:

```bash
cd d:\Attenon\apps\api
# Stop the current server (Ctrl+C)
# Then restart:
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Test from Mobile App

1. **Check Backend Logs**: Keep the terminal with the backend visible so you can see logs

2. **Start Attendance Session** (as Instructor):
   - Login as instructor
   - Go to "Take Attendance"
   - Select a course
   - Start automatic session

3. **Mark Attendance** (as Student):
   - Login as student (must have face registered)
   - You should see notification "Mark Attendance Now"
   - Tap to open camera
   - Follow on-screen instructions (smile, etc.)
   - Wait for auto-capture

4. **Check Backend Logs** - You should see:
   ```
   ====== MARK ATTENDANCE REQUEST RECEIVED ======
   Session ID: ...
   File: attendance_face.jpg, Content-Type: image/jpeg
   === Starting Face Verification ===
   User ID: ...
   Embedding type: <class 'list'>, length: 512
   Threshold: 0.6
   Calling RPC verify_face_match...
   RPC Response: data=True, count=None
   Match result: True (type: <class 'bool'>)
   ✅ Face verified successfully! Marking attendance...
   ✅ Attendance marked successfully for user ...
   ```

### Step 3: If Still Failing

Check the logs for which step is failing:

#### Error: "Unauthorized" / 401
- Issue: JWT token not being sent or invalid
- Fix: Check `getAccessToken()` in `session.ts`

#### Error: "Session not found" / 404
- Issue: Session ID is invalid or expired
- Fix: Check that attendance session is active

#### Error: "No face detected"
- Issue: Face extraction failed
- Fix: Ensure good lighting, face clearly visible

#### Error: "Please register your face first"
- Issue: User hasn't registered face or `is_face_registered` is false
- Fix: Go to Settings → Security → Register Face

#### Error: "Face data not found"
- Issue: `is_face_registered` is true but `face_encoding` is null
- Fix: Re-register face (there was a database inconsistency)

#### Error: "Face verification failed. Face does not match profile"
- Issue: Similarity score below threshold (< 0.6)
- Possible causes:
  - Different person trying to mark attendance
  - Poor lighting conditions
  - Face angle too different from registration
  - Threshold too high
- Fix: Try again with better lighting, or lower threshold in `.env`:
  ```
  FACE_MATCH_THRESHOLD=0.5
  ```

#### Error: Database RPC error / 500
- Issue: RPC function call failed
- Check:
  1. Functions exist: Run in Supabase SQL Editor:
     ```sql
     SELECT proname FROM pg_proc WHERE proname IN ('match_face', 'verify_face_match');
     ```
  2. Permissions granted:
     ```sql
     SELECT has_function_privilege('service_role', 'verify_face_match(uuid, vector, double precision)', 'EXECUTE');
     ```
  3. Service role key configured in `.env`:
     ```
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
     ```

## Key Code Changes

### Backend: `attendance.py`

**Changed (Line 180-183):**
```python
# OLD: Using anon client
# supabase = get_supabase_client()

# NEW: Using service role client (has full database access)
from app.core.supabase import get_supabase_admin_client
supabase = get_supabase_admin_client()
```

**Changed (Line 235-239):**
```python
# OLD: Converting list to string
# embedding_str = str(live_embedding)
# rpc_params = {"query_embedding": embedding_str, ...}

# NEW: Pass list directly
rpc_params = {
    "user_id": str(user_id),
    "query_embedding": live_embedding,  # List, not string!
    "match_threshold": float(settings.FACE_MATCH_THRESHOLD)
}
```

### Database: `verify_face_match` Function

```sql
CREATE OR REPLACE FUNCTION verify_face_match(
    user_id uuid,
    query_embedding extensions.vector(512),
    match_threshold float DEFAULT 0.6
)
RETURNS boolean
AS $$
DECLARE
    stored_encoding extensions.vector(512);
    similarity_score float;
BEGIN
    SELECT face_encoding INTO stored_encoding
    FROM profiles
    WHERE id = user_id AND is_face_registered = true;
    
    IF stored_encoding IS NULL THEN
        RETURN false;
    END IF;
    
    similarity_score := 1 - (stored_encoding <=> query_embedding);
    RETURN similarity_score >= match_threshold;
END;
$$;
```

## Expected Flow

1. **Frontend** captures image
2. **Frontend** sends to `/attendance/mark-attendance-self` with:
   - `file`: JPEG image
   - `session_id`: Active session UUID
   - `Authorization`: Bearer token
3. **Backend** validates JWT → gets `user_id`
4. **Backend** validates session is active and not expired
5. **Backend** extracts face → 512-dim embedding using InsightFace
6. **Backend** fetches user's stored face encoding from database
7. **Backend** calls `verify_face_match` RPC:
   - Calculates cosine similarity
   - Returns `true` if similarity >= 0.6
8. **Backend** inserts attendance log if match is true
9. **Frontend** shows success message

## Testing Checklist

- [ ] Backend server running with updated code
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in `.env`
- [ ] Student has registered face (check `profiles` table)
- [ ] Active attendance session exists
- [ ] Mobile app connected to correct backend URL
- [ ] Check backend logs show detailed trace
- [ ] If still fails, share exact error from backend logs

## Verification

To verify the fix worked, check:

1. **Database Functions Exist**:
   ```sql
   SELECT proname, pronargs 
   FROM pg_proc 
   WHERE proname IN ('match_face', 'verify_face_match');
   ```
   Should return 2 rows.

2. **User Has Face Registered**:
   ```sql
   SELECT id, email, is_face_registered, 
          CASE WHEN face_encoding IS NOT NULL THEN 'YES' ELSE 'NO' END 
   FROM profiles 
   WHERE email = 'your-email@example.com';
   ```

3. **Test RPC Directly** (using user's own face, should return `true`):
   ```sql
   SELECT verify_face_match(
       '06cb7f87-1f67-48a8-9927-736d473677e3'::uuid,
       (SELECT face_encoding FROM profiles WHERE id = '06cb7f87-1f67-48a8-9927-736d473677e3'),
       0.6
   );
   ```

If this returns `true`, the database side is working!
