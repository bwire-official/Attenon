import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const layout = {
    window: {
        width,
        height,
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },
    borderRadius: {
        sm: 6,
        md: 10,
        lg: 16,
        xl: 24,
        round: 9999,
    },
};
