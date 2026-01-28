import React from 'react';
import { View, StyleSheet, ActivityIndicator, Image, StatusBar } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

export const SplashScreen = () => {
    const { colors, isDark } = useTheme();

    return (
        <ScreenWrapper style={{ backgroundColor: colors.background }}>
            <View style={[styles.content, { backgroundColor: colors.background }]}>
                <View style={styles.splashContainer}>
                    <Image
                        source={require('../../assets/splash.png')}
                        style={styles.splashImage}
                        tintColor={isDark ? colorPalette.grey[100] : colors.text.primary}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.footer}>
                    <ActivityIndicator size="large" color={isDark ? colorPalette.grey[100] : colors.text.primary} />
                </View>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: layout.spacing.xxl * 2,
    },
    splashContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
    },
    splashImage: {
        width: 400,
        height: 400,
    },
    footer: {
        position: 'absolute',
        bottom: layout.spacing.xxl * 2,
        alignItems: 'center',
    },
});
