/* eslint-disable react-hooks/purity */
"use client";

import Markdown from "react-markdown";
import { markdownComponents } from "./tools/markdown-components";
import { useState, memo, useCallback, useMemo, useEffect, Suspense } from "react";
// AI SDK 5.0: Attachment renamed to FileUIPart
import { FileUIPart, UIMessage } from "ai";
import { cn } from "@/utils/utils";
import remarkGfm from "remark-gfm";
import { format } from "date-fns";
import { Copy, Download, MoreHorizontal, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AudioMessage } from "./audio-message";
import { CLIENT_TIMEOUTS, msToSeconds } from "@/lib/timeout-config";
import dynamic from "next/dynamic";

// Import non-heavy components statically
import { AttachmentViewer } from "./tools/attachment-components";
import { safeJsonParse, isValidVegaSpec } from "./tools/chart-components";
import { SpinnerIcon } from "./icons";
import { preprocessMarkdownUrls } from "./tools/markdown-preprocessor";
import { useMessageFeedback } from "@/hooks/feedback/use-message-feedback";
import { useReply } from "@/hooks/use-reply-store";
import { ReplyData } from "@/types";
import { ReplyBadge } from "./reply-badge";
import { getThemeColors } from "@/utils/theme-colors";

import { ChartSkeleton } from "../ui/loading-skeletons/chart-skeleton";
import { ToolResultSkeleton } from "../ui/loading-skeletons/tool-skeleton";
import { ImageSkeleton } from "../ui/loading-skeletons/image-skeleton";
import { Skeleton } from "../ui/loading-skeletons/skeleton-base";

// ============================================
// OPTIMIZATION: Dynamic imports for heavy tool components
// These are only loaded when needed, reducing initial bundle size
// ============================================

// Dynamic imports with loading states
const VegaLiteChart = dynamic(
  () => import("./tools/chart-components").then((m) => m.VegaLiteChart),
  { loading: () => <ChartSkeleton />, ssr: false }
);

const GoogleSearchResults = dynamic(
  () => import("./tools/google-search-components").then((m) => m.GoogleSearchResults),
  { loading: () => <ToolResultSkeleton /> }
);

const WeatherResults = dynamic(
  () => import("./tools/weather-components").then((m) => m.WeatherResults),
  { loading: () => <ToolResultSkeleton /> }
);

const WikipediaResults = dynamic(
  () => import("./tools/wikipedia-components").then((m) => m.WikipediaResults),
  { loading: () => <ToolResultSkeleton /> }
);

const FlightSearchResults = dynamic(
  () => import("./tools/flight-components").then((m) => m.FlightSearchResults),
  { loading: () => <ToolResultSkeleton /> }
);

const FlightBookingConfirmation = dynamic(
  () => import("./tools/flight-components").then((m) => m.FlightBookingConfirmation),
  { loading: () => <ToolResultSkeleton /> }
);

const GeneratedImageDisplay = dynamic(
  () => import("./tools/image-components").then((m) => m.GeneratedImageDisplay),
  { loading: () => <ImageSkeleton /> }
);

const ReasoningMessagePart = dynamic(
  () => import("./tools/reasoning-components").then((m) => m.ReasoningMessagePart),
  { loading: () => <ToolResultSkeleton /> }
);


const DownloadMessageTables = dynamic(
  () => import("./tools/download-message-tables").then((m) => m.DownloadMessageTables),
  { loading: () => null }
);

interface AgentResponseViewConfig {
  showThinking?: boolean;
  minimizeSearchResults?: boolean;
  showSearchSources?: boolean;
  groundTruthStyle?: "list" | "citations" | "icons";
}

// Helper function to extract text content from parts (AI SDK 5.0)
// Also handles AI SDK 4.x content array format for backward compatibility
const getTextFromParts = (parts?: UIMessage["parts"]): string => {
  if (!parts || parts.length === 0) {
    return "";
  }

  // Extract text from text and reasoning parts
  return parts
    .filter((part: any) => part.type === "text" || part.type === "reasoning")
    .map((part: any) => part.text)
    .filter((text: any) => text !== undefined && text !== null)
    .join("\n\n");
};

// Helper function to extract text from content (handles both string and array formats)
// AI SDK 4.x used content as array: [{text: "...", type: "text"}]
// AI SDK 5.0 uses parts array
const getTextFromContent = (content: any): string => {
  if (!content) return "";

  // If content is already a string, return it
  if (typeof content === "string") {
    return content;
  }

  // If content is an array (AI SDK 4.x format), extract text from objects
  if (Array.isArray(content)) {
    return content
      .filter((item: any) => item && (item.type === "text" || item.text))
      .map((item: any) => item.text || "")
      .filter((text: string) => text)
      .join("\n\n");
  }

  // If content is an object with text property
  if (typeof content === "object" && content.text) {
    return content.text;
  }

  return "";
};

// Helper function to get proxy URL for GCS images to avoid CORS issues
const getProxyUrl = (url: string, mediaType?: string): string => {
  if (!url) return url;

  // Check if it's a GCS URL that needs proxying
  if (url.includes("storage.googleapis.com")) {
    if (mediaType?.startsWith("image/")) {
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    } else {
      return `/api/proxy-file?url=${encodeURIComponent(url)}`;
    }
  }
  // Return original URL if it's not a GCS URL (e.g., data URLs, local URLs)
  return url;
};

