import { ThemeSwitcher } from '@/components/theme-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserNav } from './user-profile-menu';
import { getThemeColors } from "@/utils/theme-colors";

export function Navbar() {
  const themeColors = getThemeColors();
  const headerBg = process.env.NEXT_PUBLIC_BAZNAS_THEME === 'true'
    ? `${themeColors.bgPrimaryDarker}`
    : 'bg-background/95 supports-backdrop-filter:bg-background/60';

  const customTheme = process.env.USING_CUSTOMIZE_THEME === 'true'

  return (
    <header className={`sticky top-0 z-10 w-full ${headerBg} shadow-sm dark:shadow-secondary`}>
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex flex-1 items-center space-x-2 justify-end">
          {customTheme ?
            <ThemeSwitcher /> :
            <ThemeToggle />
          }
          <UserNav />
        </div>
      </div>
    </header>
  );
}
