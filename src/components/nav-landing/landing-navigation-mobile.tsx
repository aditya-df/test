"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Session } from "next-auth";

import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Icons } from "@/components/icons";
import { siteConfig } from "@/config/site";

interface NavigationMobileProps {
  navItems: NavItem[];
  session: Session | null;
}

export function NavigationMobile({ navItems, session }: NavigationMobileProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState<boolean>(false);

  // Add dashboard to nav items if user is logged in
  const displayNavItems = React.useMemo(() => {
    if (session?.user && !navItems.some((item) => item.title === "Dashboard")) {
      return [
        ...navItems,
        {
          title: "Dashboard",
          href: "/dashboard",
        },
      ];
    }
    return navItems;
  }, [navItems, session]);

  React.useEffect(() => {
    const chatWidget = (window as any).ChatWidget;
    if (chatWidget) {
      if (isOpen) {
        chatWidget.hide();
      } else {
        chatWidget.show();
      }
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild className="md:hidden">
        <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 flex items-center justify-center">
          <Icons.menuToggle className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="p-0 w-full sm:w-80 border-none" style={{ zIndex: 9999999999 }}>
        <AnimatePresence>
          <motion.div
            className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50 dark:from-zinc-900 dark:to-zinc-950"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header with logo and close button */}
            <div className="flex items-center justify-between p-4 border-b">
              <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-2">
                <img
                  src="/km/favicon/android-chrome-192x192.png"
                  className="size-8"
                  alt={siteConfig.name}
                />
                <span className="font-bold text-xl bg-linear-to-r from-pink-600 to-purple-400 bg-clip-text text-transparent">
                  {siteConfig.name}
                </span>
              </Link>

              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="rounded-full">
                {/* <X className="h-5 w-5" /> */}
              </Button>
            </div>

            {/* Navigation links */}
            <div className="flex-1 overflow-auto py-8 px-6">
              <nav className="flex flex-col gap-2">
                {displayNavItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "relative px-4 py-3 rounded-xl text-base font-medium transition-all duration-200",
                        "flex items-center",
                        isActive
                          ? "text-white"
                          : "text-foreground/70 hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-highlight-mobile"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-600 to-purple-500"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <span className="relative z-10">{item.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Auth buttons */}
            {!session?.user ? (
              <div className="p-6 border-t flex flex-col gap-3">
                <Link
                  href="/signin"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-4 py-3 rounded-xl text-center text-base font-medium border border-gray-200 dark:border-gray-800 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-4 py-3 rounded-xl text-center text-base font-medium text-white bg-gradient-to-r from-pink-600 to-purple-500 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  Get Started
                </Link>
              </div>
            ) : (
              <div className="p-6 border-t">
                <div className="flex items-center gap-3 mb-4">
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-600 to-purple-500 flex items-center justify-center text-white font-medium">
                      {session.user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{session.user.name}</p>
                    <p className="text-sm text-muted-foreground">{session.user.email}</p>
                  </div>
                </div>

                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-4 py-3 rounded-xl text-center text-base font-medium text-white bg-gradient-to-r from-pink-600 to-purple-500 shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Icons.dashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
