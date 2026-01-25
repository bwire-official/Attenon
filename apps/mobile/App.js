import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { InstructorDashboard } from './src/screens/InstructorDashboard';
import { StudentDashboard } from './src/screens/StudentDashboard';
import { NotificationsScreen } from './src/screens/NotificationsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('splash'); // splash, login, instructor, student, notifications
  const [userRole, setUserRole] = useState('student');

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setCurrentScreen('login');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

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

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'login':
        return <LoginScreen onLogin={handleLogin} />;
      case 'instructor':
        return <InstructorDashboard onNavigateToNotifications={handleNavigateToNotifications} />;
      case 'student':
        return <StudentDashboard />;
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
