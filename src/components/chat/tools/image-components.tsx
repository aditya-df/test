"use client";

import { memo, useState, useCallback, useMemo, useEffect } from "react";
import { Clock, AlertTriangle, ImageIcon, ZoomIn, Download, CopyIcon } from "lucide-react";
import { cn } from "@/utils/utils";

// Helper function to check if URL is from GCS
const isGCSUrl = (url: string) => {
  return (
    url.includes("storage.googleapis.com") ||
    url.includes("storage.cloud.google.com")
  );
};

// Helper function to check if URL is an image
export const isImageUrl = (url: string) => {
  if (!url) return false;

  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?.*)?$/i;
  const hasImageExtension = imageExtensions.test(url);

  // Check if it's a GCS URL that looks like an image (contains image-related keywords)
  const isGCSImage =
    isGCSUrl(url) &&
    (url.includes("imagen-generated") ||
      url.includes("-image-") ||
      url.includes("/images/") ||
      hasImageExtension);

  return hasImageExtension || isGCSImage;
};

// Helper function to extract filename from GCS URL
const getFilenameFromGCSUrl = (url: string) => {
  try {
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1];
    return filename || "gcs-image";
  } catch {
    return "gcs-image";
  }
};

// Helper function to get proxied image URL
const getProxiedImageUrl = (originalUrl: string, token: string | undefined) => {
  if (isGCSUrl(originalUrl)) {
    if (token) {
      return `/api/proxy-image?url=${encodeURIComponent(originalUrl)}&token=${token}`;
    }
    return `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  }
  return originalUrl;
};

// Helper function to create a nice title from prompt
const createImageTitle = (prompt: string, alt?: string) => {
  if (!prompt && !alt) return "Generated Image";

  const text = prompt || alt || "";

  // If text is short enough, use it as is
  if (text.length <= 50) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  // For longer text, create a nice summary
  const words = text.split(" ");
  let summary = "";

  for (const word of words) {
    if ((summary + " " + word).length <= 50) {
      summary += (summary ? " " : "") + word;
    } else {
      break;
    }
  }

  // If we truncated, add ellipsis
  if (summary.length < text.length) {
    summary += "...";
  }

  return summary.charAt(0).toUpperCase() + summary.slice(1);
};

// Enhanced URL validation optimized for mobile
const useUrlValidator = (url: string) => {
  const [isValid, setIsValid] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isChecking, setIsChecking] = useState(true);


  const validateUrl = useCallback(async (urlToCheck: string) => {
    if (!urlToCheck || urlToCheck.trim().length === 0) {
      return { valid: false, complete: false };
    }

    // Basic URL format validation
    try {
      const parsedUrl = new URL(urlToCheck);

      // Check if URL looks complete (not cut off)
      const endsWithValidChar = !urlToCheck.endsWith("...");
      const hasMinLength = urlToCheck.length > 10;

      // Check for image file extensions (especially PNG as mentioned)
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?.*)?$/i;
      const hasImageExtension = imageExtensions.test(urlToCheck);

      // For GCS URLs, check if they have the expected structure
      if (isGCSUrl(urlToCheck)) {
        // More lenient check for GCS URLs - just need basic structure
        const hasBasicGCSStructure = Boolean(
          urlToCheck.includes("storage.googleapis.com") ||
          urlToCheck.includes("storage.cloud.google.com")
        );

        // For GCS, consider complete if it has basic structure and ends properly
        const isGCSComplete = Boolean(
          hasBasicGCSStructure &&
          endsWithValidChar &&
          hasMinLength &&
          (hasImageExtension || urlToCheck.includes("/o/")) // Either has extension or object path
        );

        return {
          valid: true,
          complete: isGCSComplete,
        };
      }

      // For regular image URLs (including generated images)
      if (hasImageExtension) {
        // If it has a valid image extension (like .png), it's likely complete
        return {
          valid: true,
          complete: Boolean(endsWithValidChar && hasMinLength),
        };
      }

      // For other URLs, check if they have a reasonable path structure
      const hasValidPath = Boolean(
        parsedUrl.pathname !== "/" ||
        parsedUrl.search ||
        parsedUrl.hash ||
        parsedUrl.pathname.length > 1
      );

      return {
        valid: true,
        complete: Boolean(hasValidPath && endsWithValidChar && hasMinLength),
      };
    } catch {
      // If URL parsing fails, check if it might be a partial URL being generated
      const looksLikePartialUrl = urlToCheck.startsWith('http') && urlToCheck.length > 8;
      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)(\?.*)?$/i.test(urlToCheck);

      // If it looks like a partial URL with image extension, mark as valid but incomplete
      if (looksLikePartialUrl && hasImageExtension) {
        return { valid: true, complete: false };
      }

      return { valid: false, complete: false };
    }
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkUrl = async () => {
      setIsChecking(true);

      // Shorter wait time for image URLs since they're typically generated quickly
      timeoutId = setTimeout(async () => {
        const result = await validateUrl(url);
        setIsValid(Boolean(result.valid));
        setIsComplete(Boolean(result.complete));
        setIsChecking(false);
      }, 300); // Reduced from 500ms to 300ms for faster image validation
    };

    checkUrl();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [url, validateUrl]);

  return { isValid, isComplete, isChecking };
};

// Enhanced Image Preview Component with responsive modal and zoom functionality
export const ImagePreview = memo(
  ({
    src,
    alt,
    className = "",
    prompt,
    token
  }: {
    src: string;
    alt?: string;
    className?: string;
    prompt?: string;
    token?: string;
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [copyingImage, setCopyingImage] = useState(false);

    // Use URL validator hook
    const { isValid, isComplete, isChecking } = useUrlValidator(src);

    // Memoize computed values to prevent recalculation on every render
    const { proxiedSrc, isFromGCS, filename, imageTitle } = useMemo(
      () => ({
        proxiedSrc: getProxiedImageUrl(src, token),
        isFromGCS: isGCSUrl(src),
        filename: isGCSUrl(src) ? getFilenameFromGCSUrl(src) : alt || "Image",
        imageTitle: createImageTitle(prompt || alt || "", alt),
      }),
      [src, alt, prompt]
    );

    // Enhanced download functionality with better error handling
    const handleDownloadImage = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!isValid || !isComplete) {
          console.error("Cannot download: URL is invalid or incomplete");
          return;
        }

        try {
          const response = await fetch(proxiedSrc, {
            mode: "cors",
            method: "GET",
          });

          if (!response.ok) {
            throw new Error(
              `Failed to fetch image: ${response.status} ${response.statusText}`
            );
          }

          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;

          // Determine file extension from blob type or URL
          let fileExtension = "png"; // default
          if (blob.type) {
            const mimeType = blob.type.split("/")[1];
            if (
              mimeType &&
              ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(mimeType)
            ) {
              fileExtension = mimeType === "svg+xml" ? "svg" : mimeType;
            }
          } else {
            const urlMatch = src.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i);
            if (urlMatch) {
              fileExtension = urlMatch[1].toLowerCase();
            }
          }

          link.download = `${filename.replace(/\.[^/.]+$/, "")}.${fileExtension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
          console.error("Download failed:", error);
          if (isValid && isComplete) {
            window.open(src, "_blank", "noopener,noreferrer");
          }
        }
      },
      [src, proxiedSrc, filename, isValid, isComplete]
    );

    // Enhanced mobile-friendly modal with zoom functionality
    const handleImageClick = useCallback(() => {
      if (!isValid || !isComplete) {
        console.error("Cannot open modal: URL is invalid or incomplete");
        return;
      }

      // Create modal element if it doesn't exist
      if (!document.getElementById("global-image-modal")) {
        const modalDiv = document.createElement("div");
        modalDiv.id = "global-image-modal";
        modalDiv.style.cssText = `
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          padding: 2rem;
          touch-action: manipulation;
        `;

        // Zoom state variables
        let zoom = 1;
        let panX = 0;
        let panY = 0;
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        const contentDiv = document.createElement("div");
        contentDiv.style.cssText = `
          position: relative;
          background: white;
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 300px;
          min-height: 200px;
          margin: 1rem;
        `;

        const headerDiv = document.createElement("div");
        headerDiv.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(229, 231, 235, 1);
          flex-shrink: 0;
          background: white;
          border-radius: 1rem 1rem 0 0;
        `;

        const titleSpan = document.createElement("span");
        titleSpan.style.cssText = `
          font-size: 1rem;
          font-weight: 600;
          color: rgba(17, 24, 39, 1);
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
          flex: 1;
          margin-right: 1rem;
          line-height: 1.4;
          
          @media (min-width: 640px) {
            font-size: 1.125rem;
          }
        `;

        const buttonContainer = document.createElement("div");
        buttonContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 0.25rem;
        `;

        // Create buttons with consistent styling
        const createButton = (html: string, title: string) => {
          const button = document.createElement("button");
          button.innerHTML = html;
          button.title = title;
          button.style.cssText = `
            padding: 0.75rem;
            color: rgba(107, 114, 128, 1);
            background: transparent;
            border: none;
            border-radius: 0.5rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
            min-width: 40px;
            min-height: 40px;
            
            @media (hover: hover) {
              :hover {
                background-color: rgba(243, 244, 246, 1);
              }
            }
          `;
          return button;
        };

        // Create all buttons
        const zoomInButton = createButton(`
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <line x1="9" y1="11" x2="13" y2="11"/>
            <line x1="11" y1="9" x2="11" y2="13"/>
          </svg>
        `, "Zoom in");

        const zoomOutButton = createButton(`
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <line x1="9" y1="11" x2="13" y2="11"/>
          </svg>
        `, "Zoom out");

        const resetZoomButton = createButton(`
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
        `, "Reset zoom");

        const copyButton = createButton(`
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        `, "Copy image");

        const downloadButton = createButton(`
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        `, "Download image");

        const closeButton = createButton("×", "Close");
        closeButton.style.fontSize = "1.5rem";
        closeButton.style.fontWeight = "300";

        const imageContainer = document.createElement("div");
        imageContainer.style.cssText = `
          position: relative;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          min-height: 200px;
          background: #f8f9fa;
          cursor: grab;
          padding: 1rem;
        `;

        const loadingDiv = document.createElement("div");
        loadingDiv.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(107, 114, 128, 1);
          font-size: 0.875rem;
          text-align: center;
        `;
        loadingDiv.innerHTML = `
          <div style="
            animation: spin 1s linear infinite;
            width: 2rem;
            height: 2rem;
            border: 2px solid rgba(59, 130, 246, 0.3);
            border-top: 2px solid rgba(59, 130, 246, 1);
            border-radius: 50%;
            margin-bottom: 0.5rem;
          "></div>
          <div>Loading image...</div>
        `;

        const imageElement = document.createElement("img");
        imageElement.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 0.5rem;
          display: none;
          touch-action: manipulation;
          transition: transform 0.1s ease-out;
          transform-origin: center center;
        `;

        // Zoom and pan functions
        const updateImageTransform = () => {
          imageElement.style.transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`;
        };

        const zoomIn = () => {
          zoom = Math.min(zoom * 1.2, 5);
          updateImageTransform();
        };

        const zoomOut = () => {
          zoom = Math.max(zoom / 1.2, 0.1);
          updateImageTransform();
        };

        const resetZoom = () => {
          zoom = 1;
          panX = 0;
          panY = 0;
          updateImageTransform();
        };

        // Close modal function
        const closeModal = () => {
          const modal = document.getElementById("global-image-modal");
          if (modal) {
            modal.remove();
          }
          document.body.style.overflow = "";
        };

        // Event handlers
        // 🔥 UPDATED: Modal copy handler now copies the actual image
        const modalCopyHandler = async () => {
          const originalHTML = copyButton.innerHTML;

          // Show loading state
          copyButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          `;
          copyButton.style.animation = "spin 1s linear infinite";

          try {
            const success = await copyImageToClipboard(proxiedSrc);

            if (success) {
              // Show success state (green checkmark)
              copyButton.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              `;
              copyButton.style.color = "rgb(34, 197, 94)"; // green
            } else {
              throw new Error("Copy failed");
            }
          } catch (error) {
            // Show error state (red X)
            console.error("Copy failed", error);
            copyButton.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            `;
            copyButton.style.color = "rgb(239, 68, 68)"; // red
          }

          // Reset after 2 seconds
          setTimeout(() => {
            copyButton.innerHTML = originalHTML;
            copyButton.style.animation = "";
            copyButton.style.color = "rgba(107, 114, 128, 1)"; // original
          }, 2000);
        };

        const modalDownloadHandler = async () => {
          try {
            await handleDownloadImage({
              stopPropagation: () => { },
            } as React.MouseEvent);
          } catch (error) {
            console.error("Modal download failed:", error);
          }
        };

        // Mouse and touch event handlers for pan
        const handleMouseDown = (e: MouseEvent) => {
          if (zoom > 1) {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            imageContainer.style.cursor = 'grabbing';
          }
        };

        const handleMouseMove = (e: MouseEvent) => {
          if (isDragging && zoom > 1) {
            const deltaX = e.clientX - lastX;
            const deltaY = e.clientY - lastY;
            panX += deltaX / zoom;
            panY += deltaY / zoom;
            updateImageTransform();
            lastX = e.clientX;
            lastY = e.clientY;
          }
        };

        const handleMouseUp = () => {
          isDragging = false;
          imageContainer.style.cursor = zoom > 1 ? 'grab' : 'default';
        };

        // Wheel zoom handler
        const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          if (e.deltaY < 0) {
            zoomIn();
          } else {
            zoomOut();
          }
        };

        // Touch handlers for mobile
        let lastTouchDistance = 0;
        const handleTouchStart = (e: TouchEvent) => {
          if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            lastTouchDistance = Math.sqrt(
              Math.pow(touch2.clientX - touch1.clientX, 2) +
              Math.pow(touch2.clientY - touch1.clientY, 2)
            );
          } else if (e.touches.length === 1 && zoom > 1) {
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
          }
        };

        const handleTouchMove = (e: TouchEvent) => {
          e.preventDefault();
          if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.sqrt(
              Math.pow(touch2.clientX - touch1.clientX, 2) +
              Math.pow(touch2.clientY - touch1.clientY, 2)
            );

            if (lastTouchDistance > 0) {
              const scale = currentDistance / lastTouchDistance;
              zoom = Math.min(Math.max(zoom * scale, 0.1), 5);
              updateImageTransform();
            }
            lastTouchDistance = currentDistance;
          } else if (e.touches.length === 1 && isDragging && zoom > 1) {
            const deltaX = e.touches[0].clientX - lastX;
            const deltaY = e.touches[0].clientY - lastY;
            panX += deltaX / zoom;
            panY += deltaY / zoom;
            updateImageTransform();
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
          }
        };

        const handleTouchEnd = () => {
          isDragging = false;
          lastTouchDistance = 0;
        };

        // Attach event listeners
        zoomInButton.addEventListener('click', zoomIn);
        zoomOutButton.addEventListener('click', zoomOut);
        resetZoomButton.addEventListener('click', resetZoom);
        copyButton.addEventListener('click', modalCopyHandler);
        downloadButton.addEventListener('click', modalDownloadHandler);
        closeButton.addEventListener('click', closeModal);

        // Pan and zoom event listeners
        imageContainer.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        imageContainer.addEventListener('wheel', handleWheel);

        // Touch events
        imageContainer.addEventListener('touchstart', handleTouchStart);
        imageContainer.addEventListener('touchmove', handleTouchMove);
        imageContainer.addEventListener('touchend', handleTouchEnd);

        // Modal background click to close
        modalDiv.addEventListener('click', closeModal);
        contentDiv.addEventListener('click', (e) => e.stopPropagation());

        // Image load handlers
        imageElement.onload = () => {
          imageElement.style.display = "block";
          loadingDiv.style.display = "none";

          // Get image natural dimensions
          const imageWidth = imageElement.naturalWidth;
          const imageHeight = imageElement.naturalHeight;

          // Get viewport dimensions
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Calculate available space (accounting for padding, header, and margins)
          const headerHeight = 80;
          const totalPadding = 64; // 2rem on each side
          const margins = 32; // 1rem margins on content

          const availableWidth = viewportWidth - totalPadding;
          const availableHeight = viewportHeight - totalPadding - headerHeight;

          // Calculate scale to fit image within available space
          const scaleX = availableWidth / imageWidth;
          const scaleY = availableHeight / imageHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Never scale up

          // Calculate final image display size
          const displayWidth = imageWidth * scale;
          const displayHeight = imageHeight * scale;

          // Set container size to fit the scaled image plus some padding
          const containerWidth = Math.min(displayWidth + margins, availableWidth);
          const containerHeight = Math.min(displayHeight + margins + headerHeight, availableHeight + headerHeight);

          contentDiv.style.width = `${containerWidth}px`;
          contentDiv.style.height = `${containerHeight}px`;
          contentDiv.style.maxWidth = '95vw';
          contentDiv.style.maxHeight = '95vh';

          // Adjust image container to give proper space
          imageContainer.style.minHeight = `${Math.min(displayHeight + 32, availableHeight)}px`;
        };

        imageElement.onerror = () => {
          loadingDiv.innerHTML = `
            <div style="text-align: center; color: rgba(239, 68, 68, 1); padding: 1rem;">
              <div style="margin-bottom: 0.5rem; font-weight: 500;">Failed to load image</div>
              <div style="font-size: 0.75rem; opacity: 0.8;">The image URL might be incomplete or invalid</div>
            </div>
          `;
        };

        // Build the modal
        buttonContainer.appendChild(zoomInButton);
        buttonContainer.appendChild(zoomOutButton);
        buttonContainer.appendChild(resetZoomButton);
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(downloadButton);
        buttonContainer.appendChild(closeButton);
        headerDiv.appendChild(titleSpan);
        headerDiv.appendChild(buttonContainer);
        imageContainer.appendChild(loadingDiv);
        imageContainer.appendChild(imageElement);
        contentDiv.appendChild(headerDiv);
        contentDiv.appendChild(imageContainer);
        modalDiv.appendChild(contentDiv);

        // Set content
        titleSpan.textContent = imageTitle;
        imageElement.src = proxiedSrc;
        imageElement.alt = alt || imageTitle;

        // Add to DOM
        document.body.appendChild(modalDiv);
        document.body.style.overflow = "hidden";

        // Add CSS animation for spin
        if (!document.getElementById("modal-spinner-styles")) {
          const style = document.createElement("style");
          style.id = "modal-spinner-styles";
          style.textContent = `
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
        }

        // Cleanup function
        const cleanup = () => {
          zoomInButton.removeEventListener('click', zoomIn);
          zoomOutButton.removeEventListener('click', zoomOut);
          resetZoomButton.removeEventListener('click', resetZoom);
          copyButton.removeEventListener('click', modalCopyHandler);
          downloadButton.removeEventListener('click', modalDownloadHandler);
          closeButton.removeEventListener('click', closeModal);
          imageContainer.removeEventListener('mousedown', handleMouseDown);
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          imageContainer.removeEventListener('wheel', handleWheel);
          imageContainer.removeEventListener('touchstart', handleTouchStart);
          imageContainer.removeEventListener('touchmove', handleTouchMove);
          imageContainer.removeEventListener('touchend', handleTouchEnd);
          modalDiv.removeEventListener('click', closeModal);
        };

        // Store cleanup function for when modal is removed
        modalDiv.addEventListener('remove', cleanup);
      }
    }, [proxiedSrc, imageTitle, alt, isValid, isComplete, handleDownloadImage, src]);

    const copyImageToClipboard = async (imageUrl: string): Promise<boolean> => {
      try {
        // Check if the browser supports the Clipboard API
        if (!navigator.clipboard || !navigator.clipboard.write) {
          console.warn("Clipboard API not supported");
          return false;
        }

        // Fetch the image
        const response = await fetch(imageUrl, {
          mode: "cors",
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();

        // Check if the blob is an image type that can be copied
        if (!blob.type.startsWith('image/')) {
          console.warn("File is not an image type:", blob.type);
          return false;
        }

        // Create clipboard item with the image blob
        const clipboardItem = new ClipboardItem({
          [blob.type]: blob
        });

        // Write to clipboard
        await navigator.clipboard.write([clipboardItem]);
        return true;

      } catch (error) {
        console.error("Failed to copy image to clipboard:", error);
        return false;
      }
    };

    const handleImageLoad = useCallback(() => {
      setImageLoaded(true);
      setImageError(false);
    }, []);

    const handleImageError = useCallback(() => {
      setImageLoaded(false);
      setImageError(true);
    }, []);

    // const handleCopyUrl = useCallback(
    //   async (e: React.MouseEvent) => {
    //     e.stopPropagation();
    //     if (!isValid || !isComplete) {
    //       console.error("Cannot copy invalid or incomplete URL:", src);
    //       return;
    //     }
    //     try {
    //       await navigator.clipboard.writeText(src);
    //     } catch (error) {
    //       console.error("Failed to copy URL:", error);
    //     }
    //   },
    //   [src, isValid, isComplete]
    // );


    
    // 🔥 UPDATED: Copy the actual image instead of URL
    const handleCopyImage = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isValid || !isComplete) {
          console.error("Cannot copy invalid or incomplete image");
          return;
        }

        setCopyingImage(true);
        try {
          const success = await copyImageToClipboard(proxiedSrc);

          if (success) {
            // Show success feedback - could add toast notification here
            console.log("Image copied successfully!");
          } else {
            // Fallback: copy URL if image copy fails
            await navigator.clipboard.writeText(src);
            console.log("Copied URL as fallback");
          }
        } catch (error) {
          console.error("Failed to copy image:", error);
        } finally {
          setCopyingImage(false);
        }
      },
      [proxiedSrc, src, isValid, isComplete]
    );

    const handleMouseEnter = useCallback(() => {
      setIsHovering(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setIsHovering(false);
    }, []);

    // Show waiting state for incomplete URLs
    if (isChecking) {
      return (
        <div
          className={`inline-block my-4 p-3 sm:p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 ${className}`}
        >
          <div className="flex items-center space-x-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full"></div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                🖼️ Generating image...
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400">
                Please wait while the image is being created
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Show error state for invalid URLs
    if (!isValid) {
      return (
        <div
          className={`inline-block my-4 p-3 sm:p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 ${className}`}
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                Invalid image URL
              </span>
              <span className="text-xs text-red-600 dark:text-red-400">
                The provided URL appears to be invalid
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Show incomplete state
    if (!isComplete) {
      return (
        <div
          className={`inline-block my-4 p-3 sm:p-4 border border-yellow-200 dark:border-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 ${className}`}
        >
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                🔄 Image URL appears incomplete
              </span>
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                Waiting for complete URL...
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Main image display
    return (
      <div
        className={`relative my-4 group ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative inline-block">
          {/* Loading skeleton - only show when image hasn't loaded yet */}
          {!imageLoaded && !imageError && (
            <div className="w-full max-w-lg bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center aspect-video">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}

          {/* Error state */}
          {imageError && (
            <div className="w-full max-w-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-center aspect-video">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  Failed to load image
                </p>
              </div>
            </div>
          )}

          {/* Actual image - show when not in error state */}
          {!imageError && (
            <>
              <img
                src={proxiedSrc}
                alt={alt || imageTitle}
                className={`block rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer max-w-full h-auto ${!imageLoaded ? "opacity-0 absolute" : "opacity-100 relative"
                  }`}
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  maxHeight: "400px",
                  width: "auto",
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                onClick={handleImageClick}
                loading="lazy"
              />

              {/* Source indicator for GCS images */}
              {isFromGCS && imageLoaded && (
                <div className="absolute top-2 right-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded shadow-sm">
                  GCS
                </div>
              )}

              {/* Hover overlay with action buttons */}
              {imageLoaded &&
                !imageError &&
                isHovering &&
                isValid &&
                isComplete && (
                  <div className="absolute inset-0 bg-gray-400/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={handleImageClick}
                        className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        title="View full size"
                      >
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={handleDownloadImage}
                        className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        title="Download image"
                      >
                        <Download className="w-5 h-5 text-gray-700" />
                      </button>
                      <button
                        onClick={handleCopyImage}
                        disabled={copyingImage} // ✅ Disable while copying
                        className={cn(
                          "p-3 bg-white rounded-full shadow-lg transition-colors cursor-pointer",
                          copyingImage ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                        )}
                        title={copyingImage ? "Copying..." : "Copy image"}
                      >
                        <CopyIcon className={cn("w-5 h-5 text-gray-700", {
                          "animate-pulse": copyingImage
                        })} />
                      </button>
                    </div>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    );
  }
);

ImagePreview.displayName = "ImagePreview";

export const GeneratedImageDisplay = memo(
  ({
    imageUrl,
    prompt,
    model,
    timestamp,
    index,
    token
  }: {
    imageUrl: string;
    prompt: string;
    model?: string;
    timestamp?: string;
    index?: number;
    token?: string;
  }) => {
    const formattedTime = timestamp
      ? new Date(timestamp).toLocaleString()
      : "Unknown time";
    console.log("GeneratedImageDisplay rendered ", index);
    return (
      <div className="border border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-950/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            🎨 Generated Image
          </span>
          {model && (
            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded">
              {model}
            </span>
          )}
        </div>

        <div className="mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Prompt:</strong> {prompt}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            <strong>Generated:</strong> {formattedTime}
          </p>
        </div>

        <ImagePreview
          src={imageUrl}
          alt={`Generated image: ${prompt}`}
          prompt={prompt}
          className="w-full"
          token={token}
        />
      </div>
    );
  }
);

GeneratedImageDisplay.displayName = "GeneratedImageDisplay";
