"use client";

import { useRef, useState, useEffect } from "react";
import vegaEmbed from "vega-embed";
import { Maximize2, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// Update the VegaLiteChart component to handle null specs
export function VegaLiteChart({ spec }: { spec: any }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const fullscreenChartRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreenLoading, setIsFullscreenLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewInstance, setViewInstance] = useState<any>(null);
  const [fullscreenViewInstance, setFullscreenViewInstance] =
    useState<any>(null);

  const renderChart = async (
    container: HTMLDivElement,
    isFullscreenView = false
  ) => {
    if (!spec || !container) return;

    if (isFullscreenView) {
      setIsFullscreenLoading(true);
      setFullscreenError(null);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      // Create a deep copy of the spec to avoid modifying the original
      const specCopy = JSON.parse(JSON.stringify(spec));

      // Validate and fix data structure
      if (specCopy.data) {
        // If data.values is null or not an array, set it to empty array
        if (specCopy.data.values === null || !Array.isArray(specCopy.data.values)) {
          console.warn("Chart data.values is null or invalid, using empty array");
          specCopy.data.values = [];
        }
      } else {
        // If no data field exists, add an empty one
        console.warn("Chart spec missing data field, adding empty data");
        specCopy.data = { values: [] };
      }

      // Add responsive width if not specified
      if (!specCopy.width) {
        if (isFullscreenView) {
          specCopy.width = window.innerWidth * 0.8;
        } else {
          // Responsive width based on viewport size
          const isMobile = window.innerWidth < 640; // sm breakpoint
          const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024; // md breakpoint

          if (isMobile) {
            specCopy.width = Math.min(window.innerWidth - 80, 400); // Account for padding and controls
          } else if (isTablet) {
            specCopy.width = Math.min(window.innerWidth * 0.7, 600);
          } else {
            specCopy.width = "container";
          }
        }
      }

      // Set a reasonable height if in fullscreen mode or based on viewport
      if (isFullscreenView && !specCopy.height) {
        specCopy.height = window.innerHeight * 0.7;
      } else if (!specCopy.height) {
        // Adjust height for mobile devices
        const isMobile = window.innerWidth < 640;
        if (isMobile) {
          specCopy.height = 300; // Smaller height for mobile
        }
      }

      // Add configuration for better interactivity
      if (!specCopy.config) {
        specCopy.config = {};
      }

      // Enable tooltips and improve their appearance
      specCopy.config.tooltips = {
        ...specCopy.config.tooltips,
        enabled: true,
      };

      // Add better defaults for axis labels with responsive sizing
      const isMobile = window.innerWidth < 640;
      const isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;

      if (!specCopy.config.axis) {
        specCopy.config.axis = {};
      }
      specCopy.config.axis.labelOverlap = true;
      specCopy.config.axis.labelFontSize = isMobile ? 10 : isTablet ? 11 : 12;
      specCopy.config.axis.titleFontSize = isMobile ? 11 : isTablet ? 12 : 13;

      // Responsive legend configuration
      if (!specCopy.config.legend) {
        specCopy.config.legend = {};
      }
      specCopy.config.legend.labelFontSize = isMobile ? 10 : isTablet ? 11 : 12;
      specCopy.config.legend.titleFontSize = isMobile ? 11 : isTablet ? 12 : 13;
      specCopy.config.legend.symbolSize = isMobile ? 80 : isTablet ? 100 : 120;

      // Responsive title configuration
      if (!specCopy.config.title) {
        specCopy.config.title = {};
      }
      specCopy.config.title.fontSize = isMobile ? 13 : isTablet ? 14 : 16;

      // Use a more efficient renderer for large datasets
      const renderer = isFullscreenView ? "canvas" : "svg";

      // Embed the chart with improved options
      const result = await vegaEmbed(container, specCopy, {
        actions: {
          export: true,
          source: false,
          compiled: false,
          editor: false,
        },
        renderer: renderer,
        downloadFileName: "chart-export",
        hover: true,
        logLevel: 2, // Reduce logging to improve performance
      });

      if (isFullscreenView) {
        setFullscreenViewInstance(result.view);
        setIsFullscreenLoading(false);
      } else {
        setViewInstance(result.view);
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Error rendering Vega chart:", error);

      if (isFullscreenView) {
        setFullscreenError(error.message || "Failed to render chart");
        setIsFullscreenLoading(false);

        // Display error message in the chart container
        container.innerHTML = `
          <div class="p-4 text-red-500">
            <p>Error rendering chart:</p>
            <pre class="text-sm mt-2 p-2 bg-gray-100 dark:bg-zinc-700 rounded overflow-auto">
              ${error.message || "Unknown error"}
            </pre>
          </div>
        `;
      } else {
        setError(error.message || "Failed to render chart");
        setIsLoading(false);

        // Display error message in the chart container
        container.innerHTML = `
          <div class="p-4 text-red-500">
            <p>Error rendering chart:</p>
            <pre class="text-sm mt-2 p-2 bg-gray-100 dark:bg-zinc-700 rounded overflow-auto">
              ${error.message || "Unknown error"}
            </pre>
          </div>
        `;
      }
    }
  };

  // Render the main chart when the component mounts or spec changes
  useEffect(() => {
    if (chartRef.current) {
      renderChart(chartRef.current, false);
    }

    // Cleanup function
    return () => {
      if (viewInstance) {
        viewInstance.finalize();
      }
    };
  }, [spec]);

  // Handle fullscreen mode changes
  useEffect(() => {
    // When entering fullscreen mode
    if (isFullscreen) {
      // Set loading state immediately
      setIsFullscreenLoading(true);

      // Use a small delay to ensure the DOM is ready
      const timer = setTimeout(() => {
        if (fullscreenChartRef.current) {
          renderChart(fullscreenChartRef.current, true);
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    } else {
      // When exiting fullscreen mode, clean up
      if (fullscreenViewInstance) {
        fullscreenViewInstance.finalize();
        setFullscreenViewInstance(null);
      }
    }
  }, [isFullscreen]);

  const handleZoomIn = () => {
    if (zoomLevel < 2) {
      const newZoomLevel = zoomLevel + 0.1;
      setZoomLevel(newZoomLevel);
      if (chartRef.current) {
        chartRef.current.style.transform = `scale(${newZoomLevel})`;
      }
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 0.5) {
      const newZoomLevel = zoomLevel - 0.1;
      setZoomLevel(newZoomLevel);
      if (chartRef.current) {
        chartRef.current.style.transform = `scale(${newZoomLevel})`;
      }
    }
  };

  const handleReset = () => {
    setZoomLevel(1);
    if (chartRef.current) {
      chartRef.current.style.transform = "scale(1)";
    }
  };

  if (!spec) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center border rounded-md p-4 bg-white dark:bg-zinc-800 text-red-500">
        Unable to load chart: Invalid specification
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full my-2 sm:my-4 border rounded-md bg-white dark:bg-zinc-800 overflow-hidden">
        {/* Chart controls - responsive positioning */}
        <div className="absolute bottom-2 right-2 flex flex-wrap gap-1 z-10 bg-white/90 dark:bg-zinc-800/90 rounded-md p-1 shadow-sm backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={handleReset}
            title="Reset zoom"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8"
            onClick={() => setIsFullscreen(true)}
            title="View fullscreen"
          >
            <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-800/50 z-5">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
              <span className="mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Loading chart...
              </span>
            </div>
          </div>
        )}

        {/* Chart container with overflow handling - responsive height */}
        <div className="relative h-[300px] sm:h-[350px] md:h-[400px] overflow-auto p-2 sm:p-4 grow-0">
          <div
            className="transform-origin-center transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
            }}
          >
            <div ref={chartRef} className="w-full min-h-[280px] sm:min-h-[320px] md:min-h-[350px]" />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-50 dark:bg-red-900/20 p-2 text-xs sm:text-sm text-red-600 dark:text-red-400">
            Error: {error}
          </div>
        )}
      </div>

      {/* Fullscreen dialog */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] p-0 bg-white dark:bg-zinc-900">
          <DialogTitle className="px-4 py-2 border-b flex justify-between items-center">
            <span>Chart Visualization</span>
            {isFullscreenLoading && (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            )}
          </DialogTitle>
          <div className="relative h-[80vh] overflow-auto p-4">
            {isFullscreenLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <span className="mt-4 text-gray-500">
                    Preparing chart visualization...
                  </span>
                </div>
              </div>
            ) : null}
            <div ref={fullscreenChartRef} className="w-full h-full"></div>

            {fullscreenError && (
              <div className="absolute bottom-0 left-0 right-0 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
                <p className="font-medium">Error rendering chart:</p>
                <p>{fullscreenError}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper function for safe JSON parsing
export function safeJsonParse(jsonString: string | any) {
  if (typeof jsonString !== "string") {
    return jsonString; // Return as is if not a string
  }

  // Check if the string looks like HTML
  if (
    jsonString.trim().startsWith("<!DOCTYPE") ||
    jsonString.trim().startsWith("<html")
  ) {
    console.error(
      "Received HTML instead of JSON:",
      jsonString.substring(0, 100)
    );
    return null;
  }

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Error parsing JSON:", e);
    // Try to extract JSON from the string if it contains JSON-like content
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error("Error parsing extracted JSON:", e2);
      }
    }
    return null;
  }
}

// Helper function to validate Vega-Lite spec
export function isValidVegaSpec(spec: any): boolean {
  if (!spec || typeof spec !== "object") {
    return false;
  }

  // Check if spec has required Vega-Lite properties
  if (!spec.mark && !spec.layer && !spec.concat && !spec.hconcat && !spec.vconcat) {
    console.warn("Invalid Vega spec: missing mark or layer definition");
    return false;
  }

  // Validate data structure if present
  if (spec.data) {
    // If data has values, ensure it's an array
    if ("values" in spec.data && spec.data.values !== null && !Array.isArray(spec.data.values)) {
      console.warn("Invalid Vega spec: data.values must be an array");
      return false;
    }
  }

  return true;
}
