"use client";

import React from "react";
import { cn } from "@/utils/utils";
import { motion } from "framer-motion";
import { usePageLoadProgress } from "@/hooks/usePageLoadProgress";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  percentage?: number;
  showPercentage?: boolean;
  autoProgress?: boolean; // Add this prop to enable automatic progress tracking
}

export function Spinner({ 
  className, 
  size = "md", 
  percentage = 0, 
  showPercentage = false,
  autoProgress = false
}: SpinnerProps) {
  // Use the hook if autoProgress is enabled
  const pageLoadProgress = usePageLoadProgress();
  const currentProgress = autoProgress ? pageLoadProgress : percentage;
  const shouldShowPercentage = showPercentage || autoProgress;
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative">
        <motion.div
          className={cn(
            "rounded-full border-t-transparent border-solid border-primary",
            sizeClasses[size]
          )}
          style={{
            borderWidth: size === "sm" ? "2px" : size === "md" ? "3px" : "4px",
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1.2,
            ease: "linear",
            repeat: Infinity,
          }}
        />
        
        {shouldShowPercentage && currentProgress > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("font-medium", textSizes[size])}>
              {Math.round(currentProgress)}%
            </span>
          </div>
        )}
      </div>
      
      {/* Progress bar below the spinner */}
      {shouldShowPercentage && currentProgress > 0 && (
        <div className="w-full mt-2 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
          <div 
            className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// For a more Claude-like spinner with multiple elements
export function ClaudeSpinner({ 
  className, 
  size = "md", 
  percentage = 0, 
  showPercentage = false,
  autoProgress = false
}: SpinnerProps) {
  // Use the hook if autoProgress is enabled
  const pageLoadProgress = usePageLoadProgress();
  const currentProgress = autoProgress ? pageLoadProgress : percentage;
  const shouldShowPercentage = showPercentage || autoProgress;
  
  const containerSize = {
    sm: "w-10 h-10",
    md: "w-20 h-20",
    lg: "w-28 h-28",
  };

  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Offset values for the percentage display (right and bottom)
  const offsetX = {
    sm: 2,
    md: 4,
    lg: 6,
  };
  
  const offsetY = {
    sm: 2,
    md: 4,
    lg: 6,
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative">
        {/* Spinner container */}
        <div className={cn("relative", containerSize[size])}>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "absolute rounded-full bg-primary",
                dotSize[size]
              )}
              initial={{
                opacity: 0.2,
                scale: 0.8,
              }}
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
              style={{
                top: `${50 - 45 * Math.sin(i * (Math.PI / 4))}%`,
                left: `${50 - 45 * Math.cos(i * (Math.PI / 4))}%`,
                transformOrigin: "center",
              }}
            />
          ))}
        </div>
        
        {/* Percentage display with offset to right and bottom - no circle background */}
        {shouldShowPercentage && currentProgress > 0 && (
          <div 
            className="absolute flex items-center justify-center"
            style={{
              width: size === "sm" ? "16px" : size === "md" ? "32px" : "48px",
              height: size === "sm" ? "16px" : size === "md" ? "32px" : "48px",
              // Apply offset to move right and down from center
              top: `calc(50% + ${offsetY[size]}px)`,
              left: `calc(50% + ${offsetX[size]}px)`,
              transform: "translate(-50%, -50%)",
              zIndex: 10,
            }}
          >
            <span 
              className={cn("font-medium", textSizes[size])}
              style={{ textAlign: "center", display: "block", width: "100%" }}
            >
              {Math.round(currentProgress)}%
            </span>
          </div>
        )}
      </div>
      
      {/* Optional progress bar below the spinner */}
      {shouldShowPercentage && currentProgress > 0 && (
        <div className="w-full mt-2 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
          <div 
            className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}



// A pulsing dot spinner similar to Claude's typing indicator
export function PulsingDotsSpinner({ 
  className, 
  percentage = 0, 
  showPercentage = false,
  autoProgress = false,
  size = "md"
}: SpinnerProps) {
  // Use the hook if autoProgress is enabled
  const pageLoadProgress = usePageLoadProgress();
  const currentProgress = autoProgress ? pageLoadProgress : percentage;
  const shouldShowPercentage = showPercentage || autoProgress;
  
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };
  
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="flex items-center justify-center space-x-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn("bg-primary rounded-full", dotSizes[size])}
            initial={{ opacity: 0.3, scale: 0.8 }}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Optional percentage text and progress bar */}
      {shouldShowPercentage && currentProgress > 0 && (
        <>
          <div className={cn("mt-2 font-medium", textSizes[size])}>
            {Math.round(currentProgress)}%
          </div>
          <div className="w-full mt-1 bg-gray-200 rounded-full h-1 dark:bg-gray-700">
            <div 
              className="bg-primary h-1 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// New component: Progress bar with percentage
export function ProgressBar({ 
  className, 
  percentage = 0,
  size = "md",
  showPercentage = true,
  autoProgress = false,
  color = "primary" // primary, success, warning, error
}: SpinnerProps & { color?: "primary" | "success" | "warning" | "error" }) {
  // Use the hook if autoProgress is enabled
  const pageLoadProgress = usePageLoadProgress();
  const currentProgress = autoProgress ? pageLoadProgress : percentage;
  
  const colorClasses = {
    primary: "bg-blue-600",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500"
  };
  
  const heightClasses = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };
  
  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("w-full", className)}>
      {showPercentage && (
        <div className="flex justify-between mb-1">
          <span className={cn("font-medium", textSizes[size])}>Loading</span>
          <span className={cn("font-medium", textSizes[size])}>
            {Math.round(currentProgress)}%
          </span>
        </div>
      )}
      <div className={cn("w-full bg-gray-200 rounded-full dark:bg-gray-700", heightClasses[size])}>
        <div 
          className={cn("rounded-full transition-all duration-300 ease-in-out", colorClasses[color], heightClasses[size])} 
          style={{ width: `${currentProgress}%` }}
        />
      </div>
    </div>
  );
}
