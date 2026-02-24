// src/store/theme-store.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  layout?: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  isDefault?: boolean;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateThemeData {
  name: string;
  description?: string;
  colors: ThemeColors;
}

export interface UpdateThemeData {
  name?: string;
  description?: string;
  colors?: Partial<ThemeColors>;
}

// Base atoms with localStorage persistence
export const themesAtom = atomWithStorage<Theme[]>('themes', []);
export const activeThemeAtom = atomWithStorage<string | null>('activeTheme', null);
export const lastSyncedAtAtom = atomWithStorage<string | null>('lastSyncedAt', null);

// Non-persisted atoms
export const isHydratedAtom = atom<boolean>(false);

// Action atoms
export const setActiveThemeAtom = atom(
  null,
  (get, set, themeId: string | null) => {
    set(activeThemeAtom, themeId);
  }
);

export const addThemeAtom = atom(
  null,
  (get, set, theme: Theme) => {
    const currentThemes = get(themesAtom);
    const existingIndex = currentThemes.findIndex((t) => t.id === theme.id);
    
    if (existingIndex >= 0) {
      // Update existing theme
      const updatedThemes = [...currentThemes];
      updatedThemes[existingIndex] = theme;
      set(themesAtom, updatedThemes);
    } else {
      // Add new theme
      set(themesAtom, [...currentThemes, theme]);
    }
  }
);

export const addThemesAtom = atom(
  null,
  (get, set, themes: Theme[]) => {
    const currentThemes = get(themesAtom);
    const updatedThemes = [...currentThemes];
    
    themes.forEach((theme) => {
      // Add null check for theme and theme.id
      if (theme && theme.id) {
        const existingIndex = updatedThemes.findIndex((t) => t && t.id === theme.id);
        if (existingIndex >= 0) {
          updatedThemes[existingIndex] = theme;
        } else {
          updatedThemes.push(theme);
        }
      }
    });
    
    set(themesAtom, updatedThemes);
  }
);

export const removeThemeAtom = atom(
  null,
  (get, set, themeId: string) => {
    const currentThemes = get(themesAtom);
    const currentActiveTheme = get(activeThemeAtom);
    
    set(themesAtom, currentThemes.filter((theme) => theme.id !== themeId));
    
    // Clear active theme if it's the one being removed
    if (currentActiveTheme === themeId) {
      set(activeThemeAtom, null);
    }
  }
);

export const updateThemeAtom = atom(
  null,
  (get, set, { themeId, updates }: { themeId: string; updates: Partial<Theme> }) => {
    const currentThemes = get(themesAtom);
    const themeIndex = currentThemes.findIndex((theme) => theme.id === themeId);
    
    if (themeIndex >= 0) {
      const updatedThemes = [...currentThemes];
      updatedThemes[themeIndex] = { ...updatedThemes[themeIndex], ...updates };
      set(themesAtom, updatedThemes);
    }
  }
);

export const clearThemesAtom = atom(
  null,
  (get, set) => {
    set(themesAtom, []);
    set(activeThemeAtom, null);
  }
);

export const setHydratedAtom = atom(
  null,
  (get, set, hydrated: boolean) => {
    set(isHydratedAtom, hydrated);
  }
);

export const setSyncedAtAtom = atom(
  null,
  (get, set, timestamp: string) => {
    set(lastSyncedAtAtom, timestamp);
  }
);

// Computed atoms (derived state)
export const getThemeByIdAtom = atom(
  (get) => (themeId: string) => {
    const themes = get(themesAtom);
    return themes.find((theme) => theme.id === themeId);
  }
);

export const getActiveThemeDataAtom = atom(
  (get) => {
    const activeTheme = get(activeThemeAtom);
    const themes = get(themesAtom);
    
    if (!activeTheme) return null;
    return themes.find((theme) => theme.id === activeTheme) || null;
  }
);

// Convenience hooks-like atoms that combine multiple values
export const themeStateAtom = atom(
  (get) => ({
    themes: get(themesAtom),
    activeTheme: get(activeThemeAtom),
    isHydrated: get(isHydratedAtom),
    lastSyncedAt: get(lastSyncedAtAtom),
  })
);

// Action creators for easier usage
export const themeActionsAtom = atom(
  null,
  (get, set) => ({
    setActiveTheme: (themeId: string | null) => set(setActiveThemeAtom, themeId),
    addTheme: (theme: Theme) => set(addThemeAtom, theme),
    addThemes: (themes: Theme[]) => set(addThemesAtom, themes),
    removeTheme: (themeId: string) => set(removeThemeAtom, themeId),
    updateTheme: (themeId: string, updates: Partial<Theme>) => 
      set(updateThemeAtom, { themeId, updates }),
    clearThemes: () => set(clearThemesAtom),
    setHydrated: (hydrated: boolean) => set(setHydratedAtom, hydrated),
    setSyncedAt: (timestamp: string) => set(setSyncedAtAtom, timestamp),
    getThemeById: (themeId: string) => get(getThemeByIdAtom)(themeId),
    getActiveThemeData: () => get(getActiveThemeDataAtom),
  })
);