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
import { initializeSession, onSessionChange, getCurrentUser } from './src/services/session';
import { shouldShowLockScreen, setAppLocked, hasPIN } from './src/services/security';
import { AppState } from 'react-native';

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

  const navigateToScreen = (screen) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  const getNavigationDirection = (from, to) => {
    if (from === 'splash') return 'forward';

    const backScreens = {
      'login': ['forgot-password', 'instructor-forgot-password', 'student-verify-email'],
      'forgot-password': ['student-verify-code'],
      'student-verify-code': ['student-reset-password'],
      'instructor-forgot-password': ['instructor-verify-code'],
      'instructor-verify-code': ['instructor-reset-password'],
      'student': ['student-settings', 'student-profile', 'attendance-history', 'my-schedule', 'face-setup'],
      'student-settings': ['pin-setup'],
      'instructor': ['notifications'],
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
      'pin-setup': ['student-settings'],
      'notifications': ['instructor'],
      'student-verify-email': ['login'],
    };

    if (backScreens[from]?.includes(to)) {
      return 'forward';
    }
    if (forwardScreens[from]?.includes(to)) {
      return 'backward';
    }

    return 'forward';
  };

  // Initialize session on app startup
  useEffect(() => {
    async function checkSession() {
      try {
        const sessionState = await initializeSession();

        if (sessionState.isAuthenticated && sessionState.user) {
          // Check if PIN is set - if so, lock the app and show unlock screen
          const pinExists = await hasPIN();
          if (pinExists) {
            await setAppLocked(true);
            setShowUnlockScreen(true);
            setCurrentScreen('app-unlock');
          } else {
            // No PIN set, navigate to appropriate dashboard
            setUserRole(sessionState.user.role);
            navigateToScreen(sessionState.user.role === 'instructor' ? 'instructor' : 'student');
          }
        } else {
          // No active session, show login screen
          navigateToScreen('login');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setCurrentScreen('login');
      } finally {
        setSessionLoading(false);
      }
    }

    // Wait for fonts to load before checking session
    if (fontsLoaded) {
      checkSession();
    }
  }, [fontsLoaded]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const pinExists = await hasPIN();
      if (!pinExists) return;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App going to background - always lock the app if PIN is set
        if (currentScreen !== 'login' && currentScreen !== 'splash' && currentScreen !== 'app-unlock') {
          await setAppLocked(true);
        }
      } else if (nextAppState === 'active') {
        // App coming to foreground - always check and show unlock screen if locked
        const isLocked = await shouldShowLockScreen();
        if (isLocked) {
          if (currentScreen !== 'login' && currentScreen !== 'splash' && currentScreen !== 'app-unlock') {
            setShowUnlockScreen(true);
            setCurrentScreen('app-unlock');
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [currentScreen]);

  // Listen for auth state changes (login/logout)
  useEffect(() => {
    if (!fontsLoaded || sessionLoading) {
      return;
    }

    const { data: subscription } = onSessionChange((isAuthenticated, user) => {
      if (isAuthenticated && user) {
        // User logged in, navigate to appropriate dashboard
        setUserRole(user.role);
        navigateToScreen(user.role === 'instructor' ? 'instructor' : 'student');
      } else {
        // User logged out, go to login screen
        navigateToScreen('login');
        setUserRole('student');
      }
    });

    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, [fontsLoaded, sessionLoading]);

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
        'pin-setup': 'student-settings',
        'notifications': userRole === 'instructor' ? 'instructor' : 'student',
        'forgot-password': 'login',
        'student-verify-code': 'forgot-password',
        'student-reset-password': 'student-verify-code',
        'student-verify-email': 'login',
        'instructor-forgot-password': 'login',
        'instructor-verify-code': 'instructor-forgot-password',
        'instructor-reset-password': 'instructor-verify-code',
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
            <InstructorDashboard onNavigateToNotifications={handleNavigateToNotifications} />
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
            />
          </AnimatedScreen>
        );
      case 'student-settings':
        return (
          <AnimatedScreen key="student-settings" isActive={currentScreen === 'student-settings'} direction={direction}>
            <StudentSettingsScreen
              onBack={handleBackFromStudentSettings}
              onLogout={handleLogout}
              onNavigateToPINSetup={handleNavigateToPINSetup}
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
          <AppUnlockScreen
            key="app-unlock"
            onUnlock={handleAppUnlock}
          />
        );
      default:
        return (
          <AnimatedScreen key="login-default" isActive={currentScreen === 'login'} direction="forward">
            <LoginScreen onLogin={handleLogin} />
          </AnimatedScreen>
        );
    }
  };

  const allScreens = ['splash', 'login', 'forgot-password', 'student-verify-code', 'student-reset-password', 'student-verify-email', 'instructor-forgot-password', 'instructor-verify-code', 'instructor-reset-password', 'instructor', 'student', 'student-settings', 'student-profile', 'attendance-history', 'my-schedule', 'notifications', 'face-setup', 'pin-setup', 'app-unlock'];

  return (
    <SafeAreaProvider>
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
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
