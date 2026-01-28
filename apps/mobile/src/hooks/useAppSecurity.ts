import { useRef, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { setAppLocked, shouldShowLockScreen, hasPIN } from '../services/security';

export const useAppSecurity = (currentScreen: string, onShowLockScreen: () => void) => {
    const currentScreenRef = useRef(currentScreen);

    useEffect(() => {
        currentScreenRef.current = currentScreen;
    }, [currentScreen]);

    useEffect(() => {
        if (Platform.OS === 'web') return;

        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            const pinExists = await hasPIN();
            if (!pinExists) return;

            const current = currentScreenRef.current;
            const isSystemScreen = current === 'login' || current === 'splash' || current === 'app-unlock';

            if (nextAppState === 'background') {
                if (!isSystemScreen) {
                    await setAppLocked(true);
                }
            } else if (nextAppState === 'active') {
                // Delay the check slightly to avoid momentary flickers during transitions/navigation
                setTimeout(async () => {
                    // Re-check AppState and current screen to ensure we are still in a state that requires locking
                    if (AppState.currentState !== 'active') return;

                    const updatedCurrent = currentScreenRef.current;
                    const updatedIsSystem = updatedCurrent === 'login' || updatedCurrent === 'splash' || updatedCurrent === 'app-unlock';

                    if (updatedIsSystem) return;

                    const isLocked = await shouldShowLockScreen();
                    if (isLocked) {
                        onShowLockScreen();
                    }
                }, 400);
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);
};
