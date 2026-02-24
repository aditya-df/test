"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/types";
import { motion } from "framer-motion";
import { Session } from "next-auth";

import { cn } from "@/utils/utils";

interface NavigationProps {
  navItems: NavItem[];
  session?: Session | null;
}

export function Navigation({ navItems, session }: NavigationProps): React.ReactElement {
  const pathname = usePathname();
  
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
  
  return (
    <nav className="hidden md:flex items-center space-x-1">
      <div className="flex items-center space-x-1 mr-4">
        {displayNavItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "relative px-4 py-2 rounded-full text-sm font-medium transition-colors",
                "hover:text-foreground/80",
                isActive 
                  ? "text-foreground" 
                  : "text-foreground/60"
              )}
            >
              {item.title}
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-foreground/10"
                  layoutId="nav-highlight"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </Link>
          );
        })}
      </div>
      
      {!session?.user ? (
        <div className="flex items-center space-x-3">
          <Link
            href="/signin"
            className="px-4 py-2 rounded-full text-sm font-medium transition-all hover:bg-foreground/10"
          >
            Sign In
          </Link>
          
          <Link
            href="/signup"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-600 to-purple-500 text-white text-sm font-medium shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300"
          >
            Get Started
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
