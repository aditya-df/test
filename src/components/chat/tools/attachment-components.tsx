"use client";

import { memo, useState, useCallback } from "react";
// AI SDK 5.0: Attachment renamed to FileUIPart
import { FileUIPart } from "ai";

// AI SDK 5.0: FileUIPart uses mediaType instead of contentType
// Type alias for backwards compatibility with extended properties
type Attachment = FileUIPart & {
  // AI SDK 5.0: contentType renamed to mediaType, add fallback accessor
  contentType?: string;
  name?: string;
};
import { cn } from "@/utils/utils";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface AttachmentViewerProps {
  attachments?: Attachment[];
  isUser?: boolean;
}

// FIXED: Memoized AttachmentViewer component
export const AttachmentViewer = memo(
  ({ attachments, isUser = false }: AttachmentViewerProps) => {
    const [selectedAttachment, setSelectedAttachment] =
      useState<Attachment | null>(null);

    // AI SDK 5.0: Helper to get mediaType with fallback to contentType
    const getMediaType = useCallback((attachment: Attachment) => {
      return attachment.mediaType || attachment.contentType;
    }, []);

    // Helper function to get proxy URL for GCS files
    const getProxyUrl = useCallback((attachment: Attachment) => {
      // Check if it's a GCS URL that needs proxying
      if (attachment.url.includes("storage.googleapis.com")) {
        const mediaType = getMediaType(attachment);
        if (mediaType?.startsWith("image/")) {
          return `/api/proxy-image?url=${encodeURIComponent(attachment.url)}`;
        } else {
          return `/api/proxy-file?url=${encodeURIComponent(attachment.url)}`;
        }
      }
      // Return original URL if it's not a GCS URL (e.g., data URLs)
      return attachment.url;
    }, [getMediaType]);

    // Memoize helper functions - AI SDK 5.0: use mediaType with fallback
    const isImage = useCallback((attachment: Attachment) => {
      return getMediaType(attachment)?.startsWith("image/");
    }, [getMediaType]);

    const isPDF = useCallback((attachment: Attachment) => {
      return getMediaType(attachment) === "application/pdf";
    }, [getMediaType]);

    const isVideo = useCallback((attachment: Attachment) => {
      return getMediaType(attachment)?.startsWith("video/");
    }, [getMediaType]);

    const isAudio = useCallback((attachment: Attachment) => {
      return getMediaType(attachment)?.startsWith("audio/");
    }, [getMediaType]);

    const getFileIcon = useCallback((attachment: Attachment) => {
      if (isPDF(attachment)) {
        return (
          <svg
            className="w-8 h-8 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        );
      }

      if (isVideo(attachment)) {
        return (
          <svg
            className="w-8 h-8 text-purple-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      }

      if (isAudio(attachment)) {
        return (
          <svg
            className="w-8 h-8 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828a1 1 0 010-1.415z"
              clipRule="evenodd"
            />
          </svg>
        );
      }

      // Default file icon
      return (
        <svg
          className="w-8 h-8 text-blue-500"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }, [isPDF, isVideo, isAudio]);

    const getFileName = useCallback((attachment: Attachment) => {
      // Extract filename from URL or use name property
      const name = attachment.name || attachment.url.split("/").pop() || "file";
      // Truncate long filenames
      return name.length > 20 ? name.substring(0, 17) + "..." : name;
    }, []);

    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <>
        <div
          className={cn(
            "flex flex-wrap gap-2 mt-2",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {attachments.map((attachment, index) => (
            <div
              key={`${attachment.url}-${index}`}
              className={cn(
                "rounded-lg overflow-hidden border cursor-pointer transition-transform hover:scale-105",
                isUser
                  ? "border-blue-300 dark:border-blue-700"
                  : "border-gray-300 dark:border-gray-700"
              )}
              onClick={() => setSelectedAttachment(attachment)}
            >
              {isImage(attachment) ? (
                <div className="relative w-24 h-24">
                  <Image
                    alt=""
                    src={getProxyUrl(attachment)} // Use proxy URL for images
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    "w-24 h-24 flex flex-col items-center justify-center p-2",
                    isUser
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "bg-gray-100 dark:bg-gray-800"
                  )}
                >
                  {getFileIcon(attachment)}
                  {/* Improved text contrast for better readability */}
                  <span
                    className={cn(
                      "text-xs mt-1 text-center truncate w-full font-medium",
                      isUser
                        ? "text-blue-900 dark:text-blue-100" // Better contrast for user messages
                        : "text-gray-900 dark:text-gray-100" // Better contrast for assistant messages
                    )}
                  >
                    {getFileName(attachment)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Modal for viewing attachments */}
        <Dialog
          open={!!selectedAttachment}
          onOpenChange={(open) => !open && setSelectedAttachment(null)}
        >
          <DialogContent className="max-w-4xl w-full p-1 bg-transparent border-none">
            <DialogTitle className="sr-only">
              {selectedAttachment
                ? `View ${getFileName(selectedAttachment)}`
                : "View Attachment"}
            </DialogTitle>

            {selectedAttachment && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 max-h-[90vh] overflow-auto">
                {isImage(selectedAttachment) ? (
                  <div className="relative flex justify-center">
                    <img
                      src={getProxyUrl(selectedAttachment)} // Use proxy URL for images
                      className="max-h-[80vh] object-contain"
                      alt={getFileName(selectedAttachment)}
                    />
                  </div>
                ) : isPDF(selectedAttachment) ? (
                  <iframe
                    src={`${getProxyUrl(selectedAttachment)}#view=FitH`} // Use proxy URL for PDFs
                    className="w-full h-[80vh]"
                    title={getFileName(selectedAttachment)}
                  />
                ) : isVideo(selectedAttachment) ? (
                  <video
                    src={getProxyUrl(selectedAttachment)} // Use proxy URL for videos
                    controls
                    className="max-h-[80vh] max-w-full mx-auto"
                  />
                ) : isAudio(selectedAttachment) ? (
                  <audio
                    src={getProxyUrl(selectedAttachment)} // Use proxy URL for audio
                    controls
                    className="w-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-8">
                    {getFileIcon(selectedAttachment)}
                    <p className="mt-4 text-center font-medium text-gray-900 dark:text-white">
                      {getFileName(selectedAttachment)}
                    </p>
                    <a
                      href={getProxyUrl(selectedAttachment)} // Use proxy URL for download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      Download File
                    </a>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <a
                    href={getProxyUrl(selectedAttachment)} // Use proxy URL for "open in new tab"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

AttachmentViewer.displayName = "AttachmentViewer";
