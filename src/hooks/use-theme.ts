// src/hooks/use-theme.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  themesAtom,
  activeThemeAtom,
  isHydratedAtom,
  getActiveThemeDataAtom,
  addThemeAtom,
  addThemesAtom,
  removeThemeAtom,
  setSyncedAtAtom,
  type Theme,
  type CreateThemeData
} from '@/store/theme-store';
import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

// API response types
interface UserThemeResponse {
  theme: Theme | null;
  isActive: boolean;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

// API functions with better error handling
const themeApi = {
  getThemes: async (): Promise<Theme[]> => {
    try {
      const response = await fetch('/api/themes');

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch themes' }));
        throw new Error(error.message || 'Failed to fetch themes');
      }

      const result = await response.json();
      let themes: Theme[];

      if (result.data && Array.isArray(result.data)) {
        themes = result.data;
      } else if (Array.isArray(result)) {
        themes = result;
      } else {
        return [];
      }

      // Filter out any invalid themes
      return themes.filter((theme): theme is Theme =>
        theme &&
        typeof theme === 'object' &&
        typeof theme.id === 'string' &&
        typeof theme.name === 'string' &&
        theme.colors &&
        typeof theme.colors === 'object'
      );
    } catch (error) {
      console.error('Error fetching themes:', error);
      // Return empty array instead of throwing to prevent query failure
      return [];
    }
  },

