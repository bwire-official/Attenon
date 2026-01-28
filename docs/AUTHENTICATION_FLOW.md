# Attenon Mobile App - Authentication Flow Documentation

## Overview
This document explains the complete authentication flow implemented for the Attenon mobile app, focusing on secure, role-based registration and login with persistent sessions.

## Architecture Overview

### Service Layer (Clean Code Separation)
All business logic is separated into dedicated service files:

1. **`services/validation.ts`** - User validation against allowed_users table
2. **`services/registration.ts`** - User registration and email verification
3. **`services/session.ts`** - Session management and persistence
4. **`services/auth.ts`** - Authentication (login/logout)

### Screen Components
UI screens are kept clean with minimal logic:

- `RegisterStudentScreen.tsx` - Multi-step registration
- `StudentVerifyEmailScreen.tsx` - Email OTP verification
- `FaceSetupScreen.tsx` - Face registration (skippable)
- `StudentLoginScreen.tsx` - Student login
- `InstructorLoginScreen.tsx` - Instructor login
- `LoginScreen.tsx` - Main entry point with navigation

## Registration Flow (Students)

### Step 1: Email/Reg Number Validation
**Screen:** `RegisterStudentScreen` (Step 1)

1. User enters email or registration number
2. Clicks "Continue"
3. System calls `checkAllowedUser()` from `validation.ts`
4. Queries `allowed_users` table in Supabase
5. If user exists → proceed to Step 2
6. If not found → shows error: "Visit student portal to register first"

**Database Query:**
```sql
SELECT * FROM allowed_users 
WHERE email = ? OR reg_number = ?
```

### Step 2: Password Creation
**Screen:** `RegisterStudentScreen` (Step 2)

1. Shows verified user info (name, email, role)
2. User creates password (min 8 characters)
3. User confirms password
4. Clicks "Create Account"
5. System calls `registerUser()` from `registration.ts`
6. Creates auth user in Supabase Auth
7. Database trigger automatically creates profile record
8. Navigates to email verification

**Supabase Trigger:**
The `handle_new_user()` trigger automatically:
- Validates user is in `allowed_users`
- Creates profile with role and user data
- Links to auth.users table

### Step 3: Email Verification
**Screen:** `StudentVerifyEmailScreen`

1. Supabase sends 6-digit OTP to user's email
2. User enters OTP code
3. System calls `verifyEmailWithCode()` from `registration.ts`
4. Supabase validates OTP
5. On success → navigates based on role:
   - **Students:** Go to Face Setup
   - **Instructors:** Go directly to Dashboard

**Features:**
- Auto-submit when 6 digits entered
- Paste support for OTP
- Resend code functionality
- Visual feedback (success/error messages)

### Step 4: Face Setup (Students Only - Skippable)
**Screen:** `FaceSetupScreen`

1. Shows instructions for face capture
2. User clicks "Capture Face"
3. TODO: Camera integration with face API
4. On success → "Complete Setup" button appears
5. User can skip this step

**Options:**
- Complete setup → marks `is_face_registered = true`
- Skip for now → proceeds to dashboard anyway

**Notes:**
- Only students see this screen
- Instructors skip directly to dashboard
- Face registration can be done later from settings

## Login Flow

### Student Login
**Screen:** `StudentLoginScreen`

1. User enters email
2. User enters password
3. System calls `login()` from `auth.ts`
4. Supabase validates credentials
5. Fetches user profile with role
6. Stores session in AsyncStorage (persistent)
7. Navigates to Student Dashboard

### Instructor Login
**Screen:** `InstructorLoginScreen`

1. User enters email or staff ID
2. User enters password
3. System validates credentials
4. Navigates to Instructor Dashboard

## Session Management

### Persistent Sessions
**Service:** `session.ts`

The app uses Supabase's built-in session management with AsyncStorage:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
```

### Key Features:
1. **Auto-refresh:** Tokens refresh automatically before expiry
2. **Persistence:** Session survives app restarts
3. **Security:** Tokens stored in AsyncStorage (Note: AsyncStorage is unencrypted on Android. Use SecureStore for sensitive data).

### Session Functions:
```typescript
// Check if user is already logged in (on app start)
const session = await initializeSession();

// Get current user
const user = await getCurrentUser();

// Check if session is still valid
const isValid = await isSessionValid();

