"use client";

import { useState, useEffect } from "react";

export function HeaderScroll({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`top-0 z-50 flex h-20 w-full bg-pink-300/80 dark:bg-gray-900/80 backdrop-blur-xs transition-all duration-300 ${isScrolled ? "fixed shadow-xs" : "sticky top-0"} `}
    >
      {children}
    </header>
  );
}
