# Environment Variables Setup

## ✅ Fixed: No More Hardcoded Values!

All hardcoded URLs and API keys have been removed and replaced with environment variables.

## Quick Setup

### 1. Install dotenv (if not already installed)

```bash
cd apps/mobile
npm install --save-dev dotenv
```

### 2. Create `.env` file

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

### 3. Fill in your `.env` file

```env
# Supabase Configuration
# Get these from: https://app.supabase.com/project/_/settings/api
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Face Recognition API Configuration
# For local development, use your machine's local IP address
# Example: http://192.168.1.100:8000
# For production, use your deployed API URL
EXPO_PUBLIC_FACE_API_URL=http://localhost:8000
```

### 4. Get Your Supabase Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 5. Restart Expo

After creating/updating `.env`, restart Expo:

```bash
npm start --clear
```

## How It Works

### Configuration Files

1. **`.env`** - Your local environment variables (DO NOT COMMIT THIS)
2. **`.env.example`** - Template file (safe to commit)
3. **`app.config.js`** - Reads from `.env` and makes variables available
4. **`src/lib/supabase.ts`** - Uses environment variables
5. **`src/lib/config.ts`** - Uses environment variables

### Variable Access

The code now reads environment variables in this order:

1. `Constants.expoConfig.extra.*` (from app.config.js)
2. `process.env.EXPO_PUBLIC_*` (direct env access)
3. Fallback to empty string (with error if required)

### Security Notes

✅ **`.env` is in `.gitignore`** - Your secrets are safe  
✅ **`.env.example` is committed** - Template for team  
✅ **No hardcoded values** - All configs use env vars  
✅ **Error on missing values** - App won't start with missing config  

## Troubleshooting

### "Missing Supabase configuration" error

**Solution:** Make sure your `.env` file exists and has the correct variable names:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Variables not loading

1. **Restart Expo** after changing `.env`:
   ```bash
   npm start --clear
   ```

2. **Check variable names** - Must start with `EXPO_PUBLIC_`

3. **Verify app.config.js exists** - Expo needs this to read `.env`

### For Production Builds

When building with EAS Build, you can:

1. **Set secrets in EAS:**
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..."
   ```

2. **Or use app.config.js** - It will read from environment during build

## Migration from Hardcoded Values

If you had the old hardcoded values, here's what changed:

### Before (❌ Hardcoded):
```typescript
const supabaseUrl = 'https://jvcgepjqhbczpaqaajjw.supabase.co';
const supabaseAnonKey = 'eyJhbGci...';
```

### After (✅ Environment Variables):
```typescript
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
                    process.env.EXPO_PUBLIC_SUPABASE_URL || '';
```

## Files Changed

- ✅ `src/lib/supabase.ts` - Now uses env vars
- ✅ `src/lib/config.ts` - Now uses env vars  
- ✅ `app.config.js` - NEW - Reads from .env
- ✅ `.env.example` - NEW - Template file
- ✅ `package.json` - Added dotenv dependency

## Next Steps

1. Create your `.env` file from `.env.example`
2. Add your Supabase credentials
3. Restart Expo
4. Test the app!

---

**Important:** Never commit your `.env` file to git! It contains sensitive credentials.
