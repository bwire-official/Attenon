import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useFonts } from 'expo-font';
import { AnimatedScreen } from './src/components/AnimatedScreen';
import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { InstructorDashboard } from './src/screens/InstructorDashboard';
import { StudentDashboard } from './src/screens/StudentDashboard';
import { StudentSettingsScreen } from './src/screens/StudentSettingsScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { StudentVerifyCodeScreen } from './src/screens/StudentVerifyCodeScreen';
import { StudentResetPasswordScreen } from './src/screens/StudentResetPasswordScreen';
import { StudentVerifyEmailScreen } from './src/screens/StudentVerifyEmailScreen';
import { InstructorForgotPasswordScreen } from './src/screens/InstructorForgotPasswordScreen';
import { InstructorVerifyCodeScreen } from './src/screens/InstructorVerifyCodeScreen';
import { InstructorResetPasswordScreen } from './src/screens/InstructorResetPasswordScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { FaceSetupScreen } from './src/screens/FaceSetupScreen';
import { StudentProfileScreen } from './src/screens/StudentProfileScreen';
import { AttendanceHistoryScreen } from './src/screens/AttendanceHistoryScreen';
import { MyScheduleScreen } from './src/screens/MyScheduleScreen';
import { PINSetupScreen } from './src/screens/PINSetupScreen';
import { AppUnlockScreen } from './src/screens/AppUnlockScreen';
import { FaceAttendanceScreen } from './src/screens/FaceAttendanceScreen';
import { StudentCoursesScreen } from './src/screens/StudentCoursesScreen';
import { StudentSelfAttendanceScreen } from './src/screens/StudentSelfAttendanceScreen';
import { LiveSessionScreen } from './src/screens/LiveSessionScreen';
import { initializeSession, onSessionChange, getCurrentUser } from './src/services/session';
import { shouldShowLockScreen, setAppLocked, hasPIN } from './src/services/security';
import { AppState, Platform } from 'react-native';
import {
  registerForPushNotifications,
  addNotificationResponseListener,
  getLastNotificationResponse,
} from './src/services/push-notifications';
import { supabase } from './src/lib/supabase';
import { CustomAlert } from './src/components/CustomAlert';

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [currentScreen, setCurrentScreen] = useState('splash'); // splash, login, instructor, student, student-settings, student-profile, attendance-history, forgot-password, student-verify-code, student-reset-password, student-verify-email, instructor-forgot-password, instructor-verify-code, instructor-reset-password, notifications, face-setup, pin-setup, app-unlock
  const [previousScreen, setPreviousScreen] = useState('splash');
  const [userRole, setUserRole] = useState('student');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [instructorResetEmail, setInstructorResetEmail] = useState('');
  const [studentResetEmail, setStudentResetEmail] = useState('');
  const [studentVerifyEmail, setStudentVerifyEmail] = useState('');
  const [showUnlockScreen, setShowUnlockScreen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState(null);
  const [selfAttendanceSession, setSelfAttendanceSession] = useState(null); // { sessionId, courseName }
  const [inAppAlert, setInAppAlert] = useState({ visible: false, title: '', message: '', session: null });

  // Refs to track current screen and navigation state without triggering re-renders
  const currentScreenRef = useRef(currentScreen);
  const isNavigatingRef = useRef(false);
  const lockScreenTimeoutRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  const navigateToScreen = (screen) => {
    // Set navigating flag to prevent lock screen during transitions
    isNavigatingRef.current = true;
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
    // Clear navigating flag after animation completes
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 350); // Slightly longer than animation duration (300ms)
  };

  const getNavigationDirection = (from, to) => {
    if (from === 'splash') return 'forward';

    const backScreens = {
      'login': ['forgot-password', 'instructor-forgot-password', 'student-verify-email'],
      'forgot-password': ['student-verify-code'],
      'student-verify-code': ['student-reset-password'],
      'instructor-forgot-password': ['instructor-verify-code'],
      'instructor-verify-code': ['instructor-reset-password'],
      'student': ['student-settings', 'student-profile', 'attendance-history', 'my-schedule', 'face-setup', 'student-courses', 'self-attendance'],
      'student-settings': ['pin-setup'],
      'instructor': ['notifications'],
      'face-attendance': ['my-schedule'],
    };

    const forwardScreens = {
      'forgot-password': ['login'],
      'student-verify-code': ['forgot-password'],
      'student-reset-password': ['student-verify-code'],
      'instructor-forgot-password': ['login'],
      'instructor-verify-code': ['instructor-forgot-password'],
      'instructor-reset-password': ['instructor-verify-code'],
      'student-settings': ['student'],
      'student-profile': ['student'],
      'attendance-history': ['student'],
      'my-schedule': ['student'],
      'face-setup': ['student'],
      'student-courses': ['student'],
      'pin-setup': ['student-settings'],
      'notifications': ['instructor'],
      'student-verify-email': ['login'],
      'my-schedule': ['face-attendance'],
    };

    if (backScreens[from]?.includes(to)) {
      return 'forward';
    }
    if (forwardScreens[from]?.includes(to)) {
      return 'backward';
    }

    return 'forward';
  };



  // Initialize session and set up auth listener
  useEffect(() => {
    if (!fontsLoaded) return;

    let mounted = true;

    async function checkInitialSession() {
      try {
        const state = await initializeSession();
        if (!mounted) return;

        if (state.isAuthenticated && state.user) {
          setUserRole(state.user.role);
          setCurrentUserId(state.user.id);

          if (Platform.OS === 'web') {
            navigateToScreen(state.user.role === 'instructor' ? 'instructor' : 'student');
          } else {
            const hasPin = await hasPIN();
            if (hasPin) {
              await setAppLocked(true);
              setShowUnlockScreen(true);
              setCurrentScreen('app-unlock');
            } else {
              navigateToScreen(state.user.role === 'instructor' ? 'instructor' : 'student');
            }
          }
        } else {
          navigateToScreen('login');
        }
      } catch (error) {
        console.error('Check session error:', error);
        navigateToScreen('login');
      } finally {
        if (mounted) setSessionLoading(false);
      }
    }

    checkInitialSession();

    // Set up real-time auth listener
    const { data: { subscription } } = onSessionChange(async (isAuthenticated, user) => {
      if (!mounted) return;

      if (!isAuthenticated) {
        navigateToScreen('login');
        setUserRole('student');
        setCurrentUserId('');
      } else if (user && currentScreen === 'login') {
        // Only auto-navigate from login screen to dashboard if listener picks up a new session
        setUserRole(user.role);
        setCurrentUserId(user.id);
        navigateToScreen(user.role === 'instructor' ? 'instructor' : 'student');
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fontsLoaded]);

  // Push notifications: register token and handle deep links
  useEffect(() => {
    if (sessionLoading || currentScreen === 'splash' || currentScreen === 'login') return;
    // Only register for students (they receive attendance notifications)
    if (userRole !== 'student') return;

    // Register for push notifications
    registerForPushNotifications();

    // Check if app was launched from notification
    getLastNotificationResponse().then((data) => {
      if (data) {
        handleNavigateToSelfAttendance(data.sessionId, data.courseName);
      }
    });

    // Listen for notification taps while app is running
    const cleanup = addNotificationResponseListener((data) => {
      handleNavigateToSelfAttendance(data.sessionId, data.courseName);
    });

    return cleanup;
  }, [sessionLoading, userRole, currentScreen]);

  // Global In-App Notifications (Supabase Realtime)
  useEffect(() => {
    if (sessionLoading || !fontsLoaded) return;

    let channel = null;

    const setupInAppListener = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        // Subscribe to new notifications for this user
        channel = supabase
          .channel(`global-notifications-${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            async (payload) => {
              const notification = payload.new;

              // Only show immediate alert for new attendance sessions
              if (notification.type === 'attendance_session_started') {
                setInAppAlert({
                  visible: true,
                  title: notification.title,
                  message: notification.message,
                  session: notification.data
                });
              }
              // We could also show toast notifications for other types here
            }
          )
          .subscribe();
      } catch (err) {
        console.error('Error setting up in-app listener:', err);
      }
    };

    setupInAppListener();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [sessionLoading, fontsLoaded]);

  // Handle app state changes (background/foreground) - skip on web
  // Uses refs instead of state to avoid re-subscribing on every navigation
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      // Clear any pending lock screen timeout
      if (lockScreenTimeoutRef.current) {
        clearTimeout(lockScreenTimeoutRef.current);
        lockScreenTimeoutRef.current = null;
      }

      const pinExists = await hasPIN();
      if (!pinExists) return;

      const screen = currentScreenRef.current;
      const isSystemScreen = screen === 'login' || screen === 'splash' || screen === 'app-unlock';

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!isSystemScreen) {
          await setAppLocked(true);
        }
      } else if (nextAppState === 'active') {
        // Add delay before showing lock screen to prevent flashes during navigation
        // This gives time for navigation animations to complete
        lockScreenTimeoutRef.current = setTimeout(async () => {
          // Re-check conditions after delay
          const updatedScreen = currentScreenRef.current;
          const updatedIsSystem = updatedScreen === 'login' || updatedScreen === 'splash' || updatedScreen === 'app-unlock';

          // Don't show lock screen if navigating or already on system screen
          if (isNavigatingRef.current || updatedIsSystem) {
            return;
          }

          const isLocked = await shouldShowLockScreen();
          if (isLocked) {
            setShowUnlockScreen(true);
            setCurrentScreen('app-unlock');
          }
        }, 500); // 500ms delay to allow navigation to complete
      }
    });

    return () => {
      subscription.remove();
      if (lockScreenTimeoutRef.current) {
        clearTimeout(lockScreenTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only subscribe once

  // Handle Android back button - must be before early return to maintain hook order
  useEffect(() => {
    if (!fontsLoaded || sessionLoading) {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Screens that should navigate back instead of closing app
      // Map each screen to its back destination
      const backNavigationMap = {
        'student-settings': 'student',
        'student-profile': 'student',
        'attendance-history': 'student',
        'my-schedule': 'student',
        'face-setup': 'student',
        'student-courses': 'student',
        'pin-setup': 'student-settings',
        'notifications': userRole === 'instructor' ? 'instructor' : 'student',
        'forgot-password': 'login',
        'student-verify-code': 'forgot-password',
        'student-reset-password': 'student-verify-code',
        'student-verify-email': 'login',
        'instructor-forgot-password': 'login',
        'instructor-verify-code': 'instructor-forgot-password',
        'instructor-reset-password': 'instructor-verify-code',
        'face-attendance': 'my-schedule',
      };

      const backScreen = backNavigationMap[currentScreen];
      if (backScreen) {
        navigateToScreen(backScreen);
        return true; // Prevent default back behavior
      }

      // For login and dashboard screens, allow default behavior (close app)
      // This is the expected behavior for root screens
      if (currentScreen === 'login' || currentScreen === 'student' || currentScreen === 'instructor' || currentScreen === 'splash') {
        return false; // Allow default behavior (close app)
      }

      // For any other screen, try to go back to previous screen
      if (previousScreen && previousScreen !== 'splash') {
        navigateToScreen(previousScreen);
        return true; // Prevent default back behavior
      }

      return false; // Allow default behavior
    });

    return () => backHandler.remove();
  }, [fontsLoaded, sessionLoading, currentScreen, previousScreen]);

  if (!fontsLoaded || sessionLoading) {
    return <SplashScreen />;
  }

  const handleLogin = (role) => {
    setUserRole(role);
    navigateToScreen(role === 'instructor' ? 'instructor' : 'student');
  };

  const handleNavigateToNotifications = () => {
    navigateToScreen('notifications');
  };

  const handleBackFromNotifications = () => {
    navigateToScreen(userRole === 'instructor' ? 'instructor' : 'student');
  };

  const handleNavigateToStudentSettings = () => {
    navigateToScreen('student-settings');
  };

  const handleBackFromStudentSettings = () => {
    navigateToScreen('student');
  };

  const handleNavigateToStudentProfile = () => {
    navigateToScreen('student-profile');
  };

  const handleBackFromStudentProfile = () => {
    navigateToScreen('student');
  };

  const handleNavigateToAttendanceHistory = () => {
    navigateToScreen('attendance-history');
  };

  const handleBackFromAttendanceHistory = () => {
    navigateToScreen('student');
  };

  const handleNavigateToSchedule = () => {
    navigateToScreen('my-schedule');
  };

  const handleBackFromSchedule = () => {
    navigateToScreen('student');
  };

  const handleNavigateToStudentCourses = () => {
    navigateToScreen('student-courses');
  };

  const handleBackFromStudentCourses = () => {
    navigateToScreen('student');
  };

  const handleNavigateToPINSetup = () => {
    navigateToScreen('pin-setup');
  };

  const handleBackFromPINSetup = () => {
    navigateToScreen('student-settings');
  };

  const handlePINSetupComplete = () => {
    navigateToScreen('student-settings');
  };

  const handleAppUnlock = async () => {
    setShowUnlockScreen(false);
    const user = await getCurrentUser();
    if (user) {
      setUserRole(user.role);
      navigateToScreen(user.role === 'instructor' ? 'instructor' : 'student');
    } else {
      navigateToScreen('login');
    }
  };

  const handleNavigateToFaceSetup = () => {
    navigateToScreen('face-setup');
  };

  const handleFaceSetupBack = () => {
    navigateToScreen('student');
  };

  const handleFaceSetupComplete = () => {
    navigateToScreen('student');
  };

  const handleLogout = async () => {
    const { clearSession } = await import('./src/services/session');
    await clearSession();
    navigateToScreen('login');
    setUserRole('student');
  };

  const handleNavigateToForgotPassword = () => {
    navigateToScreen('forgot-password');
  };

  const handleBackFromForgotPassword = () => {
    navigateToScreen('login');
  };

  const handleStudentCodeSent = (email) => {
    setStudentResetEmail(email);
    navigateToScreen('student-verify-code');
  };

  const handleBackFromStudentVerifyCode = () => {
    navigateToScreen('forgot-password');
  };

  const handleStudentCodeVerified = () => {
    navigateToScreen('student-reset-password');
  };

  const handleBackFromStudentResetPassword = () => {
    navigateToScreen('student-verify-code');
  };

  const handleStudentPasswordReset = () => {
    navigateToScreen('login');
    setStudentResetEmail('');
  };

  const handleNavigateToInstructorForgotPassword = () => {
    navigateToScreen('instructor-forgot-password');
  };

  const handleBackFromInstructorForgotPassword = () => {
    navigateToScreen('login');
  };

  const handleInstructorCodeSent = (email) => {
    setInstructorResetEmail(email);
    navigateToScreen('instructor-verify-code');
  };

  const handleBackFromInstructorVerifyCode = () => {
    navigateToScreen('instructor-forgot-password');
  };

  const handleInstructorCodeVerified = () => {
    navigateToScreen('instructor-reset-password');
  };

  const handleBackFromInstructorResetPassword = () => {
    navigateToScreen('instructor-verify-code');
  };

  const handleInstructorPasswordReset = () => {
    navigateToScreen('login');
    setInstructorResetEmail('');
  };

  const handleStudentEmailVerificationNeeded = (email) => {
    setStudentVerifyEmail(email);
    navigateToScreen('student-verify-email');
  };

  const handleBackFromStudentVerifyEmail = () => {
    navigateToScreen('login');
    setStudentVerifyEmail('');
  };

  const handleStudentEmailVerified = () => {
    navigateToScreen('student');
    setStudentVerifyEmail('');
  };

  const handleNavigateToFaceAttendance = (classData) => {
    setSelectedClassForAttendance(classData);
    navigateToScreen('face-attendance');
  };

  const handleFaceAttendanceBack = () => {
    navigateToScreen('my-schedule');
    setSelectedClassForAttendance(null);
  };

  const handleBackFromLiveSession = () => {
    navigateToScreen('instructor');
  };

  const handleFaceAttendanceComplete = () => {
    navigateToScreen('my-schedule');
    setSelectedClassForAttendance(null);
  };

  const handleNavigateToSelfAttendance = (sessionId, courseName) => {
    setSelfAttendanceSession({ sessionId, courseName });
    navigateToScreen('self-attendance');
  };

  const handleSelfAttendanceBack = () => {
    navigateToScreen('student');
    setSelfAttendanceSession(null);
  };

  const handleSelfAttendanceComplete = () => {
    navigateToScreen('student');
    setSelfAttendanceSession(null);
  };

  const handleNavigateToLiveSession = () => {
    navigateToScreen('live-session');
  };

  const renderScreen = (screen) => {
    const direction = getNavigationDirection(previousScreen, screen);

    switch (screen) {
      case 'splash':
        return currentScreen === 'splash' ? <SplashScreen key="splash" /> : null;
      case 'login':
        return (
          <AnimatedScreen key="login" isActive={currentScreen === 'login'} direction={direction}>
            <LoginScreen
              onLogin={handleLogin}
              onNavigateToForgotPassword={handleNavigateToForgotPassword}
              onNavigateToInstructorForgotPassword={handleNavigateToInstructorForgotPassword}
              onEmailVerificationNeeded={handleStudentEmailVerificationNeeded}
            />
          </AnimatedScreen>
        );
      case 'forgot-password':
        return (
          <AnimatedScreen key="forgot-password" isActive={currentScreen === 'forgot-password'} direction={direction}>
            <ForgotPasswordScreen
              onBack={handleBackFromForgotPassword}
              onCodeSent={handleStudentCodeSent}
            />
          </AnimatedScreen>
        );
      case 'student-verify-code':
        return (
          <AnimatedScreen key="student-verify-code" isActive={currentScreen === 'student-verify-code'} direction={direction}>
            <StudentVerifyCodeScreen
              email={studentResetEmail}
              onBack={handleBackFromStudentVerifyCode}
              onCodeVerified={handleStudentCodeVerified}
            />
          </AnimatedScreen>
        );
      case 'student-reset-password':
        return (
          <AnimatedScreen key="student-reset-password" isActive={currentScreen === 'student-reset-password'} direction={direction}>
            <StudentResetPasswordScreen
              onBack={handleBackFromStudentResetPassword}
              onPasswordReset={handleStudentPasswordReset}
            />
          </AnimatedScreen>
        );
      case 'student-verify-email':
        return (
          <AnimatedScreen key="student-verify-email" isActive={currentScreen === 'student-verify-email'} direction={direction}>
            <StudentVerifyEmailScreen
              email={studentVerifyEmail}
              onBack={handleBackFromStudentVerifyEmail}
              onCodeVerified={handleStudentEmailVerified}
            />
          </AnimatedScreen>
        );
      case 'instructor-forgot-password':
        return (
          <AnimatedScreen key="instructor-forgot-password" isActive={currentScreen === 'instructor-forgot-password'} direction={direction}>
            <InstructorForgotPasswordScreen
              onBack={handleBackFromInstructorForgotPassword}
              onCodeSent={handleInstructorCodeSent}
            />
          </AnimatedScreen>
        );
      case 'instructor-verify-code':
        return (
          <AnimatedScreen key="instructor-verify-code" isActive={currentScreen === 'instructor-verify-code'} direction={direction}>
            <InstructorVerifyCodeScreen
              email={instructorResetEmail}
              onBack={handleBackFromInstructorVerifyCode}
              onCodeVerified={handleInstructorCodeVerified}
            />
          </AnimatedScreen>
        );
      case 'instructor-reset-password':
        return (
          <AnimatedScreen key="instructor-reset-password" isActive={currentScreen === 'instructor-reset-password'} direction={direction}>
            <InstructorResetPasswordScreen
              onBack={handleBackFromInstructorResetPassword}
              onPasswordReset={handleInstructorPasswordReset}
            />
          </AnimatedScreen>
        );
      case 'instructor':
        return (
          <AnimatedScreen key="instructor" isActive={currentScreen === 'instructor'} direction={direction}>
            <InstructorDashboard
              onNavigateToNotifications={handleNavigateToNotifications}
              onNavigateToLiveSession={handleNavigateToLiveSession}
            />
          </AnimatedScreen>
        );
      case 'student':
        return (
          <AnimatedScreen key="student" isActive={currentScreen === 'student'} direction={direction}>
            <StudentDashboard
              onNavigateToNotifications={handleNavigateToNotifications}
              onNavigateToSettings={handleNavigateToStudentSettings}
              onNavigateToFaceSetup={handleNavigateToFaceSetup}
              onNavigateToProfile={handleNavigateToStudentProfile}
              onNavigateToAttendanceHistory={handleNavigateToAttendanceHistory}
              onNavigateToSchedule={handleNavigateToSchedule}
              onNavigateToAllCourses={handleNavigateToStudentCourses}
              onNavigateToSelfAttendance={handleNavigateToSelfAttendance}
            />
          </AnimatedScreen>
        );
      case 'student-settings':
        return (
          <AnimatedScreen key="student-settings" isActive={currentScreen === 'student-settings'} direction={direction}>
            <StudentSettingsScreen
              isActive={currentScreen === 'student-settings'}
              onBack={handleBackFromStudentSettings}
              onLogout={handleLogout}
              onNavigateToPINSetup={handleNavigateToPINSetup}
              onNavigateToFaceSetup={handleNavigateToFaceSetup}
            />
          </AnimatedScreen>
        );
      case 'student-profile':
        return (
          <AnimatedScreen key="student-profile" isActive={currentScreen === 'student-profile'} direction={direction}>
            <StudentProfileScreen
              onBack={handleBackFromStudentProfile}
            />
          </AnimatedScreen>
        );
      case 'attendance-history':
        return (
          <AnimatedScreen key="attendance-history" isActive={currentScreen === 'attendance-history'} direction={direction}>
            <AttendanceHistoryScreen
              onBack={handleBackFromAttendanceHistory}
            />
          </AnimatedScreen>
        );
      case 'my-schedule':
        return (
          <AnimatedScreen key="my-schedule" isActive={currentScreen === 'my-schedule'} direction={direction}>
            <MyScheduleScreen
              onBack={handleBackFromSchedule}
              onNavigateToFaceAttendance={handleNavigateToFaceAttendance}
            />
          </AnimatedScreen>
        );
      case 'student-courses':
        return (
          <AnimatedScreen key="student-courses" isActive={currentScreen === 'student-courses'} direction={direction}>
            <StudentCoursesScreen
              onBack={handleBackFromStudentCourses}
            />
          </AnimatedScreen>
        );
      case 'self-attendance':
        return (
          <AnimatedScreen key="self-attendance" isActive={currentScreen === 'self-attendance'} direction={direction}>
            <StudentSelfAttendanceScreen
              sessionId={selfAttendanceSession?.sessionId || ''}
              courseName={selfAttendanceSession?.courseName}
              onBack={handleSelfAttendanceBack}
              onComplete={handleSelfAttendanceComplete}
            />
          </AnimatedScreen>
        );
      case 'face-attendance':
        return (
          <AnimatedScreen key="face-attendance" isActive={currentScreen === 'face-attendance'} direction={direction}>
            <FaceAttendanceScreen
              classData={selectedClassForAttendance}
              onBack={handleFaceAttendanceBack}
              onComplete={handleFaceAttendanceComplete}
            />
          </AnimatedScreen>
        );
      case 'notifications':
        return (
          <AnimatedScreen key="notifications" isActive={currentScreen === 'notifications'} direction={direction}>
            <NotificationsScreen onBack={handleBackFromNotifications} />
          </AnimatedScreen>
        );
      case 'face-setup':
        return (
          <AnimatedScreen key="face-setup" isActive={currentScreen === 'face-setup'} direction={direction}>
            <FaceSetupScreen
              onComplete={handleFaceSetupComplete}
              onSkip={handleFaceSetupBack}
            />
          </AnimatedScreen>
        );
      case 'pin-setup':
        return (
          <AnimatedScreen key="pin-setup" isActive={currentScreen === 'pin-setup'} direction={direction}>
            <PINSetupScreen
              onBack={handleBackFromPINSetup}
              onComplete={handlePINSetupComplete}
            />
          </AnimatedScreen>
        );
      case 'app-unlock':
        return (
          <AnimatedScreen key="app-unlock" isActive={currentScreen === 'app-unlock'} direction="forward">
            <AppUnlockScreen
              onUnlock={handleAppUnlock}
            />
          </AnimatedScreen>
        );
      case 'live-session':
        return (
          <AnimatedScreen key="live-session" isActive={currentScreen === 'live-session'} direction={direction}>
            <LiveSessionScreen
              onBack={handleBackFromLiveSession}
              instructorId={currentUserId || ''}
            />
          </AnimatedScreen>
        );
      default:
        return (
          <AnimatedScreen key="login-default" isActive={currentScreen === 'login'} direction="forward">
            <LoginScreen onLogin={handleLogin} />
          </AnimatedScreen>
        );
    }
  };

  const allScreens = ['splash', 'login', 'forgot-password', 'student-verify-code', 'student-reset-password', 'student-verify-email', 'instructor-forgot-password', 'instructor-verify-code', 'instructor-reset-password', 'instructor', 'student', 'student-settings', 'student-profile', 'attendance-history', 'my-schedule', 'face-attendance', 'notifications', 'face-setup', 'pin-setup', 'app-unlock', 'student-courses', 'self-attendance', 'live-session'];

  return (
    <SafeAreaProvider initialSafeAreaInsets={{ top: 0, bottom: 0, left: 0, right: 0 }}>
      <React.Fragment>
        {showUnlockScreen && currentScreen === 'app-unlock' ? (
          renderScreen('app-unlock')
        ) : (
          allScreens.map(screen => {
            const isActive = currentScreen === screen;
            const isPrevious = previousScreen === screen;
            if (isActive || isPrevious) {
              return renderScreen(screen);
            }
            return null;
          })
        )}
      </React.Fragment>
      <CustomAlert
        visible={inAppAlert.visible}
        title={inAppAlert.title}
        message={inAppAlert.message}
        onClose={() => setInAppAlert({ ...inAppAlert, visible: false })}
        icon="notifications-outline"
        actions={[
          { text: 'Later', style: 'cancel' },
          {
            text: 'Verify Now',
            onPress: () => {
              if (inAppAlert.session && inAppAlert.session.sessionId) {
                handleNavigateToSelfAttendance(inAppAlert.session.sessionId, inAppAlert.session.courseName);
              }
              setInAppAlert({ ...inAppAlert, visible: false }); // Dismiss alert after action
            }
          }
        ]}
      />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
