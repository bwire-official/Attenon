import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';

export const useTheme = () => {
    const colorScheme = useColorScheme();
    // Default to light if colorScheme is null/undefined
    const isDark = colorScheme === 'dark';
    
    return {
        colors: isDark ? darkColors : lightColors,
        isDark,
        colorScheme: colorScheme || 'light',
    };
};

