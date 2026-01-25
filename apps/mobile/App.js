import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useFonts } from 'expo-font';
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

export default function App() {
  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [currentScreen, setCurrentScreen] = useState('splash'); // splash, login, instructor, student, student-settings, forgot-password, student-verify-code, student-reset-password, student-verify-email, instructor-forgot-password, instructor-verify-code, instructor-reset-password, notifications
  const [userRole, setUserRole] = useState('student');
  const [instructorResetEmail, setInstructorResetEmail] = useState('');
  const [studentResetEmail, setStudentResetEmail] = useState('');
  const [studentVerifyEmail, setStudentVerifyEmail] = useState('');

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setCurrentScreen('login');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) {
    return null; // Or return a loading screen
  }

  const handleLogin = (role) => {
    setUserRole(role);
    setCurrentScreen(role === 'instructor' ? 'instructor' : 'student');
  };

  const handleNavigateToNotifications = () => {
    setCurrentScreen('notifications');
  };

  const handleBackFromNotifications = () => {
    setCurrentScreen('instructor');
  };

  const handleNavigateToStudentSettings = () => {
    setCurrentScreen('student-settings');
  };

  const handleBackFromStudentSettings = () => {
    setCurrentScreen('student');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
    setUserRole('student');
  };

  const handleNavigateToForgotPassword = () => {
    setCurrentScreen('forgot-password');
  };

  const handleBackFromForgotPassword = () => {
    setCurrentScreen('login');
  };

  const handleStudentCodeSent = (email) => {
    setStudentResetEmail(email);
    setCurrentScreen('student-verify-code');
  };

  const handleBackFromStudentVerifyCode = () => {
    setCurrentScreen('forgot-password');
  };

  const handleStudentCodeVerified = () => {
    setCurrentScreen('student-reset-password');
  };

  const handleBackFromStudentResetPassword = () => {
    setCurrentScreen('student-verify-code');
  };

  const handleStudentPasswordReset = () => {
    setCurrentScreen('login');
    setStudentResetEmail('');
  };

  const handleNavigateToInstructorForgotPassword = () => {
    setCurrentScreen('instructor-forgot-password');
  };

  const handleBackFromInstructorForgotPassword = () => {
    setCurrentScreen('login');
  };

  const handleInstructorCodeSent = (email) => {
    setInstructorResetEmail(email);
    setCurrentScreen('instructor-verify-code');
  };

  const handleBackFromInstructorVerifyCode = () => {
    setCurrentScreen('instructor-forgot-password');
  };

  const handleInstructorCodeVerified = () => {
    setCurrentScreen('instructor-reset-password');
  };

  const handleBackFromInstructorResetPassword = () => {
    setCurrentScreen('instructor-verify-code');
  };

  const handleInstructorPasswordReset = () => {
    setCurrentScreen('login');
    setInstructorResetEmail('');
  };

  const handleStudentEmailVerificationNeeded = (email) => {
    setStudentVerifyEmail(email);
    setCurrentScreen('student-verify-email');
  };

  const handleBackFromStudentVerifyEmail = () => {
    setCurrentScreen('login');
    setStudentVerifyEmail('');
  };

  const handleStudentEmailVerified = () => {
    setCurrentScreen('student');
    setStudentVerifyEmail('');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'login':
        return <LoginScreen 
          onLogin={handleLogin} 
          onNavigateToForgotPassword={handleNavigateToForgotPassword}
          onNavigateToInstructorForgotPassword={handleNavigateToInstructorForgotPassword}
          onEmailVerificationNeeded={handleStudentEmailVerificationNeeded}
        />;
      case 'forgot-password':
        return <ForgotPasswordScreen 
          onBack={handleBackFromForgotPassword}
          onCodeSent={handleStudentCodeSent}
        />;
      case 'student-verify-code':
        return <StudentVerifyCodeScreen 
          email={studentResetEmail}
          onBack={handleBackFromStudentVerifyCode}
          onCodeVerified={handleStudentCodeVerified}
        />;
      case 'student-reset-password':
        return <StudentResetPasswordScreen 
          onBack={handleBackFromStudentResetPassword}
          onPasswordReset={handleStudentPasswordReset}
        />;
      case 'student-verify-email':
        return <StudentVerifyEmailScreen 
          email={studentVerifyEmail}
          onBack={handleBackFromStudentVerifyEmail}
          onCodeVerified={handleStudentEmailVerified}
        />;
      case 'instructor-forgot-password':
        return <InstructorForgotPasswordScreen 
          onBack={handleBackFromInstructorForgotPassword}
          onCodeSent={handleInstructorCodeSent}
        />;
      case 'instructor-verify-code':
        return <InstructorVerifyCodeScreen 
          email={instructorResetEmail}
          onBack={handleBackFromInstructorVerifyCode}
          onCodeVerified={handleInstructorCodeVerified}
        />;
      case 'instructor-reset-password':
        return <InstructorResetPasswordScreen 
          onBack={handleBackFromInstructorResetPassword}
          onPasswordReset={handleInstructorPasswordReset}
        />;
      case 'instructor':
        return <InstructorDashboard onNavigateToNotifications={handleNavigateToNotifications} />;
      case 'student':
        return <StudentDashboard 
          onNavigateToNotifications={handleNavigateToNotifications}
          onNavigateToSettings={handleNavigateToStudentSettings}
        />;
      case 'student-settings':
        return <StudentSettingsScreen 
          onBack={handleBackFromStudentSettings}
          onLogout={handleLogout}
        />;
      case 'notifications':
        return <NotificationsScreen onBack={handleBackFromNotifications} />;
      default:
        return <LoginScreen onLogin={handleLogin} />;
    }
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
