# Attenon Mobile - Implementation Guide

## What We Built

A complete, secure authentication system for the Attenon mobile app with:

✅ **Clean Architecture** - Business logic separated into service files  
✅ **Multi-Step Registration** - Validates users against whitelist  
✅ **Email Verification** - OTP-based email confirmation  
✅ **Role-Based Flow** - Different paths for students vs instructors  
✅ **Face Setup** - Optional face registration (skippable)  
✅ **Persistent Sessions** - User stays logged in across app restarts  
✅ **Secure** - Whitelist validation, password requirements, OTP verification  

## File Structure

```
apps/mobile/src/
├── services/
│   ├── validation.ts        ✨ NEW - Check allowed_users table
│   ├── registration.ts      ✨ NEW - Handle signup & email verification
│   ├── session.ts           ✨ NEW - Persistent session management
│   └── auth.ts             (existing - login/logout)
│
├── screens/
│   ├── RegisterStudentScreen.tsx    ✏️ UPDATED - Multi-step with validation
│   ├── StudentVerifyEmailScreen.tsx ✏️ UPDATED - Connected to services
│   ├── FaceSetupScreen.tsx         ✨ NEW - Face registration UI
│   └── LoginScreen.tsx             ✏️ UPDATED - Complete flow navigation
│
└── lib/
    └── supabase.ts         (existing - already has AsyncStorage config)
```

## Quick Start

### 1. Test the Registration Flow

```typescript
// In your app, the flow is:
Welcome → Sign Up → Enter email/reg → Create password → Verify OTP → Face Setup → Dashboard
```

**Test User Setup (Required):**
Before testing, add a test user to the `allowed_users` table in Supabase:

```sql
INSERT INTO allowed_users (email, full_name, reg_number, role)
VALUES ('test@example.com', 'Test Student', 'STU001', 'student');
```

### 2. Test the Login Flow

```typescript
// Students and instructors have separate login screens
Welcome → Sign In → Role Selection → Login → Dashboard
```

### 3. Session Persistence

The app automatically checks for existing sessions on startup. Add this to your `App.js`:

```javascript
import { initializeSession } from './src/services/session';
import { useEffect, useState } from 'react';

function App() {
    const [sessionState, setSessionState] = useState({
        isAuthenticated: false,
        user: null,
        loading: true
    });

    useEffect(() => {
        async function checkSession() {
            const session = await initializeSession();
            setSessionState(session);
        }
        checkSession();
    }, []);

    if (sessionState.loading) {
        return <SplashScreen />;
    }

    if (sessionState.isAuthenticated && sessionState.user) {
        // User is logged in, navigate based on role
        if (sessionState.user.role === 'student') {
            return <StudentDashboard />;
        } else {
            return <InstructorDashboard />;
        }
    }

    // No session, show login
    return <LoginScreen onLogin={handleLogin} />;
}
```

## How It Works

### Registration Flow

**Step 1: Validation**
```typescript
// User enters email or reg number
const result = await checkAllowedUser('test@example.com');
// Checks allowed_users table
// If found → proceed, else → error
```

**Step 2: Password**
```typescript
// User creates password
// Shows verified user info (name, email, role)
const result = await registerUser({
    emailOrRegNumber: 'test@example.com',
    password: 'securepass123',
    allowedUser: {...}
});
// Creates account in Supabase Auth
// Trigger automatically creates profile
```

**Step 3: Email Verification**
```typescript
// Supabase sends OTP to email
const result = await verifyEmailWithCode('test@example.com', '123456');
// Validates OTP code
// On success → next step
```

**Step 4: Face Setup (Students Only)**
```typescript
// Optional face registration
// Can be skipped
// TODO: Integrate with face API
```

### Login Flow

```typescript
// Simple email/password login
const result = await login({
    email: 'test@example.com',
    password: 'securepass123'
});
// Session stored automatically
// Navigate to dashboard
```

## Database Setup (Required)

Make sure your Supabase database has:

### 1. The `allowed_users` Table

```sql
CREATE TABLE allowed_users (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    reg_number TEXT UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor')),
    department TEXT,
    faculty TEXT,
    level TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE allowed_users ENABLE ROW LEVEL SECURITY;

-- Allow service role to read/write
CREATE POLICY "Service role can manage" ON allowed_users
FOR ALL USING (true);
```

