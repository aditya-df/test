"use client";

import React, { useEffect, useState } from "react";
import { Spinner, ClaudeSpinner, PulsingDotsSpinner } from "./spinner";
import { usePathname, useSearchParams } from "next/navigation";

interface PageLoadingSpinnerProps {
  variant?: "spinner" | "claude" | "dots";
  delay?: number; // Delay in ms before showing the spinner (to avoid flashing for quick loads)
  position?: "center" | "top-right" | "bottom-right";
  message?: string; // Optional message to display
  autoProgress?: boolean; // Use automatic progress tracking
}

export function PageLoadingSpinner({ 
  variant = "claude", 
  delay = 300,
  position = "center",
  message = "Loading...",
  autoProgress = true
}: PageLoadingSpinnerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSpinner, setShowSpinner] = useState(false);
  
  // This effect runs on route changes
  useEffect(() => {
    // Start loading
    setLoading(true);
    setProgress(10); // Start with some progress
    
    // Only show the spinner after a delay to avoid flashing for quick navigations
    const spinnerTimeout = setTimeout(() => {
      setShowSpinner(true);
    }, delay);
    
    // Simulate progress if not using autoProgress
    let interval: NodeJS.Timeout | null = null;
    
    if (!autoProgress) {
      interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + Math.random() * 10;
          return next > 90 ? 90 : next; // Cap at 90% until complete
        });
      }, 300);
    }
    
    // Complete loading after a short delay
    const completeTimeout = setTimeout(() => {
      setProgress(100);
      
      setTimeout(() => {
        setLoading(false);
        setShowSpinner(false);
        setProgress(0);
      }, 300);
    }, 500); // Assume navigation completes in 500ms
    
    return () => {
      if (spinnerTimeout) clearTimeout(spinnerTimeout);
      if (interval) clearInterval(interval);
      if (completeTimeout) clearTimeout(completeTimeout);
    };
  }, [pathname, searchParams, delay, autoProgress]); // Re-run when the route changes
  
  // Position classes
  const positionClasses = {
    'center': 'fixed inset-0 flex items-center justify-center',
    'top-right': 'fixed top-4 right-4',
    'bottom-right': 'fixed bottom-4 right-4'
  };
  
  if (!loading || !showSpinner) return null;
  
  return (
    <div className={`${positionClasses[position]} z-50 pointer-events-none`}>
      <div className="bg-white/80 dark:bg-gray-900/80 p-6 rounded-lg shadow-lg flex flex-col items-center">
        {variant === "spinner" && (
          <Spinner 
            percentage={progress} 
            showPercentage={true} 
            size="md"
            autoProgress={autoProgress}
          />
        )}
        
        {variant === "claude" && (
          <ClaudeSpinner 
            percentage={progress} 
            showPercentage={true} 
            size="md"
            autoProgress={autoProgress}
          />
        )}
        
        {variant === "dots" && (
          <PulsingDotsSpinner 
            percentage={progress} 
            showPercentage={true} 
            size="md"
            autoProgress={autoProgress}
          />
        )}
        
        {message && (
          <p className="mt-3 text-sm text-center text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}
