import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { typography } from './typography';

export const useTheme = () => {
    // Force light mode
    const isDark = false;

    return {
        colors: lightColors,
        isDark: false,
        colorScheme: 'light',
        typography,
    };
};

