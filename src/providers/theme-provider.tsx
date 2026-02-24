// src/providers/theme-provider.tsx
"use client";

import * as React from 'react';
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
} from "next-themes";
import { useAtomValue, useSetAtom } from 'jotai';
import {
  getActiveThemeDataAtom,
  isHydratedAtom,
  setHydratedAtom
} from '@/store/theme-store';
import { hexToHsl } from '@/lib/theme-utils';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // const activeTheme = useAtomValue(activeThemeAtom);
  // const themes = useAtomValue(themesAtom);
  const activeThemeData = useAtomValue(getActiveThemeDataAtom);
  const isHydrated = useAtomValue(isHydratedAtom);
  const setHydrated = useSetAtom(setHydratedAtom);

  // Set hydrated state on mount
  React.useEffect(() => {
    setHydrated(true);
  }, [setHydrated]);

  // Apply custom theme colors to CSS custom properties
  React.useEffect(() => {
    // Only apply theme changes after hydration to prevent hydration mismatches
    if (!isHydrated) return;

    const root = document.documentElement;

    if (activeThemeData?.colors) {
      // Convert camelCase to kebab-case for CSS custom properties
      const convertToKebabCase = (str: string) => {
        return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
      };

      // Apply each color as a CSS custom property
      Object.entries(activeThemeData.colors).forEach(([key, value]) => {
        const cssProperty = `--${convertToKebabCase(key)}`;

        // Convert hex to HSL for CSS variables
        if (typeof value === 'string' && value.startsWith('#')) {
          // Import and use the hexToHsl function from theme-utils
          const hslValue = hexToHsl(value);
          root.style.setProperty(cssProperty, hslValue);
        } else {
          root.style.setProperty(cssProperty, value);
        }
      });

      // Add a data attribute to indicate custom theme is active
      root.setAttribute('data-custom-theme', activeThemeData.id);
      root.setAttribute('data-custom-theme-name', activeThemeData.name);

      // Apply layout color to body background if available, otherwise use background color
      const layoutColor = activeThemeData.colors.layout || activeThemeData.colors.background;
      if (layoutColor) {
        // If it's a hex color, use it directly; if it's HSL values, wrap it
        if (layoutColor.startsWith('#')) {
          document.body.style.backgroundColor = layoutColor;
        } else if (layoutColor.includes(' ')) {
          // It's HSL values like "240 22 96", wrap it in hsl()
          document.body.style.backgroundColor = `hsl(${layoutColor})`;
        } else {
          document.body.style.backgroundColor = layoutColor;
        }
      }
    } else {
      // Remove custom theme properties when no custom theme is active
      const customProperties = [
        '--primary', '--primary-foreground', '--secondary', '--secondary-foreground',
        '--background', '--layout', '--foreground', '--muted', '--muted-foreground',
        '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
        '--border', '--input', '--ring', '--card', '--card-foreground',
        '--popover', '--popover-foreground'
      ];

      customProperties.forEach(prop => {
        root.style.removeProperty(prop);
      });

      root.removeAttribute('data-custom-theme');
      root.removeAttribute('data-custom-theme-name');

      // Remove body background color override
      document.body.style.removeProperty('background-color');
    }
  }, [activeThemeData, isHydrated]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}