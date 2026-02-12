# Attenon System Documentation

A comprehensive guide to understanding the Attenon biometric attendance system - from student registration to face-verified attendance marking.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Journey](#user-journey)
   - [Student Registration Flow](#1-student-registration-flow)
   - [Mobile App Sign Up](#2-mobile-app-sign-up)
   - [Face Registration](#3-face-registration)
   - [Attendance Marking](#4-attendance-marking-student)
   - [Instructor Workflow](#5-instructor-workflow)
4. [Technical Deep Dive](#technical-deep-dive)
   - [Face Recognition Pipeline](#face-recognition-pipeline)
   - [Database Schema](#database-schema)
   - [API Endpoints](#api-endpoints)
5. [Deployment](#deployment)
6. [Security](#security)

---

## System Overview

**Attenon** is a biometric attendance system that uses facial recognition to eliminate proxy attendance and streamline classroom management. The system consists of three main components:

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Student Portal** | React + Vite | Web form for initial student data collection |
| **Mobile App** | React Native + Expo | Main interface for students and instructors |
| **Face Recognition API** | Python + FastAPI + InsightFace | AI-powered face detection and verification |
| **Database** | Supabase (PostgreSQL + pgvector) | Data storage and face matching |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ATTENON SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  STUDENT PORTAL  │    │    MOBILE APP    │    │   FACE API       │  │
│  │  (Web - Vite)    │    │ (React Native)   │    │ (Python FastAPI) │  │
│  │                  │    │                  │    │                  │  │
│  │  • Registration  │    │  • Student UI    │    │  • InsightFace   │  │
│  │  • Data Entry    │    │  • Instructor UI │    │  • OpenCV        │  │
│  │                  │    │  • Camera        │    │  • Face Encoding │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │            │
│           └───────────────────────┼───────────────────────┘            │
│                                   │                                    │
│                         ┌─────────▼─────────┐                          │
│                         │     SUPABASE      │                          │
│                         │   (PostgreSQL)    │                          │
│                         │                   │                          │
│                         │  • Auth (JWT)     │                          │
│                         │  • profiles       │                          │
│                         │  • classes        │                          │
│                         │  • enrollments    │                          │
│                         │  • attendance     │                          │
│                         │  • pgvector       │                          │
│                         └───────────────────┘                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## User Journey

### 1. Student Registration Flow

**Location:** `apps/student-portal`

Students first register their details through the web portal before they can use the mobile app.

#### Step-by-Step Process:

1. **Student visits the web portal** (e.g., `https://attenon-portal.vercel.app`)

2. **Fills out a 3-step registration form:**

   **Step 1 - Personal Information:**
   - First Name
   - Last Name
   - Email Address (will be used for mobile app login)
   - Student Registration Number (must start with "RU", e.g., `RU021023456`)

   **Step 2 - Academic Information:**
   - Faculty (searchable dropdown with all university faculties)
   - Department (auto-filtered based on selected faculty)
   - Current Level (100, 200, 300, 400)

   **Step 3 - Review & Submit:**
   - Phone Number (optional)
   - Review all entered information
   - Confirm and submit

3. **Data is saved to `allowed_users` table in Supabase**

   This table acts as a whitelist - only students who have registered through the portal can sign up on the mobile app.

#### Technical Flow:

```
Student Portal                    Supabase
     │                               │
     │  1. Fill form                 │
     │                               │
     │  2. Check email exists ──────►│ RPC: check_email_exists()
     │◄───────────────────────────── │ Returns: true/false
     │                               │
     │  3. Check reg_number ────────►│ RPC: check_reg_number_exists()
     │◄───────────────────────────── │ Returns: true/false
     │                               │
     │  4. Insert record ───────────►│ INSERT INTO allowed_users
     │◄───────────────────────────── │ Success/Error
     │                               │
```

#### Relevant Code:
- `apps/student-portal/src/screens/DetailsFormScreen.tsx` - The registration form
- `apps/student-portal/src/services/registration.ts` - API calls to Supabase
- `apps/student-portal/src/data/faculties.ts` - Faculty and department data

---

### 2. Mobile App Sign Up

**Location:** `apps/mobile`

After registering on the web portal, students can sign up on the mobile app.

#### Process:

1. **Student downloads the Attenon mobile app**

2. **Selects "Sign Up" and enters:**
   - Email (must match the one used in web portal)
   - Password (new, for mobile app authentication)

3. **System validates:**
   - Checks if email exists in `allowed_users` table
   - If not found, registration is rejected
   - If found, creates auth account in Supabase Auth

4. **Profile is auto-created:**
   - A database trigger copies data from `allowed_users` to `profiles` table
   - Student can now log in to the mobile app

#### Database Trigger (Supabase):

```sql
-- When a new user signs up, copy their data from allowed_users to profiles
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, reg_number, role, department, faculty, level)
  SELECT 
    NEW.id,
    NEW.email,
    au.full_name,
    au.reg_number,
    au.role,
    au.department,
    au.faculty,
    au.level
  FROM public.allowed_users au
  WHERE au.email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 3. Face Registration

**Location:** `apps/mobile` + `apps/api`

Before a student can mark attendance with their face, they must register their face.

#### Process:

1. **Student navigates to Profile → Register Face**

2. **Camera opens with real-time face detection:**
   - Uses `react-native-vision-camera` for camera access
   - Uses `react-native-vision-camera-face-detector` for on-device face detection
   - Guides user: "Center your face", "Smile detected!", "Hold steady..."

3. **When conditions are met, photo is captured automatically**

4. **Photo is sent to the Face API:**

   ```
   POST /register-face
   Headers: Authorization: Bearer <jwt_token>
   Body: FormData { file: image.jpg, user_id: "uuid" }
   ```

5. **Face API processes the image:**
   - Fixes EXIF orientation (phones often rotate images)
   - Converts to RGB format
   - Resizes if too large (max 1280px)
   - Runs InsightFace detection
   - Extracts **512-dimensional face embedding**
   - Normalizes the embedding vector

6. **Embedding is saved to database:**
   - Stored in `profiles.face_encoding` as a float array
   - `is_face_registered` flag set to `true`

#### Face Embedding Details:

| Property | Value |
|----------|-------|
| Model | InsightFace `buffalo_l` |
| Dimensions | 512 |
| Normalization | L2 normalized |
| Storage | PostgreSQL array (pgvector compatible) |

#### Relevant Code:
- `apps/mobile/src/screens/FaceRegistrationScreen.tsx` - Camera UI
- `apps/mobile/src/services/face-api.ts` - API client
- `apps/api/app/api/routes/face.py` - Server-side processing
- `apps/api/app/services/face_validator.py` - Image quality validation

---

### 4. Attendance Marking (Student)

**Location:** `apps/mobile`

This is the core feature - students mark attendance using their face.

#### Prerequisites:
- Student must have a registered face
- An instructor must have started an attendance session for the class
- Student must be enrolled in that class

#### Process:

1. **Student sees "Active Session" banner on dashboard**
   - Real-time subscription to `attendance_sessions` table
   - Shows countdown timer if session has time limit

2. **Student taps "Mark Attendance"**

3. **Camera opens with liveness detection:**
   - Real-time face detection (on-device)
   - Checks: face detected, centered, eyes open, good lighting
   - May require smile for liveness check

4. **Photo is captured and sent for verification:**

   ```
   POST /verify-face
   Headers: Authorization: Bearer <jwt_token>
   Body: FormData { file: image.jpg, class_id: "uuid" }
   ```

5. **Face API extracts embedding from photo**

6. **Supabase performs face matching:**

   ```sql
   -- RPC function using pgvector
   SELECT 
     user_id,
     full_name,
     1 - (face_encoding <=> query_embedding) as similarity
   FROM profiles
   WHERE is_face_registered = true
     AND 1 - (face_encoding <=> query_embedding) > match_threshold
   ORDER BY similarity DESC
   LIMIT 1;
   ```

7. **If match found (confidence ≥ 60%):**
   - Attendance logged to `attendance_logs` table
   - Status: `present` (or `late` if after threshold)
   - Confidence score saved

8. **Success screen shown to student**

#### Face Matching Algorithm:

The system uses **cosine similarity** via pgvector's `<=>` operator:

```
similarity = 1 - cosine_distance(stored_embedding, captured_embedding)
```

- **Threshold:** 0.6 (60% similarity required for match)
- **Perfect match:** 1.0
- **No similarity:** 0.0

---

### 5. Instructor Workflow

**Location:** `apps/mobile`

Instructors manage classes and attendance sessions.

#### Starting an Attendance Session:

1. **Instructor navigates to "Take Attendance"**

2. **Selects attendance mode:**
   - **Manual:** Instructor manually marks students
   - **Automatic (Timed):** Students self-verify with face recognition

3. **For Automatic mode, sets duration:**
   - 5, 10, 15, 30 minutes, or custom
   - Timer starts immediately

4. **Selects the course/class**

5. **Session is created in database:**

   ```sql
   INSERT INTO attendance_sessions (
     class_id,
     instructor_id,
     is_active,
     late_threshold_minutes,
     started_at
   ) VALUES (...);
   ```

6. **All enrolled students are notified:**
   - Real-time subscription shows banner on student dashboards
   - Push notification sent (if enabled)

#### Session Expiration:

When the timer runs out:

1. Session is marked as `is_active = false`
2. Students who didn't mark attendance are marked as `absent`
3. Instructor is redirected to **Attendance Summary Screen**
4. Summary shows: Present count, Late count, Absent count

---

## Technical Deep Dive

### Face Recognition Pipeline

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CAPTURE   │────►│  PREPROCESS │────►│   DETECT    │────►│   ENCODE    │
│   (Phone)   │     │   (Server)  │     │   (Server)  │     │   (Server)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    • Fix EXIF rotation   • InsightFace      • 512-dim vector
                    • Convert to RGB      • Detect faces     • L2 normalized
                    • Resize to ≤1280px   • Get bounding box • Store/Compare
```

#### Libraries Used:

| Library | Location | Purpose |
|---------|----------|---------|
| `react-native-vision-camera` | Mobile | Camera access and photo capture |
| `react-native-vision-camera-face-detector` | Mobile | On-device face detection (guides user) |
| `InsightFace` | API Server | Face detection + embedding extraction |
| `ONNX Runtime` | API Server | Runs InsightFace AI models |
| `OpenCV` | API Server | Image preprocessing and validation |
| `pgvector` | Supabase | Vector similarity search |

### Database Schema

#### Key Tables:

```sql
-- Users allowed to sign up (whitelist)
allowed_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  reg_number TEXT UNIQUE,
  role TEXT, -- 'student' or 'instructor'
  department TEXT,
  faculty TEXT,
  level TEXT,
  created_at TIMESTAMP
)

-- User profiles (created after sign up)
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  full_name TEXT,
  reg_number TEXT,
  role TEXT,
  face_encoding FLOAT[], -- 512-dimensional vector
  is_face_registered BOOLEAN DEFAULT false,
  department TEXT,
  faculty TEXT,
  level TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Courses/Classes
classes (
  id UUID PRIMARY KEY,
  instructor_id UUID REFERENCES profiles,
  course_code TEXT,
  title TEXT,
  description TEXT,
  schedule JSONB, -- e.g., {"Mon": "9:00 AM", "Wed": "9:00 AM"}
  department TEXT,
  level TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
)

-- Student enrollments
enrollments (
  student_id UUID REFERENCES profiles,
  class_id UUID REFERENCES classes,
  enrolled_at TIMESTAMP,
  PRIMARY KEY (student_id, class_id)
)

-- Attendance sessions (started by instructors)
attendance_sessions (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes,
  instructor_id UUID REFERENCES profiles,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  late_threshold_minutes INTEGER DEFAULT 15
)

-- Individual attendance records
attendance_logs (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES profiles,
  class_id UUID REFERENCES classes,
  session_id UUID REFERENCES attendance_sessions,
  timestamp TIMESTAMP DEFAULT now(),
  status TEXT, -- 'present', 'late', 'absent'
  confidence FLOAT, -- face match confidence (0-100)
  created_at TIMESTAMP
)
```

### API Endpoints

#### Face Recognition API (`apps/api`):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/` | Health check |
| `POST` | `/register-face` | Register a new face (stores embedding) |
| `POST` | `/verify-face` | Verify face against database |
| `POST` | `/validate-face` | Quick face quality check (no matching) |

#### Supabase RPC Functions:

| Function | Purpose |
|----------|---------|
| `check_email_exists(email)` | Check if email is already registered |
| `check_reg_number_exists(reg_number)` | Check if student ID is already used |
| `match_face(query_embedding, threshold, count)` | Find matching face in database |

---

## Deployment

### Component Deployment:

| Component | Recommended Platform | Notes |
|-----------|---------------------|-------|
| Student Portal | Vercel | Static site, easy GitHub deploy |
| Face API | Render / Railway | Needs Python + large ML models (~300MB) |
| Mobile App | EAS Build (Expo) | Generates APK/IPA |
| Database | Supabase | Managed PostgreSQL |

### Environment Variables:

#### Face API (Production):
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SECRET_KEY=your-jwt-secret-key
ALLOWED_ORIGINS_STR=*
ENVIRONMENT=production
```

#### Mobile App:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
EXPO_PUBLIC_FACE_API_URL=https://your-api.onrender.com
```

---

## Security

### Authentication Flow:

1. **Sign Up/Login:** Supabase Auth issues JWT token
2. **API Calls:** Token sent in `Authorization: Bearer <token>` header
3. **Face API:** Validates token against Supabase before processing
4. **Database:** Row Level Security (RLS) policies restrict data access

### Face Data Protection:

- **No photos stored:** Only mathematical embeddings (512 numbers)
- **Embeddings are not reversible:** Cannot reconstruct face from vector
- **User-specific:** Students can only register/verify their own face
- **Encrypted at rest:** Supabase encrypts all data

### Row Level Security Examples:

```sql
-- Students can only see their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Students can only mark their own attendance
CREATE POLICY "Students can insert own attendance"
ON attendance_logs FOR INSERT
WITH CHECK (student_id = auth.uid());
```

---

## Quick Reference

### For Students:
1. Register on web portal with university email
2. Download mobile app and sign up with same email
3. Register face in profile settings
4. When instructor starts session, mark attendance with face

### For Instructors:
1. Get account created by admin
2. Log in to mobile app
3. Create classes and enroll students
4. Start attendance sessions (manual or timed)
5. View attendance reports

### For Developers:
1. Clone repo: `git clone https://github.com/bwire-official/Attenon.git`
2. Install dependencies: `pnpm install`
3. Set up `.env` files in each app
4. Run API: `cd apps/api && uvicorn app.main:app --reload`
5. Run Mobile: `cd apps/mobile && npx expo start`
6. Run Portal: `cd apps/student-portal && npm run dev`

---

## Support

For issues or questions, please open a GitHub issue or contact the development team.

---

*Last updated: January 2026*
