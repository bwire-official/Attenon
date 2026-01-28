# Attenon - Project Documentation

## Project Overview

**Project Name:** Attenon

**Description:** A biometric school attendance system using Face Verification.

**Tech Stack:**
- **Frontend:** React Native (Expo)
- **Backend:** Python (FastAPI + face_recognition)
- **Database/Auth:** Supabase (PostgreSQL with pgvector)

---

## 1. System Architecture

The system follows a **"Three-Legged" architecture** to separate concerns between the Mobile App, the Database/Auth, and the AI Processing.

### The Three Pillars

#### 1. Mobile App (Expo/React Native)
- **Role:** The User Interface (Dumb Terminal)
- **Responsibilities:**
  - Captures photos
  - Handles navigation (Student vs. Instructor)
  - Displays results
- **Logic:** Minimal. It mostly fetches data and sends images.

#### 2. The Brain (Supabase)
- **Role:** The Source of Truth
- **Responsibilities:**
  - Authentication
  - Data Storage (Users, Classes, Logs)
  - Business Logic (via SQL Functions)
- **Key Feature:** Uses `pgvector` to store face embeddings

#### 3. The Eye (Python API)
- **Role:** The AI Processor
- **Responsibilities:**
  - Receives an image
  - Detects a face
  - Converts it to a 512-float vector
  - Returns the vector
- **Note:** It does not store business data

---

## 2. Database Schema (Supabase)

### A. Extensions

Enable the vector extension to store face data:

```sql
create extension if not exists vector;
```

### B. Core Tables

#### 1. `allowed_users` (The Whitelist)

Control who can sign up.

```sql
create table allowed_users (
  email text primary key,
  full_name text not null,
  role text not null check (role in ('student', 'instructor'))
);
```

#### 2. `profiles` (Extended User Data)

Stores the user's role and their face "fingerprint".

```sql
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text check (role in ('student', 'instructor')),
  face_encoding vector(512), -- The 512 numbers from the Python AI (InsightFace)
  is_face_registered boolean default false
);
```

#### 3. `classes` & `enrollments`

```sql
create table classes (
  id uuid default gen_random_uuid() primary key,
  instructor_id uuid references profiles(id),
  course_code text not null, -- e.g., "CSC 101"
  title text not null
);

create table enrollments (
  student_id uuid references profiles(id),
  class_id uuid references classes(id),
  primary key (student_id, class_id)
);
```

#### 4. `attendance_logs`

Records the actual event of attending.

```sql
create table attendance_logs (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references profiles(id),
  class_id uuid references classes(id),
  timestamp timestamptz default now(),
  status text check (status in ('present', 'late', 'absent'))
);
```

### C. Automation (Triggers)

Automatically assign roles on sign-up based on the whitelist.

```sql
create or replace function handle_new_user() 
returns trigger as $$
declare
  user_role text;
  user_name text;
begin
  select role, full_name into user_role, user_name from public.allowed_users where email = new.email;
  
  if user_role is null then
    raise exception 'You are not authorized to join this school.';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, user_name, user_role);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

## 3. The Python AI Server (FastAPI)

This server acts as a middleman. It does not touch the database directly; it computes the math and passes it to Supabase (or compares it).

**Tech:** Python 3.9+, FastAPI, face_recognition, numpy

### API Endpoints

#### `POST /register-face`

**Input:** A photo (file) + User ID

**Process:**
1. Detect face
2. Check if multiple faces exist (reject if > 1)
3. Generate 512-float vector

**Output:** Returns the vector

**Action:** The Mobile App then sends this vector to Supabase to save in `profiles.face_encoding`

#### `POST /verify-face`

**Input:** A photo (file)

**Process:**
1. Generate 512-float vector from the live photo
2. Call Supabase RPC `match_face` (see below) to find the closest vector in the DB

**Output:**
```json
{
  "match": true,
  "user_id": "...",
  "confidence": 98.5
}
```

---

## 4. Business Logic (User Flows)

### Flow A: Registration (The Security Gate)

1. Admin adds student email to `allowed_users` table via Supabase Dashboard
2. Student downloads app and signs up with email
3. Supabase Trigger checks whitelist → Creates Profile
4. App detects `is_face_registered = false`
5. App locks user into "Face Registration Screen"
6. Student takes selfie
7. Python processes selfie → Returns Vector
8. App saves Vector to Supabase → Sets `is_face_registered = true`
9. App unlocks Dashboard

### Flow B: Attendance (Kiosk Mode)

1. Instructor selects Class → Clicks "Start Session"
2. Phone is placed on a stand facing the door
3. Student walks up
4. App captures frame automatically (or on button press)
5. Python converts face to vector
6. Supabase compares vector to database
7. **Result:**
   - **Match:** Screen flashes GREEN ("Welcome, David"). Log saved to `attendance_logs`
   - **No Match:** Screen flashes RED ("Unknown User")

---

## 5. Security & Deployment

### RLS Policies (Supabase Security)

Run these in Supabase SQL Editor to protect data:

```sql
alter table profiles enable row level security;