// Logout
await clearSession();
```

## App Startup Flow

**Recommended Implementation in `App.js`:**

```javascript
useEffect(() => {
    async function checkSession() {
        const sessionState = await initializeSession();
        
        if (sessionState.isAuthenticated && sessionState.user) {
            // User is logged in, navigate based on role
            if (sessionState.user.role === 'student') {
                navigateToStudentDashboard();
            } else {
                navigateToInstructorDashboard();
            }
        } else {
            // No active session, show login screen
            navigateToLogin();
        }
    }
    
    checkSession();
}, []);
```

## Security Features

### 1. Whitelist Validation
- Only users in `allowed_users` can register
- Email/reg number verified before account creation
- Prevents unauthorized signups

### 2. Role-Based Access
- User role stored in profile
- Different flows for students vs instructors
- Dashboard access based on role

### 3. Email Verification
- OTP sent to registered email
- Prevents fake accounts
- Supabase handles OTP generation and validation

### 4. Password Requirements
- Minimum 8 characters
- Validated on client and server
- Securely hashed by Supabase Auth

### 5. Session Security
- Tokens auto-refresh
- Encrypted storage
- Automatic expiry handling

## Database Schema

### allowed_users Table
```sql
- email (PK)
- full_name
- reg_number (nullable, unique)
- role (student | instructor)
- department (nullable)
- faculty (nullable)
- level (nullable)
- phone_number (nullable)
- created_at
```

### profiles Table
```sql
- id (FK to auth.users)
- email
- full_name
- reg_number
- role (student | instructor)
- face_encoding (vector512, nullable)
- is_face_registered (boolean)
- avatar_url
- department
- faculty
- level
- phone_number
- created_at
- updated_at
```

## Navigation States

### LoginScreen States:
- **Default:** Welcome screen (Sign In / Sign Up)
- **Role Selection:** Choose Student or Instructor
- **Instructor Login:** InstructorLoginScreen
- **Student Login:** StudentLoginScreen
- **Registration:** RegisterStudentScreen
- **Email Verification:** StudentVerifyEmailScreen
- **Face Setup:** FaceSetupScreen

### Flow Chart:
```
Welcome Screen
    ├─> Sign In
    │   └─> Role Selection
    │       ├─> Instructor Login → Instructor Dashboard
    │       └─> Student Login → Student Dashboard
    │
    └─> Sign Up
        └─> Registration (Step 1: Validate)
            └─> Registration (Step 2: Password)
                └─> Email Verification
                    ├─> Student → Face Setup → Student Dashboard
                    └─> Instructor → Instructor Dashboard
```

## Error Handling

### Validation Errors:
- Email/reg number not in allowed_users
- Invalid email format
- Password too short
- Passwords don't match

### Registration Errors:
- Email already registered
- Network errors
- Database errors

### Verification Errors:
- Invalid OTP code
- Expired OTP code
- Too many attempts

### Session Errors:
- Session expired
- Invalid token
- Network issues

All errors display user-friendly messages with appropriate icons and styling.

## Testing Checklist

### Registration Flow:
- [ ] Validate with correct email/reg number
- [ ] Validate with incorrect email/reg number
- [ ] Create password (valid and invalid)
- [ ] Verify email with correct OTP
- [ ] Verify email with incorrect OTP
- [ ] Resend OTP functionality
- [ ] Complete face setup
- [ ] Skip face setup
- [ ] Role-based navigation

### Login Flow:
- [ ] Student login with correct credentials
- [ ] Student login with incorrect credentials
- [ ] Instructor login
- [ ] Password visibility toggle
- [ ] Forgot password link

### Session Management:
- [ ] Session persists after app restart
- [ ] Auto-refresh before token expiry
- [ ] Logout clears session
- [ ] Navigate to correct dashboard on startup

## Future Enhancements

1. **Biometric Auth:** Add fingerprint/face ID for quick login
2. **Offline Mode:** Cache user data for offline access
3. **Password Reset:** Implement forgot password flow
4. **Social Auth:** Optional Google/Apple sign-in
5. **2FA:** Two-factor authentication for instructors
6. **Session History:** Track login devices and locations

## Troubleshooting

### Session not persisting:
- Check AsyncStorage permissions
- Verify Supabase client configuration
- Check for logout calls in navigation

### OTP not received:
- Check email in Supabase dashboard
- Verify SMTP settings in Supabase
- Check spam folder

### Face registration fails:
- Ensure face API endpoint is accessible
- Check camera permissions
- Verify image format and size

## API Integration Points

### Supabase:
- Auth: Sign up, sign in, email verification
- Database: Query allowed_users, profiles
- Storage: Avatar images (future)

### Python Face API:
- POST `/register-face` - Register face encoding
- POST `/verify-face` - Verify face for attendance

## Maintenance Notes

### Service Files:
- Keep business logic in services
- Screens should only handle UI/UX
- Use TypeScript types for safety

### Database:
- Monitor allowed_users table
- Keep profiles table synced with auth.users
- Regular backups of face encodings

### Security:
- Rotate API keys regularly
- Monitor failed login attempts
- Review RLS policies in Supabase

---

**Last Updated:** January 26, 2026
**Version:** 1.0.0
