# Face Detection Migration & Native Module Fix

## Overview
Due to `expo-face-detector` being deprecated and removed in SDK 54, we have migrated the face verification feature to use `react-native-vision-camera` (v4) with `react-native-vision-camera-face-detector`. This offers better performance and frame processing capabilities.

## Changes Made
1.  **Dependencies**:
    *   Removed: `expo-face-detector`, `expo-camera`
    *   Added: `react-native-vision-camera`, `react-native-worklets-core`, `react-native-vision-camera-face-detector`
    *   **Babel Fix**: Added several `@babel/plugin-*` packages to `package.json` to satisfy internal requirements of `react-native-worklets-core`.
    *   Updated: `babel.config.js` to include the worklets plugin.

2.  **Configuration**:
    *   Updated `app.json` and `app.config.js` to include the `react-native-vision-camera` config plugin.
    *   Note: `react-native-worklets-core` does *not* need an Expo config plugin, so it was removed from the plugins list to fix the prebuild error.

3.  **Code Refactoring**:
    *   `src/services/local-face-detector.ts`: Adapted interfaces to be generic (Vision Camera compatible).
    *   `src/hooks/useFaceValidation.ts`: Rewritten to process frames directly from Vision Camera's Frame Processor.
    *   `src/screens/FaceSetupScreen.tsx`: Migrated to Vision Camera.
    *   `src/screens/FaceAttendanceScreen.tsx`: Migrated to Vision Camera.

## Next Steps for You
1.  **Rebuild Native App**: Since native dependencies have changed, you **MUST** rebuild your development client.
    ```bash
    npx expo run:android
    # or for iOS
    npx expo run:ios
    ```
2.  **Verify Permissions**: The new camera library handles permissions slightly differently but logic has been updated in the code.
3.  **Test**: Launch the app and go to Face Setup. Ensure the camera opens and face detection provides feedback ("Center your face", "Smile", etc.).

## Troubleshooting
*   **Prompt Error**: If you see `Error: Cannot find module './datepart'` during prebuild, it is a known issue with the `prompts` library in your `node_modules`. Running with `CI=1` bypassed it during our fix:
    ```powershell
    $env:CI="1"; npx expo prebuild --clean
    ```