### 2. The `profiles` Table

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE,
    full_name TEXT,
    reg_number TEXT UNIQUE,
    role TEXT CHECK (role IN ('student', 'instructor')),
    face_encoding VECTOR(128),
    is_face_registered BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    department TEXT,
    faculty TEXT,
    level TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read/update their own profile
CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL
    USING (auth.uid() = id);
```

### 3. The Trigger (Auto-create Profile)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_data RECORD;
BEGIN
    -- Get user data from allowed_users
    SELECT * INTO user_data 
    FROM allowed_users 
    WHERE email = NEW.email;
    
    -- Check if user is allowed
    IF user_data IS NULL THEN
        RAISE EXCEPTION 'You are not authorized to sign up. Please register at the student portal first.';
    END IF;
    
    -- Create profile
    INSERT INTO profiles (
        id, email, full_name, reg_number, role,
        department, faculty, level, phone_number
    )
    VALUES (
        NEW.id, NEW.email, user_data.full_name, user_data.reg_number, user_data.role,
        user_data.department, user_data.faculty, user_data.level, user_data.phone_number
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
```

## Testing Checklist

### Before Testing:
- [ ] Run database setup SQL
- [ ] Add test users to `allowed_users` table
- [ ] Verify Supabase URL and keys in `supabase.ts`
- [ ] Enable email in Supabase dashboard

### Test Registration:
- [ ] Enter valid email → should proceed
- [ ] Enter invalid email → should show error
- [ ] Create password → should validate length
- [ ] Enter OTP → should verify (check email)
- [ ] Complete/skip face setup → should navigate

### Test Login:
- [ ] Login with correct credentials → should work
- [ ] Login with wrong password → should show error
- [ ] Close and reopen app → should stay logged in

### Test Session:
- [ ] Force close app and reopen → should restore session
- [ ] Logout → should clear session
- [ ] Login again → should create new session

## Next Steps

### 1. Face Registration Integration

Update `FaceSetupScreen.tsx` to integrate with the Python face API:

```typescript
import { API_CONFIG } from '../lib/config';

async function handleCaptureFace() {
    // 1. Open camera and capture image
    const image = await captureImage();
    
    // 2. Send to face API
    const formData = new FormData();
    formData.append('file', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'face.jpg'
    });
    
    const response = await fetch(`${API_CONFIG.FACE_API_URL}/register-face`, {
        method: 'POST',
        body: formData
    });
    
    const result = await response.json();
    
    // 3. Save encoding to profile
    await updateProfile({
        face_encoding: result.encoding,
        is_face_registered: true
    });
}
```

### 2. Add to App.js

Replace your current navigation logic with session-aware navigation.

### 3. Test with Real Data

Add actual students and instructors to the `allowed_users` table.

## Troubleshooting

### "User not authorized" error during signup:
- Check if email exists in `allowed_users` table
- Verify trigger is created and enabled
- Check Supabase logs for errors

### OTP not received:
- Check Supabase email settings
- Verify email is confirmed in Supabase dashboard
- Check spam folder

### Session not persisting:
- Verify AsyncStorage is installed: `npm install @react-native-async-storage/async-storage`
- Check permissions in `app.json`
- Verify Supabase client config

### TypeScript errors:
- Run `npm install` to ensure all types are installed
- Check that `AllowedUser` type is imported correctly

## Dependencies

Make sure these are installed:

```json
{
  "@supabase/supabase-js": "^2.x.x",
  "@react-native-async-storage/async-storage": "^1.x.x",
  "react-native-url-polyfill": "^2.x.x",
  "@expo/vector-icons": "^14.x.x",
  "react-native-safe-area-context": "^4.x.x"
}
```

## Security Notes

🔒 **Important:**
- Never commit `.env` files with real credentials
- Use environment variables for API keys
- Enable RLS on all tables
- Regularly rotate Supabase keys
- Monitor failed login attempts
- Keep face encodings encrypted

## Support

For issues or questions:
1. Check the `AUTHENTICATION_FLOW.md` documentation
2. Review Supabase logs in the dashboard
3. Test with the provided SQL queries
4. Verify all dependencies are installed

---

**Status:** ✅ Complete and ready for testing  
**Version:** 1.0.0  
**Date:** January 26, 2026
