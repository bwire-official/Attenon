import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface InputProps {
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    error?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoComplete?: string;
    icon?: keyof typeof Ionicons.glyphMap;
    variant?: 'default' | 'underline';
    editable?: boolean;
}

export const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    error,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    autoComplete,
    icon,
    variant = 'default',
    editable = true,
}: InputProps) => {
    const { colors, isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const isUnderline = variant === 'underline';
    const isEditable = editable !== false;
    const isPasswordField = secureTextEntry === true;
    const shouldShowPassword = isPasswordField && showPassword;

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>
            <View style={[
                styles.inputWrapper,
                isUnderline && styles.inputWrapperUnderline,
                !isUnderline && {
                    backgroundColor: isDark ? colors.backgroundSecondary : colors.background,
                    borderColor: error ? '#EF4444' : (isFocused && isEditable ? (isDark ? colorPalette.grey[100] : colors.text.primary) : colors.border),
                },
                isUnderline && {
                    borderBottomColor: error ? '#EF4444' : (isFocused && isEditable ? (isDark ? colorPalette.grey[100] : colors.text.primary) : colors.border),
                },
                !isUnderline && isFocused && isEditable && { backgroundColor: isDark ? colorPalette.grey[800] : colors.white },
            ]}>
                {icon && (
                    <Ionicons 
                        name={icon} 
                        size={20} 
                        color={isFocused && isEditable ? (isDark ? colorPalette.grey[100] : colors.text.primary) : colors.text.secondary}
                        style={styles.icon}
                    />
                )}
                <TextInput
                    style={[
                        styles.input,
                        icon && styles.inputWithIcon,
                        isUnderline && styles.inputUnderline,
                        isPasswordField && styles.inputWithPasswordToggle,
                        { color: colors.text.primary },
                        !editable && { opacity: 0.6 },
                    ]}
                    value={value}
                    onChangeText={onChangeText || (() => {})}
                    placeholder={placeholder}
                    placeholderTextColor={colors.text.secondary}
                    secureTextEntry={isPasswordField && !shouldShowPassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoComplete={autoComplete as any}
                    editable={editable}
                    onFocus={() => isEditable && setIsFocused(true)}
                    onBlur={() => isEditable && setIsFocused(false)}
                />
                {isPasswordField && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.passwordToggle}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={colors.text.secondary}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error && <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: layout.spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: layout.spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: layout.borderRadius.md,
        paddingHorizontal: layout.spacing.md,
    },
    inputWrapperUnderline: {
        borderWidth: 0,
        borderBottomWidth: 1,
        borderRadius: 0,
        paddingHorizontal: 0,
    },
    icon: {
        marginRight: layout.spacing.sm,
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: 16,
        paddingVertical: 0,
    },
    inputWithIcon: {
        paddingLeft: 0,
    },
    inputWithPasswordToggle: {
        paddingRight: 0,
    },
    inputUnderline: {
        height: 48,
        paddingHorizontal: 0,
    },
    passwordToggle: {
        padding: layout.spacing.xs,
        marginLeft: layout.spacing.xs,
    },
    errorText: {
        fontSize: 12,
        marginTop: layout.spacing.xs,
    },
});
