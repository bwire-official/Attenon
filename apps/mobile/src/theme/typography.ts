/**
 * Typography configuration for the app
 * Uses Montserrat font family
 */

export const typography = {
    fontFamily: {
        regular: 'Montserrat_400Regular',
        medium: 'Montserrat_500Medium',
        semiBold: 'Montserrat_600SemiBold',
        bold: 'Montserrat_700Bold',
        light: 'Montserrat_300Light',
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 32,
        '4xl': 40,
    },
    lineHeight: {
        xs: 16,
        sm: 20,
        md: 24,
        lg: 28,
        xl: 32,
        '2xl': 36,
        '3xl': 40,
        '4xl': 48,
    },
};

/**
 * Helper function to get font style object
 */
export const getFontStyle = (
    size: keyof typeof typography.fontSize = 'md',
    weight: keyof typeof typography.fontFamily = 'regular'
) => ({
    fontFamily: typography.fontFamily[weight],
    fontSize: typography.fontSize[size],
    lineHeight: typography.lineHeight[size],
});
