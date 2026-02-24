import { cn, formatBytes } from "@/utils/utils";
import {
  Archive,
  Code,
  FileIcon,
  FileText,
  Film,
  Image,
  Music,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "../button";
import { Card } from "../card";
import { Progress } from "../progress";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: string;
  className?: string;
  multiple?: boolean;
}

export const FileUpload = ({
  files,
  onFilesChange,
  maxFiles = 15,
  maxSize = 1024 * 1024 * 20, // 20MB
  accept,
  className,
  multiple = true,
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading] = useState(false);
  const [uploadProgress] = useState(0);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) {
        setIsDragging(true);
      }
    },
    [isDragging]
  );

  // FIX: Always append dropped files (if multiple), not replace
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles, true); // true = isDrop
    },
    [files, maxFiles, maxSize, multiple, onFilesChange]
  );

  // FIX: Always append selected files (if multiple), not replace
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        handleFiles(selectedFiles, false); // false = not drop
      }
    },
    [files, maxFiles, maxSize, multiple, onFilesChange]
  );

  // Accepts an extra argument to distinguish drop vs input, but logic is the same
  const handleFiles = useCallback(
    (newFiles: File[], isDrop: boolean) => {
      // Validate file types - only allow PDF, DOCX, XLSX
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      const allowedExtensions = ['.pdf', '.docx', '.xlsx'];

      const invalidFiles = newFiles.filter((file) => {
        const hasValidType = allowedTypes.includes(file.type);
        const hasValidExtension = allowedExtensions.some(ext =>
          file.name.toLowerCase().endsWith(ext)
        );
        return !hasValidType && !hasValidExtension;
      });

      if (invalidFiles.length > 0) {
        alert(
          `Invalid file type. Only PDF, DOCX, and XLSX files are allowed.\nInvalid files: ${invalidFiles.map(f => f.name).join(', ')}`
        );
        // Filter out invalid files
        newFiles = newFiles.filter((file) => {
          const hasValidType = allowedTypes.includes(file.type);
          const hasValidExtension = allowedExtensions.some(ext =>
            file.name.toLowerCase().endsWith(ext)
          );
          return hasValidType || hasValidExtension;
        });

        if (newFiles.length === 0) return;
      }

      if (!multiple) {
        console.log("isDrop", isDrop);
        // Only keep the last file
        onFilesChange(newFiles.slice(-1));
        return;
      }

      // Remove duplicates by name and size (since File object is not strictly comparable)
      const existingFiles = files || [];
      // Only add files that are not already present (by name and size)
      const filteredNewFiles = newFiles.filter(
        (newFile) =>
          !existingFiles.some(
            (existingFile) =>
              existingFile.name === newFile.name &&
              existingFile.size === newFile.size &&
              existingFile.lastModified === newFile.lastModified
          )
      );

      // Check if adding these files would exceed the max files limit
      if (existingFiles.length + filteredNewFiles.length > maxFiles) {
        alert(`You can only upload up to ${maxFiles} files at once.`);
        return;
      }

      // Filter out files that exceed the max size
      const validFiles = filteredNewFiles.filter((file) => {
        if (file.size > maxSize) {
          alert(
            `File ${file.name} is too large. Maximum size is ${formatBytes(
              maxSize
            )}.`
          );
          return false;
        }
        return true;
      });

      onFilesChange([...existingFiles, ...validFiles]);
    },
    [files, maxFiles, maxSize, multiple, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const getFileIcon = (file: File) => {
    const type = file.type;

    if (type.startsWith("image/"))
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image className="h-6 w-6 text-blue-500" />;
    if (type.startsWith("video/"))
      return <Film className="h-6 w-6 text-purple-500" />;
    if (type.startsWith("audio/"))
      return <Music className="h-6 w-6 text-pink-500" />;
    if (
      type.includes("zip") ||
      type.includes("compressed") ||
      type.includes("archive")
    )
      return <Archive className="h-6 w-6 text-yellow-500" />;
    if (
      type.includes("text/html") ||
      type.includes("javascript") ||
      type.includes("css")
    )
      return <Code className="h-6 w-6 text-green-500" />;
    if (type.includes("pdf") || type.startsWith("text/"))
      return <FileText className="h-6 w-6 text-red-500" />;

    return <FileIcon className="h-6 w-6 text-gray-500" />;
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors flex flex-col items-center justify-center cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-primary",
          isUploading && "pointer-events-none opacity-60",
          "min-h-[200px]"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() =>
          !isUploading && document.getElementById("file-upload")?.click()
        }
      >
        <input
          id="file-upload"
          type="file"
          multiple={multiple}
          accept={accept || ".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        {files.length === 0 ? (
          <>
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              <span className="font-medium">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, DOCX, XLSX only • {multiple ? `Up to ${maxFiles} files` : "Single file"}, max{" "}
              {formatBytes(maxSize)} each
            </p>
          </>
        ) : (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                {files.length} {files.length === 1 ? "file" : "files"} selected
              </p>
              {!isUploading && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilesChange([]);
                  }}
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="max-h-[200px] overflow-y-auto w-full space-y-2">
              {files.map((file, index) => (
                <Card 
                   key={`${file.name}-${index}`} 
                   className="p-2 flex items-center justify-between" 
                 > 
                   <div className="flex items-center space-x-3">
                     <span className="flex items-center justify-center min-w-[24px] h-6 bg-primary/10 text-primary rounded-full text-xs font-medium">
                       {index + 1}
                     </span>
                     {getFileIcon(file)} 
                     <div className="flex-1 min-w-0"> 
                       <p className="text-sm font-medium truncate"> 
                         {file.name} 
                       </p> 
                       <p className="text-xs text-gray-500"> 
                         {formatBytes(file.size)} 
                       </p> 
                     </div> 
                   </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove file</span>
                  </Button>
                </Card>
              ))}
            </div>

            {isUploading && (
              <div className="space-y-2 w-full mt-4">
                <Progress value={uploadProgress} className="h-2 w-full" />
                <p className="text-xs text-center text-gray-500">
                  Uploading {files.length}{" "}
                  {files.length === 1 ? "file" : "files"}...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