  getUserTheme: async (): Promise<UserThemeResponse> => {
    try {
      const response = await fetch('/api/user-theme');

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch user theme' }));
        throw new Error(error.message || 'Failed to fetch user theme');
      }

      const result: ApiResponse<UserThemeResponse> = await response.json();

      // Ensure we return a valid structure
      return result.data || { theme: null, isActive: false };
    } catch (error) {
      console.error('Error fetching user theme:', error);
      return { theme: null, isActive: false };
    }
  },

  setUserTheme: async (themeId: string | null): Promise<void> => {
    const response = await fetch('/api/user-theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ themeId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to set active theme' }));
      throw new Error(error.message || 'Failed to set active theme');
    }
  },

  createTheme: async (newTheme: CreateThemeData): Promise<Theme> => {
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTheme),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create theme' }));
      throw new Error(error.message || 'Failed to create theme');
    }

    const result = await response.json();
    // Check if response is wrapped in data property or is theme directly
    if (result.data) {
      return result.data;
    } else if (result.id && result.name && result.colors) {
      return result as Theme;
    } else {
      throw new Error('No theme data returned from server');
    }
  },

  deleteTheme: async (themeId: string): Promise<void> => {
    const response = await fetch(`/api/themes/${themeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to delete theme' }));
      throw new Error(error.message || 'Failed to delete theme');
    }
  },
};

export function useTheme() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Jotai atoms
  const themes = useAtomValue(themesAtom);
  const [activeTheme, setActiveTheme] = useAtom(activeThemeAtom);
  const isHydrated = useAtomValue(isHydratedAtom);
  const activeThemeData = useAtomValue(getActiveThemeDataAtom);

  // Action atoms
  const addThemes = useSetAtom(addThemesAtom);
  const addStoreTheme = useSetAtom(addThemeAtom);
  const removeStoreTheme = useSetAtom(removeThemeAtom);
  const setSyncedAt = useSetAtom(setSyncedAtAtom);

  // Queries with better error handling
  const {
    data: apiThemes = [], // Provide default empty array
    isLoading: isLoadingThemes,
    error: themesError,
    refetch: refetchThemes,
  } = useQuery({
    queryKey: ['themes'],
    queryFn: themeApi.getThemes,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isHydrated, // Only fetch after store is hydrated
    retry: 3,
    // Ensure we always have an array
    select: (data) => data || [],
  });

  const {
    data: userTheme = { theme: null, isActive: false }, // Provide default
    isLoading: isLoadingUserTheme,
    error: userThemeError,
  } = useQuery({
    queryKey: ['user-theme'],
    queryFn: themeApi.getUserTheme,
    staleTime: 5 * 60 * 1000,
    enabled: isHydrated,
    retry: 3,
  });

  // Mutations
  const setActiveThemeMutation = useMutation({
    mutationFn: themeApi.setUserTheme,
    onMutate: async (themeId) => {
      // Optimistic update
      setActiveTheme(themeId);
    },
    onSuccess: () => {
      toast({
        title: 'Theme updated',
        description: 'Your theme preference has been saved.',
      });
      queryClient.invalidateQueries({ queryKey: ['user-theme'] });
    },
    onError: (error) => {
      // Revert optimistic update
      const previousTheme = userTheme?.theme?.id || null;
      setActiveTheme(previousTheme);

      toast({
        title: 'Failed to update theme',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addThemeMutation = useMutation({
    mutationFn: themeApi.createTheme,
    onSuccess: (newTheme) => {
      addStoreTheme(newTheme);
      toast({
        title: 'Theme created',
        description: `"${newTheme.name}" has been added to your themes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create theme',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteThemeMutation = useMutation({
    mutationFn: themeApi.deleteTheme,
    onMutate: async (themeId) => {
      // Optimistic update
      removeStoreTheme(themeId);
    },
    onSuccess: () => {
      toast({
        title: 'Theme deleted',
        description: 'The theme has been removed.',
      });
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
    onError: (error) => {
      // Revert optimistic update - refetch to restore state
      refetchThemes();

      toast({
        title: 'Failed to delete theme',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Use a ref to track previous themes to prevent unnecessary updates
  const prevThemesJsonRef = React.useRef('');
  
  // Sync API data with store
  useEffect(() => {
    if (apiThemes && apiThemes.length >= 0 && isHydrated) {
      // Stringify the current themes for comparison
      const currentThemesJson = JSON.stringify(apiThemes);
      
      // Only update if the themes have changed
      if (currentThemesJson !== prevThemesJsonRef.current) {
        addThemes(apiThemes);
        setSyncedAt(new Date().toISOString());
        prevThemesJsonRef.current = currentThemesJson;
      }
    }
  }, [apiThemes, isHydrated, addThemes, setSyncedAt]);

  // Use a ref to track previous active theme ID
  const prevActiveThemeIdRef = React.useRef<string | null>(null);
  
  // Set active theme from user settings
  useEffect(() => {
    if (userTheme?.theme && userTheme.isActive && isHydrated) {
      const themeId = userTheme.theme.id;
      // Only update if the active theme has changed
      if (themeId !== prevActiveThemeIdRef.current) {
        setActiveTheme(themeId);
        prevActiveThemeIdRef.current = themeId;
      }
    }
  }, [userTheme, isHydrated, setActiveTheme]);

  // Memoized handlers
  const handleSetActiveTheme = useCallback((themeId: string | null) => {
    if (setActiveThemeMutation.isPending) return;
    setActiveThemeMutation.mutate(themeId);
  }, [setActiveThemeMutation]);

  const handleAddTheme = useCallback((theme: CreateThemeData) => {
    if (addThemeMutation.isPending) return;
    addThemeMutation.mutate(theme);
  }, [addThemeMutation]);

  const handleDeleteTheme = useCallback((themeId: string) => {
    if (deleteThemeMutation.isPending) return;
    deleteThemeMutation.mutate(themeId);
  }, [deleteThemeMutation]);

  const handleRetry = useCallback(() => {
    refetchThemes();
    queryClient.invalidateQueries({ queryKey: ['user-theme'] });
  }, [refetchThemes, queryClient]);

  // Error state
  const error = themesError || userThemeError;
  const hasError = !!error;

  // Filter out any invalid themes before returning
  const validThemes = (themes || []).filter((theme): theme is Theme =>
    theme &&
    typeof theme === 'object' &&
    typeof theme.id === 'string'
  );

  return {
    // Data - ensure we always return valid arrays/objects
    themes: validThemes,
    activeTheme,
    activeThemeData,

    // Loading states
    isLoading: isLoadingThemes || isLoadingUserTheme || !isHydrated,
    isHydrated,

    // Mutation states
    isSettingTheme: setActiveThemeMutation.isPending,
    isAddingTheme: addThemeMutation.isPending,
    isDeletingTheme: deleteThemeMutation.isPending,

    // Error handling
    error: error?.message,
    hasError,

    // Actions
    setActiveTheme: handleSetActiveTheme,
    addTheme: handleAddTheme,
    deleteTheme: handleDeleteTheme,
    retry: handleRetry,

    // Raw mutations for advanced usage
    mutations: {
      setActiveTheme: setActiveThemeMutation,
      addTheme: addThemeMutation,
      deleteTheme: deleteThemeMutation,
    },
  };
}