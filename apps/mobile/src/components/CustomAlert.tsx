import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { colorPalette } from '../theme/colors';
import { layout } from '../theme/layout';

interface AlertAction {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    actions: AlertAction[];
    onClose: () => void;
    icon?: string;
    iconColor?: string;
}

export const CustomAlert = ({
    visible,
    title,
    message,
    actions,
    onClose,
    icon,
    iconColor,
}: CustomAlertProps) => {
    const { colors, isDark } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[
                            styles.alertContainer,
                            {
                                backgroundColor: isDark ? colorPalette.grey[900] : colors.white,
                                borderColor: isDark ? colorPalette.grey[800] : colorPalette.grey[200]
                            }
                        ]}>
                            {icon && (
                                <View style={[
                                    styles.iconContainer,
                                    { backgroundColor: iconColor ? `${iconColor}20` : `${colors.primary}20` }
                                ]}>
                                    <Ionicons
                                        name={icon as any}
                                        size={32}
                                        color={iconColor || colors.primary}
                                    />
                                </View>
                            )}

                            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
                            <Text style={[styles.message, { color: colors.text.secondary }]}>{message}</Text>

                            <View style={styles.actionsContainer}>
                                {actions.map((action, index) => {
                                    const isCancel = action.style === 'cancel';
                                    const isDestructive = action.style === 'destructive';

                                    let btnBg = colors.primary;
                                    let btnText = colors.white;

                                    if (isCancel) {
                                        btnBg = isDark ? colorPalette.grey[800] : colorPalette.grey[100];
                                        btnText = colors.text.primary;
                                    } else if (isDestructive) {
                                        btnBg = '#EF4444';
                                        btnText = colors.white;
                                    }

                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.button,
                                                { backgroundColor: btnBg },
                                                index > 0 && { marginTop: layout.spacing.sm }
                                            ]}
                                            onPress={() => {
                                                onClose();
                                                action.onPress?.();
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[
                                                styles.buttonText,
                                                { color: btnText }
                                            ]}>
                                                {action.text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: layout.spacing.xl,
    },
    alertContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        padding: layout.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: layout.spacing.lg,
    },
    title: {
        fontSize: 20,
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
        marginBottom: layout.spacing.sm,
    },
    message: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: layout.spacing.xl,
    },
    actionsContainer: {
        width: '100%',
    },
    button: {
        width: '100%',
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
});
