// src/lib/theme-utils.ts
import { type ThemeColors, type Theme } from '@/store/theme-store';

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): string {
    // Remove the # if present
    hex = hex.replace('#', '');

    // Parse r, g, b values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    // Convert to CSS HSL format (hue in degrees, saturation and lightness in percentages)
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Convert camelCase to kebab-case for CSS custom properties
 */
export function camelToKebabCase(str: string): string {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Apply theme colors to CSS custom properties
 */
export function applyThemeColors(colors: ThemeColors): void {
    const root = document.documentElement;

    Object.entries(colors).forEach(([key, value]) => {
        const cssProperty = `--${camelToKebabCase(key)}`;
        // Convert hex to HSL for better CSS compatibility
        const hslValue = hexToHsl(value);
        root.style.setProperty(cssProperty, hslValue);
    });
}

/**
 * Remove theme colors from CSS custom properties
 */
export function removeThemeColors(): void {
    const root = document.documentElement;
    const customProperties = [
        '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
        '--background', '--foreground', '--muted', '--muted-foreground',
        '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
        '--border', '--input', '--ring', '--card', '--card-foreground',
        '--popover', '--popover-foreground'
    ];

    customProperties.forEach(prop => {
        root.style.removeProperty(prop);
    });
}

/**
 * Validate theme colors object
 */
export function validateThemeColors(colors: any): colors is ThemeColors {
    const requiredColors = [
        'primary', 'primaryForeground', 'secondary', 'secondaryForeground',
        'background', 'layout', 'foreground', 'muted', 'mutedForeground',
        'accent', 'accentForeground', 'destructive', 'destructiveForeground',
        'border', 'input', 'ring', 'card', 'cardForeground',
        'popover', 'popoverForeground'
    ];

    if (!colors || typeof colors !== 'object') {
        return false;
    }

    return requiredColors.every(color => {
        const value = colors[color];
        return typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
    });
}

/**
 * Generate a default theme
 */
export function generateDefaultTheme(name: string): Omit<Theme, 'id'> {
    return {
        name,
        description: 'Default generated theme',
        colors: {
            primary: '#000000',
            primaryForeground: '#ffffff',
            secondary: '#f5f5f5',
            secondaryForeground: '#171717',
            background: '#ffffff',
            layout: '#f5f5f5',
            foreground: '#0a0a0a',
            muted: '#f5f5f5',
            mutedForeground: '#737373',
            accent: '#404040',
            accentForeground: '#ffffff',
            destructive: '#dc2626',
            destructiveForeground: '#ffffff',
            border: '#e5e5e5',
            input: '#e5e5e5',
            ring: '#000000',
            card: '#ffffff',
            cardForeground: '#0a0a0a',
            popover: '#ffffff',
            popoverForeground: '#0a0a0a'
        }
    };
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(hex: string): boolean {
    const color = hex.replace('#', '');
    const r = parseInt(color.substr(0, 2), 16);
    const g = parseInt(color.substr(2, 2), 16);
    const b = parseInt(color.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
}

/**
 * Generate contrasting foreground color
 */
export function generateContrastingColor(backgroundColor: string): string {
    return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}

/**
 * Create theme from primary color
 */
export function createThemeFromPrimary(primaryColor: string, name: string): Omit<Theme, 'id'> {
    const isLight = isLightColor(primaryColor);

    return {
        name,
        description: `Theme based on ${primaryColor}`,
        colors: {
            primary: primaryColor,
            primaryForeground: generateContrastingColor(primaryColor),
            secondary: isLight ? '#f5f5f5' : '#2a2a2a',
            secondaryForeground: isLight ? '#171717' : '#ffffff',
            background: isLight ? '#ffffff' : '#0a0a0a',
            layout: isLight ? '#f5f5f5' : '#2a2a2a',
            foreground: isLight ? '#0a0a0a' : '#ffffff',
            muted: isLight ? '#f5f5f5' : '#2a2a2a',
            mutedForeground: isLight ? '#737373' : '#a3a3a3',
            accent: isLight ? '#404040' : '#d4d4d4',
            accentForeground: isLight ? '#ffffff' : '#000000',
            destructive: '#dc2626',
            destructiveForeground: '#ffffff',
            border: isLight ? '#e5e5e5' : '#404040',
            input: isLight ? '#e5e5e5' : '#404040',
            ring: primaryColor,
            card: isLight ? '#ffffff' : '#0a0a0a',
            cardForeground: isLight ? '#0a0a0a' : '#ffffff',
            popover: isLight ? '#ffffff' : '#0a0a0a',
            popoverForeground: isLight ? '#0a0a0a' : '#ffffff'
        }
    };
}