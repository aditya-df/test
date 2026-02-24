"use client";

import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface SmartLoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback: React.ReactNode;
  delay?: number; // ms to wait before showing skeleton
  minDisplay?: number; // min ms to show skeleton
}

export function SmartLoadingWrapper({
  isLoading,
  children,
  fallback,
  delay = 200,
  minDisplay = 400,
}: SmartLoadingWrapperProps) {
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showContent, setShowContent] = useState(!isLoading);
  const loadingStartTime = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      setShowContent(false);
      // Set a delay before showing the skeleton
      timeoutRef.current = setTimeout(() => {
        setShowSkeleton(true);
        loadingStartTime.current = Date.now();
      }, delay);
    } else {
      // Clear any pending skeleton timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const currentTime = Date.now();
      const timeSpentLoading = loadingStartTime.current 
        ? currentTime - loadingStartTime.current 
        : 0;

      if (showSkeleton && timeSpentLoading < minDisplay) {
        // Ensure skeleton stays for at least minDisplay
        const remainingTime = minDisplay - timeSpentLoading;
        setTimeout(() => {
          setShowSkeleton(false);
          setShowContent(true);
        }, remainingTime);
      } else {
        setShowSkeleton(false);
        setShowContent(true);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading, delay, minDisplay, showSkeleton]);

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {showSkeleton && !showContent ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {fallback}
          </motion.div>
        ) : showContent ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
