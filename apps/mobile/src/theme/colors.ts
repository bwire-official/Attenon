// Color Palette - Full Tailwind-style color system
export const colorPalette = {
    frozenLake: {
        50: '#e7f7fd',
        100: '#cfeffc',
        200: '#9fdff9',
        300: '#6fd0f6',
        400: '#3fc0f3',
        500: '#0fb0f0',
        600: '#0c8dc0',
        700: '#096a90',
        800: '#064660',
        900: '#032330',
        950: '#021922',
    },
    inkBlack: {
        50: '#e5fdff',
        100: '#ccfcff',
        200: '#99f8ff',
        300: '#66f5ff',
        400: '#33f1ff',
        500: '#00eeff',
        600: '#00becc',
        700: '#008f99',
        800: '#005f66',
        900: '#003033',
        950: '#002124',
    },
    grey: {
        50: '#f2f2f3',
        100: '#e4e5e7',
        200: '#cacbce',
        300: '#afb1b6',
        400: '#95969d',
        500: '#7a7c85',
        600: '#62636a',
        700: '#494b50',
        800: '#313235',
        900: '#18191b',
        950: '#111113',
    },
    porcelain: {
        50: '#ffffe5',
        100: '#ffffcc',
        200: '#ffff99',
        300: '#ffff66',
        400: '#ffff33',
        500: '#ffff00',
        600: '#cccc00',
        700: '#999900',
        800: '#666600',
        900: '#333300',
        950: '#242400',
    },
    yellowGreen: {
        50: '#f8ffe5',
        100: '#f1ffcc',
        200: '#e4ff99',
        300: '#d6ff66',
        400: '#c9ff33',
        500: '#bbff00',
        600: '#96cc00',
        700: '#709900',
        800: '#4b6600',
        900: '#253300',
        950: '#1a2400',
    },
};

// Light Theme Colors
export const lightColors = {
    // Primary brand color (Frozen Lake Blue)
    primary: colorPalette.frozenLake[500],
    primaryDark: colorPalette.frozenLake[600],
    primaryLight: colorPalette.frozenLake[400],
    
    // Secondary color (Ink Black/Cyan)
    secondary: colorPalette.inkBlack[500],
    secondaryDark: colorPalette.inkBlack[600],
    secondaryLight: colorPalette.inkBlack[400],
    
    // Accent color (Yellow Green - Success/Attendance)
    accent: colorPalette.yellowGreen[500],
    accentDark: colorPalette.yellowGreen[600],
    accentLight: colorPalette.yellowGreen[400],
    
    // Warning color (Porcelain Yellow)
    warning: colorPalette.porcelain[500],
    warningDark: colorPalette.porcelain[600],
    warningLight: colorPalette.porcelain[400],
    
    // Danger/Error
    danger: colorPalette.frozenLake[700],
    dangerDark: colorPalette.frozenLake[800],
    dangerLight: colorPalette.frozenLake[600],
    
    // Background colors
    background: colorPalette.grey[50],
    backgroundSecondary: colorPalette.grey[100],
    white: '#FFFFFF',
    black: '#000000',
    
    // Text colors
    text: {
        primary: colorPalette.grey[950],
        secondary: colorPalette.grey[600],
        tertiary: colorPalette.grey[500],
        inverse: '#FFFFFF',
        disabled: colorPalette.grey[400],
    },
    
    // Border colors
    border: colorPalette.grey[200],
    borderLight: colorPalette.grey[100],
    borderDark: colorPalette.grey[300],
    
    // Status colors
    success: colorPalette.yellowGreen[500],
    info: colorPalette.frozenLake[500],
    error: colorPalette.frozenLake[700],
};

// Dark Theme Colors
export const darkColors = {
    // Primary brand color (lighter for dark mode)
    primary: colorPalette.frozenLake[400],
    primaryDark: colorPalette.frozenLake[500],
    primaryLight: colorPalette.frozenLake[300],
    
    // Secondary color
    secondary: colorPalette.inkBlack[400],
    secondaryDark: colorPalette.inkBlack[500],
    secondaryLight: colorPalette.inkBlack[300],
    
    // Accent color
    accent: colorPalette.yellowGreen[400],
    accentDark: colorPalette.yellowGreen[500],
    accentLight: colorPalette.yellowGreen[300],
    
    // Warning color
    warning: colorPalette.porcelain[400],
    warningDark: colorPalette.porcelain[500],
    warningLight: colorPalette.porcelain[300],
    
    // Danger/Error
    danger: colorPalette.frozenLake[500],
    dangerDark: colorPalette.frozenLake[600],
    dangerLight: colorPalette.frozenLake[400],
    
    // Background colors (dark - pure black)
    background: '#000000',
    backgroundSecondary: colorPalette.grey[950],
    white: '#FFFFFF',
    black: '#000000',
    
    // Text colors (inverted for dark mode - softer white)
    text: {
        primary: colorPalette.grey[100], // Softer white instead of pure white
        secondary: colorPalette.grey[400], // Softer grey
        tertiary: colorPalette.grey[500],
        inverse: colorPalette.grey[950],
        disabled: colorPalette.grey[600],
    },
    
    // Border colors (darker)
    border: colorPalette.grey[800],
    borderLight: colorPalette.grey[900],
    borderDark: colorPalette.grey[700],
    
    // Status colors
    success: colorPalette.yellowGreen[400],
    info: colorPalette.frozenLake[400],
    error: colorPalette.frozenLake[500],
};

// Default export for backward compatibility (light theme)
export const colors = lightColors;
