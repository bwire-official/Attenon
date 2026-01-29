import { Platform, LogBox } from 'react-native';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from './session';

// Ignore specific expo module errors in dev
LogBox.ignoreLogs([
    'Cannot find native module',
    'ExpoPushTokenManager',
    'ExpoDevice',
]);

// Lazy-loaded notification modules to avoid native module errors at startup
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let isNativeModuleAvailable: boolean | null = null;
let initPromise: Promise<boolean> | null = null;

// Initialize modules lazily - only runs once
const initializeModules = async (): Promise<boolean> => {
    if (isNativeModuleAvailable !== null) {
        return isNativeModuleAvailable;
    }

    if (initPromise) {
        return initPromise;
    }

    initPromise = (async () => {
        // Temporarily suppress console.error for specific expo errors only during module loading
        const originalConsoleError = console.error;
        const suppressedErrors = ['ExpoPushTokenManager', 'ExpoDevice', 'Native module'];
        console.error = (...args: any[]) => {
            const message = args[0]?.toString?.() || '';
            if (suppressedErrors.some(err => message.includes(err))) {
                return; // Suppress this error
            }
            originalConsoleError.apply(console, args);
        };

        try {
            const [notifModule, deviceModule] = await Promise.all([
                import('expo-notifications').catch(() => null),
                import('expo-device').catch(() => null),
            ]);

            if (!notifModule || !deviceModule) {
                isNativeModuleAvailable = false;
                return false;
            }

            // Test if native module actually works
            try {
                await notifModule.getPermissionsAsync();
            } catch (testError: any) {
                if (testError?.message?.includes('Native module') || 
                    testError?.message?.includes('ExpoPushTokenManager') ||
                    testError?.message?.includes('ExpoDevice')) {
                    isNativeModuleAvailable = false;
                    return false;
                }
            }

            Notifications = notifModule;
            Device = deviceModule;

            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
            });

            isNativeModuleAvailable = true;
            return true;
        } catch {
            isNativeModuleAvailable = false;
            return false;
        } finally {
            // Restore original console.error
            console.error = originalConsoleError;
        }
    })();

    return initPromise;
};

export interface AttendanceNotificationData {
    screen: 'self-attendance';
    sessionId: string;
    classId: string;
    courseName?: string;
}

// Register for push notifications and store token in Supabase profiles table
// Returns null if native modules not available (Expo Go or dev environment)
export const registerForPushNotifications = async (): Promise<string | null> => {
    const available = await initializeModules();
    if (!available || !Notifications || !Device) {
        // Native modules not available - silently skip in dev
        return null;
    }

    if (!Device.isDevice) {
        // Emulator/simulator - push notifications won't work
        return null;
    }

    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '4c1b86e1-fe1c-4c59-a1f6-2c3aed8fb97b',
        });
        const pushToken = tokenData.data;

        // Store token in Supabase profiles table
        const user = await getCurrentUser();
        if (user) {
            const { error } = await supabase
                .from('profiles')
                .update({ push_token: pushToken })
                .eq('id', user.id);
            if (error) {
                console.error('[Push Notifications] Failed to update push token:', {
                    userId: user.id,
                    error: error.message,
                });
            }
        }

        // Set up Android notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('attendance', {
                name: 'Attendance Alerts',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#0EA5E9',
            });
        }

        return pushToken;
    } catch (error: any) {
        // Silently fail - push notifications just won't work
        if (error?.message?.includes('Native module') || error?.message?.includes('ExpoPushTokenManager')) {
            isNativeModuleAvailable = false;
        }
        return null;
    }
};

// Add a listener for notification responses (when user taps notification)
// Returns a cleanup function (no-op if native modules unavailable)
export const addNotificationResponseListener = (
    onAttendanceNotification: (data: AttendanceNotificationData) => void
): (() => void) => {
    let subscription: any = null;
    let isCancelled = false;

    // Initialize async then add listener if available
    initializeModules().then((available) => {
        if (!available || !Notifications || isCancelled) return;

        try {
            const sub = Notifications.addNotificationResponseReceivedListener((response) => {
                const data = response.notification.request.content.data as any;
                if (data?.screen === 'self-attendance' && data?.sessionId) {
                    onAttendanceNotification({
                        screen: data.screen,
                        sessionId: data.sessionId,
                        classId: data.classId,
                        courseName: data.courseName,
                    });
                }
            });

            if (isCancelled) {
                sub.remove();
            } else {
                subscription = sub;
            }
        } catch {
            // Silently fail
        }
    });

    return () => {
        isCancelled = true;
        if (subscription) {
            subscription.remove();
        }
    };
};

// Add a listener for notifications received while app is in foreground
export const addNotificationReceivedListener = (
    onNotification: (notification: any) => void
): (() => void) => {
    let subscription: any = null;
    let isCancelled = false;

    initializeModules().then((available) => {
        if (!available || !Notifications || isCancelled) return;

        try {
            const sub = Notifications.addNotificationReceivedListener(onNotification);
            if (isCancelled) {
                sub.remove();
            } else {
                subscription = sub;
            }
        } catch {
            // Silently fail
        }
    });

    return () => {
        isCancelled = true;
        if (subscription) {
            subscription.remove();
        }
    };
};

// Get the last notification response (for handling app launch from notification)
export const getLastNotificationResponse = async (): Promise<AttendanceNotificationData | null> => {
    const available = await initializeModules();
    if (!available || !Notifications) {
        return null;
    }

    try {
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
            const data = response.notification.request.content.data as any;
            if (data?.screen === 'self-attendance' && data?.sessionId) {
                return {
                    screen: data.screen,
                    sessionId: data.sessionId,
                    classId: data.classId,
                    courseName: data.courseName,
                };
            }
        }
        return null;
    } catch {
        // Silently fail
        return null;
    }
};
