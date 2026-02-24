// AI SDK 5.0: Attachment renamed to FileUIPart
import { FileUIPart } from "ai";

// AI SDK 5.0: FileUIPart uses mediaType instead of contentType
// Type alias for backwards compatibility with extended properties
type Attachment = FileUIPart & {
  contentType?: string;
  name?: string;
};
import { FileIcon } from "lucide-react";
import { LoaderIcon } from "../icons";

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  // AI SDK 5.0: mediaType instead of contentType, with fallback
  const { url } = attachment;
  const name = attachment.name;
  const contentType = attachment.mediaType || attachment.contentType;
  const fileName = (name || "").toLowerCase();

  // File type detection
  const isPDF = contentType === 'application/pdf';
  const isExcel = contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    contentType === 'application/vnd.ms-excel' ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls');
  const isVideo = contentType?.startsWith('video/') || fileName.endsWith('.mp4');
  const isCSV = contentType === 'text/csv' || fileName.endsWith('.csv');
  const isJSON = contentType === 'application/json' || fileName.endsWith('.json');
  const isText = contentType === 'text/plain' || fileName.endsWith('.txt');

  // Helper function to get proxy URL for GCS files
  const getProxyUrl = (attachment: Attachment) => {
    // Check if it's a GCS URL that needs proxying
    const mediaType = attachment.mediaType || attachment.contentType;
    if (attachment.url.includes("storage.googleapis.com")) {
      if (mediaType?.startsWith("image/")) {
        return `/api/proxy-image?url=${encodeURIComponent(attachment.url)}`;
      } else {
        return `/api/proxy-file?url=${encodeURIComponent(attachment.url)}`;
      }
    }
    // Return original URL if it's not a GCS URL (e.g., data URLs)
    return attachment.url;
  };

  return (
    <div className="flex flex-col gap-2 max-w-16">
      <div className="h-20 w-16 bg-muted rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith("image") ? (
            <img
              key={url}
              src={getProxyUrl(attachment)} // Use proxy URL for images
              alt={name ?? "An image attachment"}
              className="rounded-md size-full object-cover"
            />
          ) : isPDF ? (
            <div className="flex flex-col items-center justify-center">
              <FileIcon className="h-8 w-8 text-red-500" />
              <span className="text-xs text-zinc-500 mt-1">PDF</span>
            </div>
          ) : isExcel ? (
            <div className="flex flex-col items-center justify-center">
              <FileIcon className="h-8 w-8 text-green-500" />
              <span className="text-xs text-zinc-500 mt-1">Excel</span>
            </div>
          ) : isVideo ? (
            <div className="flex flex-col items-center justify-center">
              <svg className="h-8 w-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="text-xs text-zinc-500 mt-1">Video</span>
            </div>
          ) : isCSV ? (
            <div className="flex flex-col items-center justify-center">
              <FileIcon className="h-8 w-8 text-orange-500" />
              <span className="text-xs text-zinc-500 mt-1">CSV</span>
            </div>
          ) : isJSON ? (
            <div className="flex flex-col items-center justify-center">
              <FileIcon className="h-8 w-8 text-yellow-500" />
              <span className="text-xs text-zinc-500 mt-1">JSON</span>
            </div>
          ) : isText ? (
            <div className="flex flex-col items-center justify-center">
              <FileIcon className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-zinc-500 mt-1">Text</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <FileIcon className="h-8 w-8 text-gray-500" />
              <span className="text-xs text-zinc-500 mt-1">File</span>
            </div>
          )
        ) : (
          <div className=""></div>
        )}

        {isUploading && (
          <div className="animate-spin absolute text-zinc-500">
            <LoaderIcon />
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
}
