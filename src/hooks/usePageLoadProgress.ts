"use client";

import { useState, useEffect } from "react";

export function usePageLoadProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start with 10% progress immediately
    setProgress(10);
    
    // Track resource loading progress
    const resourceCount = {
      total: 0,
      loaded: 0
    };
    
    // Function to update progress based on loaded resources
    const updateProgress = () => {
      if (resourceCount.total === 0) return;
      
      // Calculate progress percentage (min 10%, max 90%)
      const calculatedProgress = Math.min(
        90, 
        Math.max(10, Math.round((resourceCount.loaded / resourceCount.total) * 100))
      );
      
      setProgress(calculatedProgress);
    };
    
    // Observer for resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        // Only count resources that are part of the main document
        if (resourceEntry.initiatorType && ['fetch', 'xmlhttprequest', 'script', 'link', 'css', 'img'].includes(resourceEntry.initiatorType)) {
          resourceCount.total++;
          
          // For already loaded resources
          if (resourceEntry.responseEnd > 0) {
            resourceCount.loaded++;
          }
        }
      }
      
      updateProgress();

    });        // Start observing resource timing
    resourceObserver.observe({ entryTypes: ['resource'] });
    
    // Listen for page load complete
    window.addEventListener('load', () => {
      // Set to 100% when page is fully loaded
      setProgress(100);
      
      // Reset after a short delay
      setTimeout(() => {
        setProgress(0);
      }, 500);
    });
    
    return () => {
      resourceObserver.disconnect();
    };
  }, []);

  return progress;
}
