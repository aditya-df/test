"use client";

import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { cn } from "@/utils/utils";

export function ThemeToggle(): React.ReactElement {
  const { setTheme, theme } = useTheme();
  const isBaznasTheme = process.env.NEXT_PUBLIC_BAZNAS_THEME === "true";


  useMemo(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme");
      const tailwindTheme = document.documentElement.classList.contains("dark");
      if (!!storedTheme) {
        setTheme(storedTheme as string);
      } else {
        setTheme(tailwindTheme ? "dark" : "light");
      }
    }
  }, []);

  return (
    <Button
      variant="navbarIcon"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(
        isBaznasTheme
          ? "hover:bg-[#007e46] hover:text-white" // ✅ custom hover for Baznas
          : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <SunIcon
        className={cn(
          "size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 pointer-events-none", // ✅ ignore hover
          isBaznasTheme && "text-white"
        )}
        aria-hidden="true"
      />
      <MoonIcon
        className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        aria-hidden="true"
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
