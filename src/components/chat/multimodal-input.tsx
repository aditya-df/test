"use client";

// AI SDK 5.0: Attachment renamed to FileUIPart, ChatRequestOptions changes
import type { FileUIPart, UIMessage } from "ai";

// AI SDK 5.0: Extended FileUIPart type for backward compatibility
type ExtendedFileUIPart = FileUIPart & {
  contentType?: string;
  name?: string;
};

// AI SDK 5.0: ChatRequestOptions and CreateUIMessage types
type ChatRequestOptions = {
  body?: Record<string, unknown>;
};
type CreateUIMessage = Omit<UIMessage, "id">;
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  Dispatch,
  SetStateAction,
  ChangeEvent,
  memo,
  useMemo,
} from "react";

import { ArrowUpIcon, ChevronDownIcon, PaperclipIcon, StopIcon } from "./icons";
import { modelID, models } from "@/lib/models";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { toast } from "@/hooks/use-toast";
import { PreviewAttachment } from "./tools/preview-attachment";
import useWindowSize from "./use-window-size";
import { cn } from "@/utils/utils";
import {
  Brain,
  // Brain, 
  Video,
  X
} from "lucide-react";
import { useRouter } from "nextjs-toploader/app";
import { useChatMode } from "@/hooks/use-chat-mode";
import { useReply } from "@/hooks/use-reply-store";
import { ReplyPreview } from "./reply-preview";

interface MultimodalInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  stop: () => void;
  // AI SDK 5.0: Use extended type for backward compatibility
  attachments: Array<ExtendedFileUIPart>;
  setAttachments: Dispatch<SetStateAction<Array<ExtendedFileUIPart>>>;
  messages: Array<UIMessage>;
  append: (
    message: UIMessage | CreateUIMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  handleSubmit: (event?: React.FormEvent) => Promise<void>;
  isGeneratingResponse: boolean;
  selectedModelId: string;
  isReasoningEnabled: boolean;
  setSelectedModelId: (modelId: modelID) => void;
  setIsReasoningEnabled: (enabled: boolean) => void;
  activeChatId?: string;
  agentId?: string;
  selectedAgentNameProps?: string;
  hideLiveChat?: boolean;
  hideAttachment?: boolean;
  hideModelSelection?: boolean;
  selectedAgentInfo?: {
    id: string;
    name: string;
  };
  forceNotLoading?: boolean;
}

const ALLOWED_FILE_TYPES = {
  // Excel files
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],

  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  'image/svg+xml': ['.svg'],

  // Videos
  'video/mp4': ['.mp4'],

  // PDF
  'application/pdf': ['.pdf'],

  // Text files (commonly supported)
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
};

const ACCEPT_STRING = Object.entries(ALLOWED_FILE_TYPES)
  .map(([mimeType, extensions]) => `${mimeType},${extensions.join(',')}`)
  .join(',');

// Helper function to check if file type is allowed
const isFileTypeAllowed = (file: File): boolean => {
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

  // Check by MIME type first
  if (ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
    return true;
  }

  // Check by file extension as fallback
  for (const [, extensions] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (extensions.includes(fileExtension)) {
      return true;
    }
  }

  return false;
};

// Helper function to get file type category for user-friendly error messages
// const getFileTypeCategory = (file: File): string => {
//   if (file.type.startsWith('image/')) return 'image';
//   if (file.type === 'application/pdf') return 'PDF';
//   if (file.type.includes('spreadsheet') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) return 'Excel';
//   if (file.type === 'text/csv') return 'CSV';
//   if (file.type === 'text/plain') return 'text';
//   if (file.type === 'application/json') return 'JSON';
//   return 'file';
// };

