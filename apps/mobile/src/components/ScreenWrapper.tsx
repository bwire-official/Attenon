import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { layout } from '../theme/layout';

interface ScreenWrapperProps {
    children: React.ReactNode;
    style?: any;
    unsafe?: boolean; // Option to ignore safe area if needed (e.g. for full screen images)
}

export const ScreenWrapper = ({ children, style, unsafe = false }: ScreenWrapperProps) => {
    const { colors, isDark } = useTheme();
    const Container = unsafe ? View : SafeAreaView;

    return (
        <Container style={[{ flex: 1, backgroundColor: colors.background, paddingHorizontal: layout.spacing.md }, style]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
            {children}
        </Container>
    );
};