// Helper function to clean image URLs from content to prevent duplication
// Only cleans URLs that come from image generation tools
function cleanImageUrlsFromContent(
  content: string,
  parts?: UIMessage["parts"]
): string {
  if (!parts) return content;

  // 🔥 SPECIFIC: Only get image URLs from generate_image tool invocations (AI SDK 5.0)
  const imageUrls = parts
    .filter(
      (part: any) =>
        part.type === "tool-generate_image" && // AI SDK 5.0: typed tool name
        "output" in part &&
        part.output?.success === true && // Only successful generations
        part.output?.image_url
    )
    .map((part: any) => {
      if (part.type === "tool-generate_image" && "output" in part) {
        return part.output?.image_url;
      }
      return null;
    })
    .filter(Boolean);

  // If no image generation URLs found, return original content
  if (imageUrls.length === 0) {
    return content;
  }

  let cleanedContent = content;

  // Only clean URLs that are from image generation tools
  imageUrls.forEach((url) => {
    if (url) {
      // Remove HTML img tags with this specific image URL
      const imgTagRegex = new RegExp(
        `<img[^>]*src=["']${url.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}["'][^>]*\/?>\s*`,
        "gi"
      );
      cleanedContent = cleanedContent.replace(imgTagRegex, "");

      // Remove plain text URLs that appear as standalone lines (only generated image URLs)
      const plainUrlRegex = new RegExp(
        `^\\s*${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "gm"
      );
      cleanedContent = cleanedContent.replace(plainUrlRegex, "");

      // Remove URLs that appear after newlines (only generated image URLs)
      const urlAfterNewlineRegex = new RegExp(
        `\\n\\s*${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`,
        "g"
      );
      cleanedContent = cleanedContent.replace(urlAfterNewlineRegex, "");

      // Remove URLs that appear at the end of sentences or paragraphs (only generated image URLs)
      const urlInTextRegex = new RegExp(
        `\\s+${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`,
        "g"
      );
      cleanedContent = cleanedContent.replace(urlInTextRegex, " ");
    }
  });

  // Only remove img tags that might be duplicates of generated images
  // (This is more conservative - only removes if we have generated images)
  if (imageUrls.length > 0) {
    cleanedContent = cleanedContent.replace(/<img[^>]*\/?>\s*/gi, "");
  }

  // Clean up multiple consecutive newlines that might result from URL removal
  cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, "\n\n");

  return cleanedContent.trim();
}

// Enhanced TextMessagePart component with better content handling
export const TextMessagePart = memo(
  ({
    text,
    parts,
    token,
    agentConfig,
    isQuotaExceeded = false,
  }: Readonly<{
    text: string;
    parts?: UIMessage["parts"];
    token?: string;
    agentConfig?: AgentResponseViewConfig;
    isQuotaExceeded?: boolean;
  }>) => {
    // Clean the text content to remove duplicate image tags
    const cleanedText = useMemo(
      () => cleanImageUrlsFromContent(text, parts),
      [text, parts]
    );

    // Stabilize parts array to prevent infinite loops
    const stableParts = useMemo(() => parts || [], [parts]);

    // Memoize expensive filtering operations with stable dependencies (AI SDK 5.0)
    const chartParts = useMemo(
      () =>
        stableParts.filter(
          (part: any) =>
            part.type === "tool-render_chart" ||
            part.type === "tool-generateChart" ||
            (part.type === "tool-invocation" &&
              (part.toolInvocation?.toolName === "render_chart" ||
                part.toolInvocation?.toolName === "generateChart"))
        ),
      [stableParts]
    );

    const flightSearchParts = useMemo(
      () =>
        stableParts.filter(
          (part: any) =>
            part.type === "tool-search_flights" ||
            (part.type === "tool-invocation" &&
              part.toolInvocation?.toolName === "search_flights")
        ),
      [stableParts]
    );

    const flightBookingParts = useMemo(
      () =>
        stableParts.filter(
          (part: any) =>
            part.type === "tool-book_flight" ||
            (part.type === "tool-invocation" &&
              part.toolInvocation?.toolName === "book_flight")
        ),
      [stableParts]
    );

    // Image generation parts filter (AI SDK 5.0)
    const imageGenerationParts = useMemo(
      () =>
        stableParts.filter((part: any) => {
          // AI SDK 5.0 format
          if (
            part.type === "tool-generate_image" &&
            "output" in part &&
            part.output?.success === true &&
            part.output?.image_url
          ) {
            return true;
          }
          // Legacy tool-invocation format
          if (
            part.type === "tool-invocation" &&
            part.toolInvocation?.toolName === "generate_image" &&
            part.toolInvocation?.state === "result" &&
            part.toolInvocation?.result?.success === true &&
            part.toolInvocation?.result?.image_url
          ) {
            return true;
          }
          return false;
        }),
      [stableParts]
    );

    // Google search parts filter (AI SDK 5.0)
    const googleSearchParts = useMemo(
      () =>
        stableParts.filter(
          (part: any) =>
            part.type.startsWith("tool-google_search_api_") ||
            (part.type === "tool-invocation" &&
              part.toolInvocation?.toolName?.startsWith("google_search_api_"))
        ),
      [stableParts]
    );

    // Weather parts filter (AI SDK 5.0)
    const weatherParts = useMemo(
      () =>
        stableParts.filter(
          (part: any) =>
            part.type.startsWith("tool-get_current_weather_") ||
            (part.type === "tool-invocation" &&
              part.toolInvocation?.toolName?.startsWith(
                "get_current_weather_"
              ))
        ),
      [stableParts]
    );

    // Wikipedia parts filter (AI SDK 5.0)
    const wikipediaParts = useMemo(
      () =>
        stableParts.filter(
          (part: any) =>
            part.type.startsWith("tool-search_wikipedia_api_") ||
            (part.type === "tool-invocation" &&
              part.toolInvocation?.toolName?.startsWith(
                "search_wikipedia_api_"
              ))
        ),
      [stableParts]
    );

    // Memoize text processing with cleaned content
    const { firstPart, remainingParts } = useMemo(() => {
      const paragraphs = cleanedText
        .split("\n\n")
        .filter((p) => p.trim().length > 0);
      return {
        firstPart: paragraphs.length > 0 ? paragraphs[0] : "",
        remainingParts: paragraphs.slice(1).join("\n\n"),
      };
    }, [cleanedText]);

    // Check if we have any meaningful content to display
    const hasContentToDisplay =
      cleanedText.length > 0 ||
      chartParts.length > 0 ||
      flightSearchParts.length > 0 ||
      flightBookingParts.length > 0 ||
      imageGenerationParts.length > 0 ||
      googleSearchParts.length > 0 ||
      weatherParts.length > 0 ||
      wikipediaParts.length > 0;

    // Don't show "Finalizing answer..." if we have actual tool results or if quota is exceeded
    const shouldShowFinalizing =
      cleanedText.length === 0 && !hasContentToDisplay && !isQuotaExceeded;

    return (
      <div className="flex flex-col gap-4">
        {/* Show quota exceeded error message */}
        {isQuotaExceeded &&
          cleanedText.length === 0 &&
          !hasContentToDisplay && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-grow">
                  <div className="font-medium text-red-800 dark:text-red-200">
                    API Quota Exceeded
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                    The AI service has reached its usage limit. Please try again
                    later or contact support.
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Show "Finalizing answer..." only if no quota error */}
        {shouldShowFinalizing && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4">
                <svg
                  className="animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <span>Finalizing answer...</span>
            </div>
            <div className="space-y-2 max-w-lg">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[40%]" />
            </div>
          </div>
        )}


        {/* Render first part of the message with proper block structure */}
        {/* Always show content if we have original text, even if firstPart is empty after processing */}
        {(firstPart || text.length > 0) && (
          <div className="max-w-none text-lg sm:text-base">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {preprocessMarkdownUrls(firstPart || text)}
            </Markdown>
          </div>
        )}

        {/* All tool results as separate block elements (AI SDK 5.0) */}
        {googleSearchParts.map((part: any, index) => {
          if ("output" in part) {
            return (
              <div key={`google-search-${index}`}>
                <GoogleSearchResults
                  data={part.output}
                  minimized={agentConfig?.minimizeSearchResults}
                  showSources={agentConfig?.showSearchSources}
                />
              </div>
            );
          }
          return null;
        })}

        {weatherParts.map((part: any, index) => {
          if ("output" in part) {
            // FIX: Extract the nested data structure
            const weatherData = part.output?.data || part.output;

            return (
              <div key={`weather-${index}`}>
                <WeatherResults data={weatherData} />
              </div>
            );
          }
          return null;
        })}

        {wikipediaParts.map((part: any, index) => {
          if ("output" in part) {
            return (
              <div key={`wikipedia-${index}`}>
                <WikipediaResults data={part.output} />
              </div>
            );
          }
          return null;
        })}

        {imageGenerationParts.map((part: any, index) => {
          if (
            "output" in part &&
            part.output?.success === true &&
            part.output?.image_url
          ) {
            const result = part.output;
            const imageUrl = result.image_url;
            const prompt =
              result.prompt ||
              part.input?.prompt ||
              "Generated Image";
            const model = result.model || "AI Image Generator";

            return (
              <div key={`generated-image-${index}`}>
                <GeneratedImageDisplay
                  imageUrl={imageUrl}
                  prompt={prompt}
                  model={model}
                  timestamp={result.timestamp}
                  index={index}
                  token={token}
                />
              </div>
            );
          }
          return null;
        })}

        {flightSearchParts.map((part: any, index) => {
          if ("output" in part) {
            return (
              <div key={`flight-search-${index}`}>
                <FlightSearchResults data={part.output} />
              </div>
            );
          }
          return null;
        })}

        {flightBookingParts.map((part: any, index) => {
          if ("output" in part) {
            const bookingResult = part.output;
            return (
              <div key={`flight-booking-${index}`}>
                <FlightBookingConfirmation bookingResult={bookingResult} />
              </div>
            );
          }
          return null;
        })}

        {/* Render Vega-Lite charts using separated component (AI SDK 5.0) */}
        {chartParts.length > 0 && (
          <div className="space-y-6">
            {chartParts.map((part: any, index) => {
              // Try to get the spec from different possible locations
              let spec = null;
              let title = null;
              let description = null;

              // AI SDK 5.0: Access output and input directly on part
              // First try to get from output if available
              if ("output" in part && part.output?.vegaLiteSpec) {
                // If output.vegaLiteSpec is already an object, use it directly
                spec =
                  typeof part.output.vegaLiteSpec === "object"
                    ? part.output.vegaLiteSpec
                    : safeJsonParse(part.output.vegaLiteSpec);

                title = spec?.title;
                description = spec?.description;
              }
              // Then try to parse from json_graph in input
              else if (part.input?.json_graph) {
                spec = safeJsonParse(part.input.json_graph);
                title = part.input.title || spec?.title;
                description = part.input.description || spec?.description;
              }

              if (spec) {
                // Validate spec before rendering
                if (!isValidVegaSpec(spec)) {
                  console.error("Invalid Vega-Lite spec:", spec);
                  return (
                    <div
                      key={`chart-error-${index}`}
                      className="p-4 my-4 border rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <p className="font-medium">Unable to render chart</p>
                      <p className="text-sm mt-1">
                        The chart specification is invalid or incomplete.
                      </p>
                    </div>
                  );
                }

                const chartId = `chart-${index}-${JSON.stringify(spec).slice(
                  0,
                  10
                )}`;
                return (
                  <div
                    key={chartId}
                    className="chart-container w-full max-w-full overflow-x-auto"
                  >
                    {title && (
                      <h3 className="text-base sm:text-lg md:text-xl font-medium mb-2 px-2 sm:px-0">
                        {title}
                      </h3>
                    )}
                    {description && (
                      <div className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-3 sm:mb-4 px-2 sm:px-0">
                        {description}
                      </div>
                    )}
                    <div className="w-full">
                      <VegaLiteChart spec={spec} />
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* Render remaining part of the message with proper block structure */}
        {remainingParts && (
          <div className="max-w-none text-lg sm:text-base">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {preprocessMarkdownUrls(remainingParts)}
            </Markdown>
          </div>
        )}

        {/* Status Messages - Non-overlapping logic (AI SDK 5.0) */}

        {/* Message 1: Task completed without reasoning (simple operations) */}
        {cleanedText.length === 0 &&
          hasContentToDisplay &&
          stableParts.filter(
            (part: any) => part.type === "tool-addReasoningStep"
          ).length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-800 rounded">
              ✅ Task completed. Results displayed above.
            </div>
          )}
      </div>
    );
  }
);

TextMessagePart.displayName = "TextMessagePart";

// Enhanced MessageItem component with improved reasoning handling
export const MessageItem = memo(
  ({
    id,
    role,
    // AI SDK 5.0: content is no longer on UIMessage, kept as optional extension for backward compatibility
    content,
    parts,
    // AI SDK 5.0: createdAt is no longer on UIMessage
    createdAt,
    // AI SDK 5.0: experimental_attachments replaced with file parts in parts array
    experimental_attachments,
    messageIndex,
    chatId, // Make sure this is passed from parent
    previousMessageContent,
    isTimedOut = false,
    isTyping = false,
    isQuotaExceeded = false,
    isReasoningUIEnabled,
    replyTo,
    token,
    agentConfig,
  }: Omit<UIMessage, "content"> & {
    id?: string;
    // AI SDK 5.0: These are extension props not on UIMessage
    content?: string;
    createdAt?: Date;
    experimental_attachments?: FileUIPart[];
    messageIndex?: number;
    chatId?: string; // Add chatId prop
    previousMessageContent?: string;
    isTimedOut?: boolean;
    isTyping?: boolean;
    isQuotaExceeded?: boolean;
    replyTo?: ReplyData;
    token?: string;
    agentConfig?: AgentResponseViewConfig;
    isReasoningUIEnabled?: boolean;
  }) => {
    const isUser = role === "user";
    const senderName = isUser ? "" : "Assistant";
    const [forceFinished, setForceFinished] = useState(false);
    const { setReplyingTo } = useReply();
    const [, setShowMenu] = useState(false);
    const showThinking = agentConfig?.showThinking ?? true;
    const reasoningEnabled = isReasoningUIEnabled ?? true;

    // AI SDK 5.0: Extract text content from parts, fallback to content prop for backward compatibility
    // Handles both AI SDK 4.x (content as array) and 5.0 (parts array) formats
    const textContent = useMemo(() => {
      const partsText = getTextFromParts(parts);
      if (partsText) return partsText;

      // Use helper function to handle both string and array content formats
      return getTextFromContent(content);
    }, [parts, content]);

    // Stabilize parts array to prevent infinite loops
    const stableParts = useMemo(() => parts || [], [parts]);

    // Memoize expensive calculations with stable dependencies (AI SDK 5.0)
    const stableReasoningSteps = useMemo(
      () =>
        stableParts.filter(
          (part: any) =>
            part.type === "tool-addReasoningStep" ||
            (part.type === "tool-invocation" &&
              part.toolInvocation?.toolName === "addReasoningStep")
        ),
      [stableParts]
    );

    // Check if we have any tool results (excluding reasoning steps) - AI SDK 5.0
    const hasToolResults = useMemo(() => {
      return stableParts.some((part: any) => {
        // SDK 5.0 format
        if (
          part.type?.startsWith("tool-") &&
          part.type !== "tool-addReasoningStep" &&
          part.state === "output-available" &&
          "output" in part
        ) {
          return true;
        }
        // Legacy format
        if (
          part.type === "tool-invocation" &&
          part.toolInvocation?.toolName !== "addReasoningStep" &&
          part.toolInvocation?.state === "result"
        ) {
          return true;
        }
        return false;
      });
    }, [stableParts]);

    // Check if we have any meaningful content to display
    const hasContentToDisplay = useMemo(() => {
      // Always display user messages, even if content is empty
      if (isUser) return true;

      return textContent.length > 0 || hasToolResults;
    }, [textContent.length, hasToolResults, isUser]);

    // Enhanced isFinish logic to handle incomplete responses better
    const isFinish = useMemo(() => {
      // Force finished if manually set
      if (forceFinished) return true;

      // If we have content, reasoning is finished
      if (textContent.length > 0) return true;

      // Check if we have a final reasoning step (AI SDK 5.0)
      const hasFinalStep = stableReasoningSteps.some(
        (part: any) =>
          part.type === "tool-addReasoningStep" &&
          part.input &&
          (part.input.nextStep === "finalAnswer" ||
            part.input.nextStep === "complete")
      );

      if (hasFinalStep) return true;

      // If we have tool results but no reasoning steps, consider it finished
      if (hasToolResults && stableReasoningSteps.length === 0) return true;

      // If we have both reasoning steps AND completed tool results,
      // it's likely an incomplete response - show as finished
      if (stableReasoningSteps.length > 0 && hasToolResults) {
        return true;
      }

      // Check if message is older than detection timeout with reasoning steps but no final answer
      // This handles cases where backend stopped responding
      if (createdAt && stableReasoningSteps.length > 0) {
        const messageAge = Date.now() - createdAt.getTime();

        if (messageAge > CLIENT_TIMEOUTS.DETECTION) {
          return true; // Auto-finish old incomplete messages
        }
      }

      // If not currently typing, consider it finished
      if (!isTyping && stableReasoningSteps.length > 0) {
        return true;
      }

      return false;
    }, [
      textContent.length,
      stableReasoningSteps,
      hasToolResults,
      createdAt,
      isTimedOut,
      forceFinished,
      isTyping,
    ]);

    // Determine if we're currently reasoning (key change for better UX)
    const isReasoning = useMemo(() => {
      // Not reasoning if we already have content
      if (textContent.length > 0) return false;

      // Not reasoning if explicitly finished or timed out
      if (isFinish || isTimedOut || forceFinished) return false;

      // Not reasoning if not currently typing
      if (!isTyping) return false;

      // We're reasoning if we have reasoning steps and still typing
      return stableReasoningSteps.length > 0 && isTyping;
    }, [
      textContent.length,
      isFinish,
      stableReasoningSteps.length,
      isTyping,
      isTimedOut,
      forceFinished,
    ]);

    // 🔧 FIX: Only initialize feedback hook when typing is completely finished
    const shouldEnableFeedback = useMemo(() => {
      // Never enable for user messages
      if (isUser) return false;

      // Only enable when:
      // 1. Not currently typing/streaming
      // 2. Has a valid chatId
      // 3. Message has finished processing
      return !isTyping && !!chatId && (isFinish || isTimedOut);
    }, [isUser, isTyping, chatId, isFinish, isTimedOut]);

    // 🔧 FIX: Stable feedback options that only activate after typing stops
    const feedbackOptions = useMemo(
      () => ({
        enabled: shouldEnableFeedback,
        autoFetch: shouldEnableFeedback, // Only auto-fetch when enabled
        isMessageComplete: shouldEnableFeedback,
      }),
      [shouldEnableFeedback]
    );

    // 🔧 FIX: Conditional hook - only use feedback when typing is finished
    const feedbackHookResult = useMessageFeedback(
      shouldEnableFeedback ? chatId : undefined, // Pass undefined chatId when typing
      shouldEnableFeedback ? messageIndex : undefined, // Pass undefined messageIndex when typing
      feedbackOptions
    );

    // 🔧 FIX: Extract feedback values with fallbacks for when typing
    const {
      feedback = null,
      isLoading: feedbackLoading = false,
      error: feedbackError = null,
      handleFeedback = async () => false,
      isLiked = false,
      isDisliked = false,
    } = shouldEnableFeedback ? feedbackHookResult : {};

    // 🔧 FIX: Consolidated auto-finish logic to prevent infinite loops
    useEffect(() => {
      // Don't run if already finished, user message, or manually finished
      if (isFinish || isUser || forceFinished) return;

      // Don't run if no reasoning steps or no creation time
      if (stableReasoningSteps.length === 0 || !createdAt) return;

      const messageAge = Date.now() - createdAt.getTime();

      // If message is already old enough, finish immediately
      if (messageAge > CLIENT_TIMEOUTS.AUTO_FINISH) {
        console.log("Auto-finishing incomplete response due to age");
        setForceFinished(true);
        return;
      }

      // Set timer for remaining time
      const remainingTime = CLIENT_TIMEOUTS.AUTO_FINISH - messageAge;
      const timer = setTimeout(() => {
        console.log("Auto-finishing incomplete response due to timeout");
        setForceFinished(true);
      }, remainingTime);

      return () => clearTimeout(timer);
    }, [
      isFinish,
      isUser,
      forceFinished,
      stableReasoningSteps.length,
      createdAt,
    ]);

    // 🔧 FIX: Stabilized force stop effect
    useEffect(() => {
      const handleForceStop = () => {
        // Only set force finished if not already finished and has reasoning
        if (!isFinish && !forceFinished && stableReasoningSteps.length > 0) {
          console.log("Force stopping message due to global stop event");
          setForceFinished(true);
        }
      };

      window.addEventListener("forceStop", handleForceStop);
      return () => window.removeEventListener("forceStop", handleForceStop);
    }, [isFinish, forceFinished, stableReasoningSteps.length]);

    // Memoize formatted time
    const formattedTime = useMemo(
      () => (createdAt ? format(createdAt, "h:mm a") : ""),
      [createdAt]
    );

    const onFeedbackClick = useCallback(
      async (type: "like" | "dislike") => {
        if (!chatId || role === "user" || !shouldEnableFeedback) return;

        const success = await handleFeedback(
          type,
          role as any,
          textContent,
          previousMessageContent,
          undefined // comment - could be added later
        );

        // Optional: Add analytics or additional logging here
        if (success) {
          console.log(`Feedback ${type} submitted for message ${messageIndex}`);
        }
      },
      [
        chatId,
        role,
        handleFeedback,
        textContent,
        previousMessageContent,
        messageIndex,
        shouldEnableFeedback,
      ]
    );

    // Memoize copy handler
    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(textContent);

      toast({
        title: "Copied the messages",
        description: "The conversation of messages copied to clipboard",
      });
    }, [textContent]);

    // Manual finish button for stuck responses
    const handleForceFinish = useCallback(() => {
      setForceFinished(true);
    }, []);

    const handleReply = useCallback(() => {
      if (!id) return;

      setReplyingTo({
        messageId: id,
        content: textContent,
        role: role,
        senderName: isUser ? "You" : "Assistant",
        timestamp: createdAt,
      });
      setShowMenu(false);
    }, [id, textContent, role, isUser, createdAt, setReplyingTo]);

    const scrollToMessage = useCallback((messageId: string) => {
      const messageElement = document.querySelector(
        `[data-message-id="${messageId}"]`
      );
      if (messageElement) {
        messageElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        // Add highlight effect
        messageElement.classList.add("highlight-message");
        setTimeout(() => {
          messageElement.classList.remove("highlight-message");
        }, 2000);
      }
    }, []);

    // Show manual finish button if response seems stuck
    const shouldShowForceFinish = useMemo(() => {
      // Don't show for user messages or if already finished
      if (isUser || isFinish) return false;

      // Don't show if we have content
      if (textContent.length > 0) return false;

      // Show if we have reasoning steps and message is old enough
      if (createdAt && stableReasoningSteps.length > 0) {
        const messageAge = Date.now() - createdAt.getTime();
        return messageAge > CLIENT_TIMEOUTS.MANUAL_FINISH;
      }

      return false;
    }, [
      isFinish,
      isUser,
      textContent.length,
      createdAt,
      stableReasoningSteps.length,
    ]);

    const themeColors = getThemeColors();

    return (
      <div
        className={cn("flex flex-col mb-4", {
          "items-end": isUser,
          "items-start": !isUser,
        })}
        data-message-id={id}
      >
        <div
          className={cn(
            "flex flex-col gap-2 p-3 rounded-lg relative max-w-[85%] min-w-[35%] md:min-w-[20%] transition-all duration-700 ease-in-out group",
            {
              [`${themeColors.bgPrimaryDarker} text-white rounded-tr-none`]:
                isUser,
              "bg-gray-200 dark:bg-zinc-800 dark:text-white rounded-tl-none":
                !isUser,
              // Use theme colors for typing indication
              [`border-l-4 ${themeColors.borderPrimary
                } bg-${themeColors.primaryLight.replace(
                  "-400",
                  "-50"
                )} dark:bg-${themeColors.primaryMedium.replace("-500", "-900")}`]:
                !isUser && isTyping,
            }
          )}
          style={{
            wordBreak: "break-word",
            // Add CSS custom properties for more advanced glow effect
            ...(isReasoning &&
              !isUser && {
              boxShadow:
                "0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)",
              border: "2px solid rgba(59, 130, 246, 0.6)",
            }),
          }}
        >
          <div className="flex items-center justify-between">
            <div
              className={cn("text-sm font-medium mb-1 -mt-1", {
                "text-emerald-500": isUser,
                "text-orange-500": !isUser,
              })}
            >
              {senderName}
            </div>
            {/* hide just for a while */}
            <button
              onClick={handleReply}
              className="hidden opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              title="Reply to message"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>

          {replyTo && (
            <ReplyBadge
              replyTo={replyTo}
              onClick={() => scrollToMessage(replyTo.messageId)}
            />
          )}

          {/* Render reasoning steps using enhanced component - KEY CHANGE */}
          {reasoningEnabled && stableReasoningSteps.length > 0 &&
            (isFinish || forceFinished) &&
            showThinking && (
              <ReasoningMessagePart
                key="reasoning-step"
                parts={stableReasoningSteps}
                isReasoning={isReasoning}
                isTimedOut={isTimedOut || forceFinished}
                hasContent={hasContentToDisplay} // Pass content status
              />
            )}

          {/* Manual finish button for stuck responses */}
          {shouldShowForceFinish && (
            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                <span className="text-sm text-yellow-800 dark:text-yellow-300">
                  Response seems stuck ({">"}
                  {msToSeconds(CLIENT_TIMEOUTS.MANUAL_FINISH)}s)
                </span>
              </div>
              <button
                onClick={handleForceFinish}
                className="text-xs bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded transition-colors"
              >
                🏁 Force Finish
              </button>
            </div>
          )}

          <div className="mt-2 message-text">
            <TextMessagePart
              text={textContent}
              parts={stableParts}
              token={token}
              agentConfig={agentConfig}
              isQuotaExceeded={isQuotaExceeded}
            />
          </div>

          {/* Enhanced Status Messages - Non-overlapping logic */}

          {/* Message 2: Successful task with reasoning (complex operations like image generation) */}
          {/* {!isUser &&
            isFinish &&
            textContent.length === 0 &&
            hasContentToDisplay &&
            stableReasoningSteps.length > 0 && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✅</span>
                  <span className="hidden text-sm text-green-700 dark:text-green-300 font-medium">
                    Task completed successfully
                  </span>
                </div>
              </div>
            )} */}

          {/* AI SDK 5.0: Display file parts (images) from parts array */}
          {isUser && (() => {
            // Get image parts from the parts array
            const imageParts = stableParts.filter((p: any) => {
              if (p.type !== "file") return false;
              const mimeType = p.mediaType || p.contentType || "";
              return mimeType.startsWith("image/");
            });

            if (imageParts.length === 0) return null;

            return (
              <div className="flex flex-wrap gap-2 mt-2">
                {imageParts.map((part: any, index: number) => {
                  // Handle both url and data properties for compatibility
                  const rawUrl = part.url || (part.data ? `data:${part.mediaType || part.contentType};base64,${part.data}` : null);
                  if (!rawUrl) return null;

                  // Use proxy URL for GCS images to avoid CORS issues
                  const mediaType = part.mediaType || part.contentType || "";
                  const imageUrl = getProxyUrl(rawUrl, mediaType);

                  // Extract filename from name property or URL
                  const fileName = part.name || (part.url ? part.url.split("/").pop() : `Image ${index + 1}`);
                  const displayName = fileName.length > 20 ? fileName.substring(0, 17) + "..." : fileName;

                  return (
                    <div key={`file-part-${index}-${part.mediaType}`} className="flex flex-col items-center">
                      <img
                        src={imageUrl}
                        alt={part.name || `Uploaded image ${index + 1}`}
                        className="max-w-[200px] max-h-[200px] rounded-lg object-cover shadow-md"
                        onError={(e) => {
                          // Replace broken image with placeholder icon
                          const img = e.target as HTMLImageElement;
                          img.style.display = 'none';
                          // Show fallback icon by adding a sibling element
                          const parent = img.parentElement;
                          if (parent && !parent.querySelector('.image-fallback')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'image-fallback w-[100px] h-[100px] rounded-lg bg-white/20 flex items-center justify-center';
                            fallback.innerHTML = `<svg class="w-8 h-8 text-white/60" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg>`;
                            parent.insertBefore(fallback, img);
                          }
                        }}
                      />
                      <span className="text-xs text-white/80 mt-1 truncate max-w-[200px]" title={fileName}>
                        {displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* AI SDK 5.0: Display PDF file parts from parts array */}
          {isUser && (() => {
            // Get PDF parts from the parts array
            const pdfParts = stableParts.filter((p: any) => {
              if (p.type !== "file") return false;
              const mimeType = p.mediaType || p.contentType || "";
              return mimeType === "application/pdf";
            });

            if (pdfParts.length === 0) return null;

            const handleDownload = async (url: string, fileName: string) => {
              try {
                // Get proxy URL for GCS files
                const downloadUrl = getProxyUrl(url, "application/pdf");

                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

                toast({
                  title: "Download started",
                  description: fileName,
                });
              } catch (error) {
                console.error("Download failed:", error);
                toast({
                  title: "Download failed",
                  description: "Could not download the file. Please try again.",
                  variant: "destructive",
                });
              }
            };

            return (
              <div className="flex flex-wrap gap-2 mt-2">
                {pdfParts.map((part: any, index: number) => {
                  // Extract filename from URL or use name property
                  const fileName = part.name || (part.url ? decodeURIComponent(part.url.split("/").pop() || "") : `Document ${index + 1}.pdf`);
                  const displayName = fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName;

                  return (
                    <button
                      key={`pdf-part-${index}-${part.mediaType}`}
                      onClick={() => handleDownload(part.url, fileName)}
                      className="group flex items-center gap-3 px-3 py-2.5 bg-white/10 hover:bg-white/20
                        rounded-xl border border-white/20 hover:border-white/40
                        transition-all duration-200 cursor-pointer
                        hover:shadow-lg hover:shadow-red-500/10 hover:scale-[1.02]"
                      title={`Click to download: ${fileName}`}
                    >
                      {/* PDF Icon with background */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors">
                        <svg
                          className="w-5 h-5 text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {/* File info */}
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-white/90 truncate max-w-[140px]" title={fileName}>
                          {displayName}
                        </span>
                        <span className="text-xs text-white/50">PDF Document</span>
                      </div>
                      {/* Download icon */}
                      <Download className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors ml-1" />
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* AI SDK 5.0: Display Excel file parts from parts array */}
          {isUser && (() => {
            // Get Excel parts from the parts array (xlsx and xls)
            // Note: Excel files may have mediaType changed to "text/csv" after preprocessing for AI
            // So we also check the filename extension
            const excelParts = stableParts.filter((p: any) => {
              if (p.type !== "file") return false;
              const mimeType = p.mediaType || p.contentType || "";
              const fileName = (p.name || "").toLowerCase();
              const isExcelByMimeType = mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                mimeType === "application/vnd.ms-excel";
              const isExcelByExtension = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
              return isExcelByMimeType || isExcelByExtension;
            });

            if (excelParts.length === 0) return null;

            const handleDownload = async (url: string, fileName: string, originalUrl?: string) => {
              try {
                // For Excel files that were converted to CSV, use the original URL if available
                let downloadUrl = originalUrl || url;

                // If no original URL and current URL is a data URL (base64), we can't download
                if (!originalUrl && url.startsWith("data:")) {
                  toast({
                    title: "File converted",
                    description: "This Excel file was converted for AI processing. Original file not available for download.",
                  });
                  return;
                }

                // Get proxy URL for GCS files
                downloadUrl = getProxyUrl(downloadUrl, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

                toast({
                  title: "Download started",
                  description: fileName,
                });
              } catch (error) {
                console.error("Download failed:", error);
                toast({
                  title: "Download failed",
                  description: "Could not download the file. Please try again.",
                  variant: "destructive",
                });
              }
            };

            return (
              <div className="flex flex-wrap gap-2 mt-2">
                {excelParts.map((part: any, index: number) => {
                  // Extract filename from name property or URL
                  const fileName = part.name || (part.url ? decodeURIComponent(part.url.split("/").pop() || "") : `Spreadsheet ${index + 1}.xlsx`);
                  const displayName = fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName;
                  const isDataUrl = part.url?.startsWith("data:");
                  const hasOriginalUrl = !!part.originalUrl;

                  return (
                    <button
                      key={`excel-part-${index}-${part.mediaType}`}
                      onClick={() => handleDownload(part.url, fileName, part.originalUrl)}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 bg-white/10 hover:bg-white/20",
                        "rounded-xl border border-white/20 hover:border-white/40",
                        "transition-all duration-200 cursor-pointer",
                        "hover:shadow-lg hover:shadow-green-500/10 hover:scale-[1.02]",
                        isDataUrl && !hasOriginalUrl && "opacity-70"
                      )}
                      title={`Click to download: ${fileName}`}
                    >
                      {/* Excel Icon with background */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
                        <svg
                          className="w-5 h-5 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      {/* File info */}
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-white/90 truncate max-w-[140px]" title={fileName}>
                          {displayName}
                        </span>
                        <span className="text-xs text-white/50">Excel Spreadsheet</span>
                      </div>
                      {/* Download icon */}
                      <Download className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors ml-1" />
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* AI SDK 5.0: Display Video file parts from parts array */}
          {isUser && (() => {
            const videoParts = stableParts.filter((p: any) => {
              if (p.type !== "file") return false;
              const mimeType = p.mediaType || p.contentType || "";
              return mimeType.startsWith("video/");
            });

            if (videoParts.length === 0) return null;

            const handleDownload = async (url: string, fileName: string) => {
              try {
                const downloadUrl = getProxyUrl(url, "video/mp4");
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

                toast({ title: "Download started", description: fileName });
              } catch (error) {
                console.error("Download failed:", error);
                toast({ title: "Download failed", description: "Could not download the file.", variant: "destructive" });
              }
            };

            return (
              <div className="flex flex-wrap gap-2 mt-2">
                {videoParts.map((part: any, index: number) => {
                  const fileName = part.name || (part.url ? decodeURIComponent(part.url.split("/").pop() || "") : `Video ${index + 1}.mp4`);
                  const displayName = fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName;

                  return (
                    <button
                      key={`video-part-${index}-${part.mediaType}`}
                      onClick={() => handleDownload(part.url, fileName)}
                      className="group flex items-center gap-3 px-3 py-2.5 bg-white/10 hover:bg-white/20
                        rounded-xl border border-white/20 hover:border-white/40
                        transition-all duration-200 cursor-pointer
                        hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02]"
                      title={`Click to download: ${fileName}`}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-white/90 truncate max-w-[140px]" title={fileName}>{displayName}</span>
                        <span className="text-xs text-white/50">Video</span>
                      </div>
                      <Download className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors ml-1" />
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* AI SDK 5.0: Display Text/CSV/JSON file parts from parts array */}
          {isUser && (() => {
            const textFileParts = stableParts.filter((p: any) => {
              if (p.type !== "file") return false;
              const mimeType = p.mediaType || p.contentType || "";
              const fileName = (p.name || "").toLowerCase();
              // Check for text-based file types
              const isTextType = mimeType === "text/plain" ||
                mimeType === "text/csv" ||
                mimeType === "application/json";
              const isTextByExtension = fileName.endsWith(".txt") ||
                fileName.endsWith(".csv") ||
                fileName.endsWith(".json");
              // Exclude Excel files that were converted to CSV (they have originalUrl)
              const isConvertedExcel = p.originalUrl && (p.name || "").toLowerCase().match(/\.xlsx?$/);
              return (isTextType || isTextByExtension) && !isConvertedExcel;
            });

            if (textFileParts.length === 0) return null;

            const handleDownload = async (url: string, fileName: string, mimeType: string) => {
              try {
                // If it's a data URL, convert directly to blob
                if (url.startsWith("data:")) {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  const blobUrl = window.URL.createObjectURL(blob);

                  const link = document.createElement("a");
                  link.href = blobUrl;
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(blobUrl);

                  toast({ title: "Download started", description: fileName });
                  return;
                }

                const downloadUrl = getProxyUrl(url, mimeType);
                const response = await fetch(downloadUrl);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);

                toast({ title: "Download started", description: fileName });
              } catch (error) {
                console.error("Download failed:", error);
                toast({ title: "Download failed", description: "Could not download the file.", variant: "destructive" });
              }
            };

            const getFileInfo = (fileName: string, mimeType: string) => {
              const ext = fileName.split(".").pop()?.toLowerCase();
              if (ext === "csv" || mimeType === "text/csv") {
                return { label: "CSV File", color: "orange", bgClass: "bg-orange-500/20 group-hover:bg-orange-500/30", textClass: "text-orange-400", shadowClass: "hover:shadow-orange-500/10" };
              } else if (ext === "json" || mimeType === "application/json") {
                return { label: "JSON File", color: "yellow", bgClass: "bg-yellow-500/20 group-hover:bg-yellow-500/30", textClass: "text-yellow-400", shadowClass: "hover:shadow-yellow-500/10" };
              } else {
                return { label: "Text File", color: "blue", bgClass: "bg-blue-500/20 group-hover:bg-blue-500/30", textClass: "text-blue-400", shadowClass: "hover:shadow-blue-500/10" };
              }
            };

            return (
              <div className="flex flex-wrap gap-2 mt-2">
                {textFileParts.map((part: any, index: number) => {
                  const fileName = part.name || (part.url ? decodeURIComponent(part.url.split("/").pop() || "") : `File ${index + 1}.txt`);
                  const displayName = fileName.length > 25 ? fileName.substring(0, 22) + "..." : fileName;
                  const mimeType = part.mediaType || part.contentType || "text/plain";
                  const fileInfo = getFileInfo(fileName, mimeType);

                  return (
                    <button
                      key={`text-part-${index}-${part.mediaType}`}
                      onClick={() => handleDownload(part.url, fileName, mimeType)}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 bg-white/10 hover:bg-white/20",
                        "rounded-xl border border-white/20 hover:border-white/40",
                        "transition-all duration-200 cursor-pointer hover:scale-[1.02]",
                        `hover:shadow-lg ${fileInfo.shadowClass}`
                      )}
                      title={`Click to download: ${fileName}`}
                    >
                      <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg transition-colors", fileInfo.bgClass)}>
                        <svg className={cn("w-5 h-5", fileInfo.textClass)} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm font-medium text-white/90 truncate max-w-[140px]" title={fileName}>{displayName}</span>
                        <span className="text-xs text-white/50">{fileInfo.label}</span>
                      </div>
                      <Download className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors ml-1" />
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Display attachments using separated component (legacy) */}
          {experimental_attachments && experimental_attachments.length > 0 && (
            <AttachmentViewer
              attachments={experimental_attachments}
              isUser={isUser}
            />
          )}

          {/* Download All Tables Button - Only for assistant messages with BigQuery data */}
          {!isUser && <DownloadMessageTables parts={stableParts} isFinished={isFinish} isTyping={isTyping} />}

          {/* Enhanced footer with better styling */}
          <div className="w-full flex justify-between items-center mt-2">
            <div className="flex items-center gap-2">
              <button
                className={cn(
                  "cursor-pointer p-1 rounded transition-colors",
                  isUser
                    ? "hover:bg-white/20 text-white/80 hover:text-white"
                    : "hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                )}
                onClick={handleCopy}
                title="Copy message"
              >
                <Copy className="w-4 h-4" />
              </button>

              {/* 🔧 FIX: Feedback buttons only show when typing is finished */}
              {!isUser && !token && shouldEnableFeedback && (
                <>
                  <button
                    className={cn(
                      "cursor-pointer rounded p-1 transition-all duration-200 relative",
                      {
                        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shadow-sm":
                          isLiked,
                        "hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200":
                          !isLiked,
                        "opacity-50 cursor-not-allowed": feedbackLoading,
                      }
                    )}
                    onClick={() => onFeedbackClick("like")}
                    disabled={feedbackLoading}
                    title={
                      isLiked ? "Remove helpful feedback" : "Mark as helpful"
                    }
                  >
                    <ThumbsUp
                      className={cn("w-4 h-4", {
                        // 🔧 FIX: Only animate when not typing and feedback is being processed
                        "animate-pulse":
                          !isTyping && feedbackLoading && feedback === "like",
                      })}
                    />
                    {isLiked && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </button>
                  <button
                    className={cn(
                      "cursor-pointer rounded p-1 transition-all duration-200 relative",
                      {
                        "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 shadow-sm":
                          isDisliked,
                        "hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200":
                          !isDisliked,
                        "opacity-50 cursor-not-allowed": feedbackLoading,
                      }
                    )}
                    onClick={() => onFeedbackClick("dislike")}
                    disabled={feedbackLoading}
                    title={
                      isDisliked
                        ? "Remove not helpful feedback"
                        : "Mark as not helpful"
                    }
                  >
                    <ThumbsDown
                      className={cn("w-4 h-4", {
                        // 🔧 FIX: Only animate when not typing and feedback is being processed
                        "animate-pulse":
                          !isTyping &&
                          feedbackLoading &&
                          feedback === "dislike",
                      })}
                    />
                    {isDisliked && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                </>
              )}

              {/* Audio message button */}
              {process.env.NEXT_PUBLIC_USING_TEXT_TO_SPEECH === "true" && (
                <div className="">
                  <AudioMessage text={textContent} isUser={isUser} />
                </div>
              )}

              {/* Spinner icon when typing - only for bot messages */}
              {!isUser && isTyping && (
                <SpinnerIcon
                  className={`animate-spin ${themeColors.textPrimary}`}
                  size={16}
                />
              )}
            </div>

            {/* Right side timestamp */}
            <div
              className={cn("text-xs", {
                "text-white/70": isUser,
                "text-gray-500 dark:text-gray-400": !isUser,
              })}
            >
              {/* 🔧 FIX: Only show feedback error when not typing */}
              {!isTyping && feedbackError && (
                <span
                  className="text-red-500 dark:text-red-400"
                  title={feedbackError}
                >
                  ⚠️
                </span>
              )}
              {formattedTime}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MessageItem.displayName = "MessageItem";
