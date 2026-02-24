import { MenuIcon } from "lucide-react";

import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";

interface SidebarHamburgerProps {
  isOpen: boolean | undefined;
  setIsOpen?: () => void;
}

export function SidebarHamburger({ isOpen, setIsOpen }: SidebarHamburgerProps) {
  const isBaznasTheme = process.env.NEXT_PUBLIC_BAZNAS_THEME === "true";

  return (
    <div className={`invisible lg:visible bg-white rounded-lg dark:bg-primary-foreground ${isOpen ? "" : "mx-2"}`}>
      <Button
        onClick={() => setIsOpen?.()}
        // className="rounded-md w-8 h-8"
        variant="outline"
      // size="icon"
      >
        <MenuIcon
          className={cn(
            "h-4 w-4 transition-transform ease-in-out duration-700",
            isOpen === false ? "rotate-0" : "rotate-0",
            isBaznasTheme && "text-[#005331] dark:text-[#d2ffed]"
          )}
        />
      </Button>
    </div>
  );
}
