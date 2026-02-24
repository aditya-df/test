// src/components/theme-switcher.tsx
'use client';

import { useEffect, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { type Theme } from '@/store/theme-store';
import { useTheme } from '@/hooks/use-theme';


export function ThemeSwitcher() {
  const { setTheme: setNextTheme, theme: nextTheme } = useNextTheme();
  const [open, setOpen] = useState(false);
  const { activeTheme, setActiveTheme } = useTheme();
  const [validThemes, setValidThemes] = useState<Theme[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(false);
  const [themesError, setThemesError] = useState(false);

  // Handle default theme selection (light/dark/system)
  const handleDefaultThemeSelect = (themeName: string) => {
    setNextTheme(themeName);
    // Clear custom theme when selecting default themes
    setActiveTheme(null);
    setOpen(false);
  };

  // Handle custom theme selection
  const handleCustomThemeSelect = (themeId: string) => {
    // Set to light mode when using custom themes (or you can choose dark)
    setNextTheme('light');
    setActiveTheme(themeId);
    setOpen(false);
  };

  // Fetch valid themes using fetch API
  useEffect(() => {
    const fetchValidThemes = async () => {
      setIsLoadingThemes(true);
      setThemesError(false);
      try {
        const response = await fetch('/api/themes');

        if (!response.ok) {
          throw new Error('Failed to fetch themes');
        }

        const data = await response.json();
        const themesData = Array.isArray(data) ? data : data.data || [];

        // Filter valid themes owned by user
        const filtered = themesData.filter((theme: any): theme is Theme =>
          theme &&
          typeof theme === 'object' &&
          typeof theme.id === 'string' &&
          typeof theme.name === 'string' &&
          theme.colors &&
          typeof theme.colors === 'object'
        );

        setValidThemes(filtered);
      } catch (error) {
        console.error('Error fetching themes:', error);
        setThemesError(true);
        setValidThemes([]);
      } finally {
        setIsLoadingThemes(false);
      }
    };

    fetchValidThemes();
  }, []);

  // Check if we're using a custom theme
  const isUsingCustomTheme = activeTheme !== null;
  const isDefaultTheme = !isUsingCustomTheme;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="navbarIcon"
          size="icon"
          className="hover:bg-accent hover:text-accent-foreground"
        >
          <SunIcon
            className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 pointer-events-none"
            aria-hidden="true"
          />
          <MoonIcon
            className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
            aria-hidden="true"
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Themes</h4>
            <p className="text-sm text-muted-foreground">
              Select a theme or upload your own.
            </p>
          </div>

          {/* Show error state if there's an API issue */}
          {themesError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive mb-2">
                Failed to load themes from server
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="h-8"
              >
                Retry
              </Button>
            </div>
          )}

          <div className="grid gap-2">
            {/* Default themes */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={isDefaultTheme && nextTheme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDefaultThemeSelect('light')}
                className="justify-start"
              >
                <SunIcon className="mr-1 size-4" />
                Light
              </Button>
              <Button
                variant={isDefaultTheme && nextTheme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDefaultThemeSelect('dark')}
                className="justify-start"
              >
                <MoonIcon className="mr-1 size-4" />
                Dark
              </Button>
            </div>

            {/* Custom themes */}
            {validThemes && validThemes.length > 0 && (
              <div className="mt-2">
                <Label className="text-xs">Custom Themes</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {validThemes.map((theme) => (
                    <Button
                      key={theme.id}
                      variant={activeTheme === theme.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleCustomThemeSelect(theme.id)}
                      className="justify-start text-xs"
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{
                          backgroundColor: theme.colors?.primary || '#000000'
                        }}
                      />
                      {theme.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Show loading state */}
            {isLoadingThemes && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">Loading themes...</p>
              </div>
            )}

            {/* Show empty state if no themes and not loading */}
            {!isLoadingThemes && validThemes.length === 0 && !themesError && (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  No custom themes found! Let&apos;s create one as superadmin!
                </p>
              </div>
            )}

            {/* Upload theme */}
            {/* <div className="mt-4">
              <Label htmlFor="theme-upload">Upload Theme</Label>
              <Input
                id="theme-upload"
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="mt-1"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload a JSON file with your theme configuration.
              </p>
            </div> */}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}