// FIXED: Memoized component to prevent unnecessary re-renders
export const MultimodalInput = memo(function MultimodalInput({
  input,
  setInput,
  isLoading,
  stop,
  attachments,
  setAttachments,
  append,
  selectedModelId,
  isReasoningEnabled,
  setSelectedModelId,
  setIsReasoningEnabled,
  activeChatId,
  agentId,
  selectedAgentNameProps,
  selectedAgentInfo,
  hideLiveChat = false,
  hideAttachment = false,
  hideModelSelection = false,
  forceNotLoading = false,
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const router = useRouter();
  const { isLiveChat, setIsLiveChat } = useChatMode();
  const [isDragOver, setIsDragOver] = useState(false);
  const [, setDragCounter] = useState(0);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { replyingTo, clearReply, hasReply } = useReply();
  const effectiveIsLoading = forceNotLoading ? false : isLoading;

  // Computed state variables
  const isMobile = useMemo(() => width ? width < 768 : false, [width]);

  const isReasoningDisabled = useMemo(() =>
    selectedModelId !== "gemini-2.5-pro" &&
    selectedModelId !== "gemini-2.5-flash" &&
    selectedModelId !== "gemini-2.5-flash-lite"
    , [selectedModelId]);

  const isUploading = useMemo(() => uploadQueue.length > 0, [uploadQueue.length]);

  const isSubmitDisabled = useMemo(() => {
    const hasContent = input.trim().length > 0 || attachments.length > 0;
    return !hasContent || isUploading || effectiveIsLoading;
  }, [input, attachments.length, isUploading, effectiveIsLoading]);

  // FIXED: Use a ref to track input changes to avoid re-renders
  const inputRef = useRef(input);
  inputRef.current = input;

  // FIXED: Memoize adjustment height to prevent re-creation
  const adjustHeight = useCallback(() => {

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";

      // Set a minimum height for mobile
      const minHeight = isMobile ? 60 : 24;

      // Calculate new height but cap it on mobile to prevent taking too much space
      const newHeight = Math.min(
        textareaRef.current.scrollHeight,
        isMobile ? 120 : 200 // Max height based on device
      );

      textareaRef.current.style.height = `${Math.max(newHeight, minHeight)}px`;
    }
  }, [isMobile]);

  // FIXED: Memoize submit form to prevent re-renders
  const submitForm = useCallback(() => {
    // If there's no input but there are attachments, we should still send the message
    if (input.trim() === "" && attachments.length === 0) {
      return;
    }

    // AI SDK 5.0: Build parts array including file attachments
    const parts: any[] = [];

    // Add text part if there's input
    if (input.trim()) {
      parts.push({
        type: "text",
        text: input,
      });
    }

    // AI SDK 5.0: Add file attachments directly to parts array
    attachments.forEach((attachment) => {
      parts.push({
        type: "file",
        url: attachment.url,
        mediaType: attachment.mediaType || attachment.contentType || "application/octet-stream",
        name: attachment.name, // Preserve original filename
      });
    });

    const messageData: any = {
      role: "user",
      parts,
      createdAt: new Date(),
      // AI SDK 5.0: Keep experimental_attachments for backward compatibility with server preprocessing
      experimental_attachments: attachments.length > 0 ? attachments : undefined,
    };

    // ADD THESE LINES:
    if (replyingTo) {
      messageData.replyTo = replyingTo;
    }

    // AI SDK 5.0: data removed, use body instead
    append(messageData, {
      body: {
        activeChatId: activeChatId,
        selectedModelId,
        isReasoningEnabled,
        agentId: agentId || selectedAgentInfo?.id || "", // Prefer URL agentId as source of truth
        agentName: selectedAgentNameProps || selectedAgentInfo?.name || "KnowgenAI",
        replyTo: replyingTo,
      },
    });

    // Clear input and attachments after sending
    setInput("");
    setAttachments([]);
    clearReply();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    attachments,
    replyingTo,
    append,
    activeChatId,
    selectedModelId,
    isReasoningEnabled,
    setInput,
    setAttachments,
    clearReply,
    width,
    selectedAgentInfo,
    agentId,
    selectedAgentNameProps,
  ]);

  // Add this function to clear the file input
  const clearFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Update the removeAttachment function
  // AI SDK 5.0: Use ExtendedFileUIPart for name access
  const removeAttachment = useCallback((attachmentToRemove: ExtendedFileUIPart) => {
    setAttachments(currentAttachments =>
      currentAttachments.filter(attachment => attachment.url !== attachmentToRemove.url)
    );

    // Clear the file input to allow re-uploading the same file
    clearFileInput();

    toast({
      title: "File Removed",
      description: `${attachmentToRemove.name || "File"} has been removed.`,
    });
  }, [setAttachments, clearFileInput]);

  // Update the clearAllAttachments function
  const clearAllAttachments = useCallback(() => {
    if (attachments.length === 0) return;

    setAttachments([]);

    // Clear the file input to allow re-uploading files
    clearFileInput();

    toast({
      title: "All Files Removed",
      description: `${attachments.length} file(s) have been removed.`,
    });
  }, [attachments.length, setAttachments, clearFileInput]);

  // FIXED: Memoize upload file function
  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/files/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        // AI SDK 5.0: FileUIPart requires type and mediaType
        return {
          type: "file" as const,
          url,
          mediaType: contentType,
          // Keep backward compatible properties - use original filename, not server pathname
          name: file.name,
          contentType: contentType,
        };
      } else {
        const { error } = await response.json();
        toast.error(error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  // Update the handleFileChange function to clear input after processing
  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      if (files.length === 0) return;

      // Validate file types
      const { validFiles, invalidFiles } = files.reduce(
        (acc, file) => {
          if (isFileTypeAllowed(file)) {
            acc.validFiles.push(file);
          } else {
            acc.invalidFiles.push(file);
          }
          return acc;
        },
        { validFiles: [] as File[], invalidFiles: [] as File[] }
      );

      // Show error for invalid files
      if (invalidFiles.length > 0) {
        const invalidFileNames = invalidFiles.map(f => f.name).join(', ');
        const supportedTypes = Object.values(ALLOWED_FILE_TYPES).flat().join(', ');

        toast({
          title: "Unsupported File Type",
          description: `The following files are not supported: ${invalidFileNames}. Supported types: ${supportedTypes}`,
          variant: "destructive",
        });
      }

      // Process valid files only
      if (validFiles.length === 0) {
        clearFileInput();
        return;
      }

      setUploadQueue(validFiles.map((file) => file.name));

      // ✅ ADD THIS: Complete upload process
      try {
        const uploadPromises = validFiles.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);

        if (successfullyUploadedAttachments.length > 0) {
          toast({
            title: "Files Uploaded Successfully",
            description: `${successfullyUploadedAttachments.length} file(s) uploaded successfully.`,
          });
        }
      } catch (error) {
        console.error("Error uploading files!", error);
        toast({
          title: "Upload Failed",
          description: "Some files failed to upload. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploadQueue([]);
        clearFileInput();
      }
    },
    [setAttachments, uploadFile, clearFileInput]
  );

  // FIXED: Memoize the onChange handler to prevent re-renders
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  // FIXED: Memoize the keydown handler
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Escape" && hasReply) {
        event.preventDefault();
        clearReply();
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        if (isSubmitDisabled) {
          return;
        }

        submitForm();
      }
    },
    [isSubmitDisabled, hasReply, clearReply, submitForm]
  );


  // FIXED: Disabled reasoning toggle - always returns false
  const handleReasoningToggle = useCallback(() => {
    setIsReasoningEnabled(!isReasoningEnabled);
  }, [isReasoningEnabled, setIsReasoningEnabled]);


  const handleLiveChatToggle = useCallback(() => {
    setIsLiveChat(!isLiveChat);

    // Create URL params object to preserve query parameters
    const params = new URLSearchParams();

    // Add agent ID if available
    if (agentId) {
      params.append('agentId', agentId);
    }

    // Add agent name if available
    if (selectedAgentNameProps) {
      params.append('selectedAgentNameProps', selectedAgentNameProps);
    }

    // Build the URL with query parameters
    const queryString = params.toString();
    const destination = !isLiveChat
      ? `/livechat${queryString ? `?${queryString}` : ''}`
      : `/chatbot${queryString ? `?${queryString}` : ''}`;

    router.push(destination);
  }, [isLiveChat, setIsLiveChat, agentId, selectedAgentNameProps, router]);


  // FIXED: Memoize model change handler
  const handleModelChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const newModelId = event.target.value as modelID;
      setSelectedModelId(newModelId);
    } catch (error) {
      console.error("Error in model selection:", error);
    }
  }, [setSelectedModelId]);

  // FIXED: Memoize file input click handler
  const handleFileInputClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    fileInputRef.current?.click();
  }, []);

  // FIXED: Memoize stop handler
  const handleStop = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    // console.log("Stop button clicked - forcing stop");
    // console.log("🔍 STOP BUTTON CLICKED:", {
    //   isLoading,
    //   forceNotLoading,
    //   effectiveIsLoading,
    //   timestamp: Date.now()
    // });

    // Call the stop function immediately
    stop();

    // Additional cleanup if needed - you might want to emit a custom event
    // to notify parent components to reset their states
    const stopEvent = new CustomEvent('forceStop', {
      detail: { timestamp: Date.now() }
    });
    window.dispatchEvent(stopEvent);

  }, [stop]);

  // FIXED: Memoize submit handler
  const handleFormSubmit = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    submitForm();
  }, [submitForm]);

  // Update the handlePaste function to clear input after processing
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];

      // Check for image files in clipboard
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file && isFileTypeAllowed(file)) {
            imageFiles.push(file);
          } else if (file) {
            toast({
              title: "Unsupported Image Format",
              description: `${file.type} is not supported...`,
              variant: "destructive",
            });
          }
        }
      }

      // If we found image files, upload them
      if (imageFiles.length > 0) {
        event.preventDefault(); // Prevent default paste behavior

        // Add to upload queue
        setUploadQueue(prev => [...prev, ...imageFiles.map(file => file.name)]);

        try {
          const uploadPromises = imageFiles.map((file) => uploadFile(file));
          const uploadedAttachments = await Promise.all(uploadPromises);
          const successfullyUploadedAttachments = uploadedAttachments.filter(
            (attachment) => attachment !== undefined
          );

          setAttachments((currentAttachments) => [
            ...currentAttachments,
            ...successfullyUploadedAttachments,
          ]);

          // Show success toast
          toast({
            title: "Image Pasted Successfully",
            description: `${imageFiles.length} image(s) uploaded from clipboard.`,
          });
        } catch (error) {
          console.error("Error uploading pasted images:", error);
          toast({
            title: "Upload Failed",
            description: "Failed to upload pasted image(s). Please try again.",
            variant: "destructive",
          });
        } finally {
          // Remove from upload queue and clear file input
          setUploadQueue(prev =>
            prev.filter(name => !imageFiles.some(file => file.name === name))
          );
          clearFileInput();
        }
      }
    },
    [setAttachments, uploadFile, setUploadQueue, clearFileInput]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only trigger on actual file drag, not nested element transitions
    if (e.dataTransfer?.types?.includes('Files')) {
      setDragCounter(prev => {
        const newCount = prev + 1;
        if (newCount === 1) { // Only set on first enter
          setIsDragOver(true);
        }
        return newCount;
      });
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if we're actually leaving the drop zone, not just moving to a child
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (!rect) return;

    const { clientX, clientY } = e;
    const isOutside =
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom;

    if (isOutside) {
      setDragCounter(0);
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';

    // Keep the drag state active
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  // Update the handleDrop function to clear input after processing
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsDragOver(false);
    setDragCounter(0);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // ✅ ADD VALIDATION
    const { validFiles, invalidFiles } = files.reduce(
      (acc, file) => {
        if (isFileTypeAllowed(file)) {
          acc.validFiles.push(file);
        } else {
          acc.invalidFiles.push(file);
        }
        return acc;
      },
      { validFiles: [] as File[], invalidFiles: [] as File[] }
    );

    // Show error for invalid files
    if (invalidFiles.length > 0) {
      const invalidFileNames = invalidFiles.map(f => f.name).join(', ');
      const supportedTypes = Object.values(ALLOWED_FILE_TYPES).flat().join(', ');

      toast({
        title: "Unsupported File Type",
        description: `The following files are not supported: ${invalidFileNames}. Supported types: ${supportedTypes}`,
        variant: "destructive",
      });
    }

    // Process valid files only
    if (validFiles.length === 0) {
      clearFileInput();
      return;
    }

    setUploadQueue(validFiles.map((file) => file.name));

    try {
      const uploadPromises = validFiles.map((file) => uploadFile(file));
      const uploadedAttachments = await Promise.all(uploadPromises);
      const successfullyUploadedAttachments = uploadedAttachments.filter(
        (attachment) => attachment !== undefined
      );

      setAttachments((currentAttachments) => [
        ...currentAttachments,
        ...successfullyUploadedAttachments,
      ]);

      if (successfullyUploadedAttachments.length > 0) {
        toast({
          title: "Files Uploaded Successfully",
          description: `${successfullyUploadedAttachments.length} file(s) uploaded successfully.`,
        });
      }
    } catch (error) {
      console.error("Error uploading dropped files:", error);
      toast({
        title: "Upload Failed",
        description: "Some files failed to upload. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadQueue([]);
      clearFileInput();
    }
  }, [setAttachments, uploadFile, setUploadQueue, clearFileInput]);

  // Adjust height only when input changes
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, [input, adjustHeight]);

  useEffect(() => {
    // Set LiveChat to false on initial load
    setIsLiveChat(false);
  }, [setIsLiveChat]);

  // Set reasoning to false on component mount
  // useEffect(() => {
  //   if (isReasoningEnabled) {
  //     setIsReasoningEnabled(false);
  //   }
  // }, [isReasoningEnabled, setIsReasoningEnabled]);

  useEffect(() => {
    const handlePasteEvent = (event: ClipboardEvent) => {
      // Only handle paste if the textarea is focused or if we're in the chat area
      const activeElement = document.activeElement;
      const isTextareaFocused = activeElement === textareaRef.current;
      const isInChatArea = textareaRef.current?.contains(activeElement as Node);

      if (isTextareaFocused || isInChatArea) {
        handlePaste(event);
      }
    };

    // Add event listener to document
    document.addEventListener('paste', handlePasteEvent);

    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [handlePaste]);

  useEffect(() => {
    const preventDefaults = (e: DragEvent) => {
      // Only prevent if it's not our drop zone
      if (!dropZoneRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        e.dataTransfer!.effectAllowed = "none";
        e.dataTransfer!.dropEffect = "none";
      }
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      // Reset our state if drop happens outside our zone
      if (!dropZoneRef.current?.contains(e.target as Node)) {
        setIsDragOver(false);
        setDragCounter(0);
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver, false);
    document.addEventListener('drop', handleGlobalDrop, false);
    document.addEventListener('dragenter', preventDefaults, false);
    document.addEventListener('dragleave', preventDefaults, false);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver, false);
      document.removeEventListener('drop', handleGlobalDrop, false);
      document.removeEventListener('dragenter', preventDefaults, false);
      document.removeEventListener('dragleave', preventDefaults, false);
    };
  }, []);


  useEffect(() => {
    const isModelIncompatible =
      selectedModelId !== "gemini-2.5-pro" &&
      selectedModelId !== "gemini-2.5-flash" &&
      selectedModelId !== "gemini-2.5-flash-lite";

    // Auto-disable reasoning if current model doesn't support it and reasoning is currently enabled
    if (isModelIncompatible && isReasoningEnabled) {
      setIsReasoningEnabled(false);
    }
  }, [selectedModelId, isReasoningEnabled, setIsReasoningEnabled]);


  return (

    <div className="relative w-full flex flex-col gap-4">

      <ReplyPreview />
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative",
          isDragOver && "ring-2 ring-blue-400 ring-offset-2 rounded-lg"
        )}
      >
        {isDragOver && (
          <div
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center"
            style={{ pointerEvents: 'none' }} // Allow events to pass through
          >
            <div
              className="bg-white dark:bg-zinc-800 h-full w-full shadow-xl border-2 border-dashed border-blue-400 flex items-center justify-center"
              style={{ pointerEvents: 'auto' }} // Re-enable for the modal content
            >
              <div className="text-center">
                <div className="text-2xl mb-4">📁</div>
                <h3 className="text-lg font-semibold mb-2">Drop your files here</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Supported: Excel (.xlsx, .xls), Images, PDF, Text files</p>
              </div>
            </div>
          </div>
        )}
        <input
          type="file"
          className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
          ref={fileInputRef}
          multiple
          accept={ACCEPT_STRING}
          onChange={handleFileChange}
          tabIndex={-1}
        />

        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div className="flex flex-col gap-2">
            {/* NEW: Header with file count and clear all button */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {attachments.length > 0 && `${attachments.length} file(s) attached`}
                {uploadQueue.length > 0 && ` • ${uploadQueue.length} uploading...`}
              </span>
              {attachments.length > 0 && (
                <Button onClick={clearAllAttachments} variant="ghost" size="sm">
                  <X size={12} className="mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* NEW: Individual X buttons on each file */}
            <div className="flex flex-row gap-2 overflow-x-scroll pt-2">
              {attachments.map((attachment) => (
                <div key={attachment.url} className="relative group">
                  <PreviewAttachment attachment={attachment} />
                  {/* NEW: Individual remove button */}
                  <Button
                    onClick={() => removeAttachment(attachment)}
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <X size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="relative w-full">
          <Textarea
            ref={textareaRef}
            disabled={isUploading}
            placeholder={
              isUploading
                ? "Please wait for files to upload..."
                : replyingTo
                  ? `Replying to ${replyingTo.role === "user" ? "yourself" : "Assistant"}...`
                  : isDragOver
                    ? "Drop files here or type a message..."
                    : "Send a message..."
            }
            value={input}
            onChange={handleInputChange}
            className={cn(
              "overflow-y-auto resize-none rounded-lg text-base bg-muted border-none",
              "pb-14", // Add padding at bottom to ensure text isn't hidden behind buttons
              isMobile
                ? "min-h-[120px] max-h-[150px] text-base py-3 px-3" // Added explicit padding and text size for mobile
                : "min-h-[60px] max-h-[200px]"
            )}
            onKeyDown={handleKeyDown}
          />


          {/* Controls container - moved to bottom with fixed positioning */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0  flex justify-between items-center",
              "p-1 sm:p-2 mx-0.5 sm:mx-1 bg-muted bg-opacity-80 backdrop-blur-sm rounded-b-lg" // Semi-transparent background
            )}
          >
            {/* Left side controls */}
            <div className="flex items-center">
              {/* Reasoning Toggle - With Sliding Animation */}
              <button
                type="button"
                disabled={isReasoningDisabled}
                className={cn(
                  "relative flex items-center rounded-full transition-all duration-300 font-medium",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isMobile ? "gap-1 px-1 py-1 text-xs" : "gap-3 px-3 py-2 text-sm"
                )}
                onClick={handleReasoningToggle}
              >
                {/* Toggle Track */}
                <div
                  className={cn(
                    "relative w-10 h-5 rounded-full transition-colors duration-300",
                    isReasoningEnabled
                      ? "bg-indigo-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  )}
                >
                  {/* Toggle Knob with Sliding Animation */}
                  <div
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center",
                      isReasoningEnabled ? "left-[calc(100%-18px)]" : "left-0.5"
                    )}
                  >
                    {isReasoningEnabled && (
                      <div className="text-indigo-500 animate-fadeIn">
                        <Brain size={10} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "transition-colors duration-300",
                    isMobile ? "text-xs hidden" : "text-sm",
                    isReasoningEnabled
                      ? "text-indigo-800 dark:text-indigo-200"
                      : "text-zinc-700 dark:text-zinc-300"
                  )}
                >
                  Reasoning
                </span>
              </button>

              {!hideLiveChat && (
                <>

                  {/* Add spacing between the toggles */}
                  <div className={isMobile ? "mx-1" : "mx-4"}></div>

                  {/* Live Chat Toggle - With similar styling to Reasoning toggle */}
                  {/* Live Chat Toggle - With similar styling to Reasoning toggle */}
                  <button
                    type="button"
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2 rounded-full transition-all duration-300 text-sm font-medium"
                    )}
                    onClick={handleLiveChatToggle}
                  >
                    {/* Toggle Track */}
                    <div
                      className={cn(
                        "relative w-10 h-5 rounded-full transition-colors duration-300",
                        isLiveChat ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-600"
                      )}
                    >
                      {/* Toggle Knob with Sliding Animation */}
                      <div
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center",
                          isLiveChat ? "left-[calc(100%-18px)]" : "left-0.5"
                        )}
                      >
                        {isLiveChat && (
                          <div className="text-blue-500 animate-fadeIn">
                            <Video size={10} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Label - Hidden on mobile */}
                    {!isMobile && (
                      <span
                        className={cn(
                          "transition-colors duration-300",
                          "text-sm",
                          isLiveChat
                            ? "text-blue-800 dark:text-blue-200"
                            : "text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        Live Chat
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {!hideModelSelection && (
                <>
                  {/* Model Selector */}
                  <div className={`relative w-fit text-sm p-1.5 rounded-lg flex flex-row items-center gap-0.5 dark:hover:bg-zinc-700 hover:bg-zinc-200 cursor-pointer`}>
                    <div className="flex justify-center items-center text-zinc-500 dark:text-zinc-400 px-1">
                      {!isMobile && (
                        <span className="pr-1 hidden lg:block">
                          {models[selectedModelId as keyof typeof models]}
                        </span>
                      )}
                      <ChevronDownIcon />
                    </div>

                    <select
                      className="absolute opacity-0 w-full p-1 left-0 cursor-pointer"
                      value={selectedModelId}
                      onChange={handleModelChange}
                    >
                      {Object.entries(models).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {!hideAttachment && (
                <>
                  {/* Attachment button - Now always rendered here */}
                  <Button
                    className="rounded-full p-1.5 h-fit dark:border-zinc-700 transition-all duration-300 hover:bg-zinc-100 dark:hover:bg-zinc-700" // Combined and refined classes
                    onClick={handleFileInputClick}
                    variant="outline"
                    disabled={effectiveIsLoading}
                  >
                    <PaperclipIcon size={14} />
                  </Button>
                </>
              )}

              {/* Submit/Stop button */}

              {effectiveIsLoading ? (
                <Button
                  className={cn(
                    "rounded-full px-4 py-2 h-auto", // Increased padding
                    "bg-blue-600 hover:bg-blue-700", // Light mode colors
                    "dark:bg-indigo-600 dark:hover:bg-indigo-700", // Different color for dark mode
                    "text-white flex items-center gap-2 text-sm sm:text-base" // Added gap for icon + text
                  )}
                  onClick={handleStop}
                  type="button"
                >
                  <StopIcon size={16} />
                  <span>Stop</span>
                </Button>
              ) : (
                <Button
                  className={cn(
                    "rounded-full px-4 py-2 h-auto", // Increased padding
                    "bg-blue-600 hover:bg-blue-700", // Light mode colors
                    "dark:bg-indigo-600 dark:hover:bg-indigo-700", // Different color for dark mode
                    "text-white",
                    "disabled:bg-gray-300 dark:disabled:bg-gray-300",
                    "disabled:text-gray-500 dark:disabled:text-gray-400",
                    "flex items-center gap-2 text-sm sm:text-base", // Added gap for icon + text
                    isMobile ? "px-2 py-1.5 gap-1 text-xs" : "px-4 py-2 gap-2 text-sm sm:text-base"
                  )}
                  onClick={handleFormSubmit}
                  disabled={isSubmitDisabled}
                  type="button"
                >
                  <ArrowUpIcon size={isMobile ? 14 : 16} />
                  <span className="hidden md:block">Send</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

