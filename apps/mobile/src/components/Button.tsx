import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    loading?: boolean;
    disabled?: boolean;
    style?: any;
}

export const Button = ({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style
}: ButtonProps) => {
    const { colors, isDark } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return colors.text.secondary;
        switch (variant) {
            case 'primary': return isDark ? colors.white : colors.black;
            case 'secondary': return colors.secondary;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return isDark ? colors.white : colors.black;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.text.disabled;
        switch (variant) {
            case 'outline': return isDark ? colors.white : colors.black;
            case 'ghost': return colors.text.secondary;
            case 'primary': return isDark ? colors.black : colors.white;
            default: return isDark ? colors.black : colors.white;
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.container,
                { backgroundColor: getBackgroundColor() },
                variant === 'outline' && { borderColor: colors.primary, borderWidth: 1 },
                style,
            ]}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 50,
        borderRadius: layout.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: layout.spacing.lg,
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