-- 1. Users can read their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

-- 2. Instructors can view ALL student profiles (for attendance)
create policy "Instructors can view students" on profiles
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'instructor')
  );
```

### Deployment Strategy

| Component | Platform | Notes |
|-----------|----------|-------|
| **Mobile App** | Google Play Store / Apple App Store | Deploy via Expo EAS |
| **Python API** | Render or Railway | Dockerized. These platforms support C++ libraries required for face recognition |
| **Database** | Supabase | Managed service |

---

## 6. Future Roadmap

### Phase 1: Enhanced Security
**Liveness Detection:**
- Use Google ML Kit on the frontend to detect blinking before capturing the photo
- Prevents photo-of-a-photo attacks

### Phase 2: Offline Capability
**Offline Mode:**
- Cache the `face_encoding` of all students in the class onto the instructor's device at the start of the session
- Perform matching locally without internet
- Sync attendance logs when connection is restored

---

## 7. Current Project Structure

```
Attenon/
├── apps/
│   ├── api/                    # Python FastAPI Backend
│   │   ├── app/
│   │   │   ├── api/           # API routes
│   │   │   ├── core/          # Config, security, database
│   │   │   ├── models/        # SQLAlchemy models
│   │   │   ├── schemas/       # Pydantic schemas
│   │   │   └── main.py        # Entry point
│   │   └── requirements.txt
│   └── mobile/                 # React Native (Expo) App
│       ├── src/
│       │   ├── screens/       # UI screens
│       │   ├── components/    # Reusable components
│       │   ├── navigation/    # Navigation setup
│       │   └── services/      # API calls
│       └── App.js
└── docs/                       # Documentation

```

---

## 8. Development Workflow

### Prerequisites
- **Mobile:** Node.js 18+, Expo CLI
- **Backend:** Python 3.11+, pip
- **Database:** Supabase account

### Setup Instructions

#### Backend (Python API)
```bash
cd apps/api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Configure .env with Supabase credentials
uvicorn app.main:app --reload
```

#### Mobile App
```bash
cd apps/mobile
npm install
npm start
```

#### Database Setup
1. Create Supabase project
2. Run SQL scripts from Section 2
3. Configure RLS policies from Section 5
4. Add test users to `allowed_users` table

---

## 9. API Documentation

### Backend API
- **Base URL:** `http://localhost:8000`
- **Health Check:** `GET /`
- **Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

### Key Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /register-face` - Face registration
- `POST /verify-face` - Face verification
- `GET /api/v1/attendance` - Attendance logs
- `GET /api/v1/courses` - Course list

---

## 10. Testing Strategy

### Unit Tests
- Python: `pytest` for API endpoints
- React Native: Jest for components

### Integration Tests
- Test face registration flow
- Test attendance marking flow
- Test authentication flow

### Security Tests
- Verify RLS policies
- Test unauthorized access attempts
- Validate face matching accuracy

---

## Contact & Support

For questions or issues, please refer to the project repository or contact the development team.

---

**Last Updated:** January 2026
