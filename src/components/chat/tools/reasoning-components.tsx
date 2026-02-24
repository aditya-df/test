/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { memo, useState, useRef, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion, Variants, easeInOut } from "framer-motion";
import { ChevronDown, ChevronUp, Brain, Lightbulb } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "./markdown-components";
import { cn } from "@/utils/utils";
import { UIMessage } from "ai";
import { SpinnerIcon } from "../icons";

interface ReasoningMessagePartProps {
  parts: UIMessage["parts"];
  isReasoning?: boolean;
  isTimedOut?: boolean;
  hasContent?: boolean; // New prop to track if main content is available
}

// Enhanced ReasoningMessagePart component with better UX
export const ReasoningMessagePart = memo(
  ({
    parts,
    isReasoning = false,
    isTimedOut = false,
    hasContent = false,
  }: Readonly<ReasoningMessagePartProps>) => {
    const [reasoningLimit] = useState(5); // Increased default limit
    const [showAllReasoning, setShowAllReasoning] = useState(false);
    const initialRenderRef = useRef(true);

    // Key change: Start expanded when reasoning begins, collapse when content is ready
    const [isExpanded, setIsExpanded] = useState(false);
    const [manuallyToggled, setManuallyToggled] = useState(false);

    // 🔧 FIX: Stabilize parts array to prevent infinite loops
    const stableParts = useMemo(() => {
      if (!parts) return [];
      return [...parts];
    }, [parts]);

    // 🔧 FIX: Use stable parts for local state
    const [localParts, setLocalParts] = useState(() => [...stableParts]);

    // Memoize expensive calculations with stable dependencies
    const totalReasoningSteps = useMemo(() => localParts.length, [localParts]);

    const displayedSteps = useMemo(() =>
      showAllReasoning ? localParts : localParts.slice(0, reasoningLimit)
      , [showAllReasoning, localParts, reasoningLimit]);

    // Enhanced animation variants
    const variants: Variants = useMemo(() => ({
      collapsed: {
        height: 0,
        opacity: 0,
        marginTop: 0,
        marginBottom: 0,
        transition: {
          duration: 0.3,
          ease: easeInOut,
        }
      },
      expanded: {
        height: "auto",
        opacity: 1,
        marginTop: "0.75rem",
        marginBottom: "0.5rem",
        transition: {
          duration: 0.3,
          ease: easeInOut,
        }
      },
    }), []);

    // 🔧 FIX: Update local parts when stable parts change (not on every render)
    useEffect(() => {
      if (!isTimedOut && stableParts.length !== localParts.length) {
        setLocalParts([...stableParts]);
      }
    }, [stableParts.length, isTimedOut]); // Only depend on length, not the array itself

    // 🔧 FIX: Simplified main logic for controlling expansion/collapse
    useEffect(() => {
      // Don't auto-change if user manually toggled
      if (manuallyToggled) return;

      // Create a stable reference for the timeout
      let timeoutId: NodeJS.Timeout;

      if (isTimedOut) {
        console.log("Timeout detected - collapsing reasoning");
        setIsExpanded(false);
        return;
      }

      // Key logic: Expand when reasoning starts, collapse when content is ready
      if (isReasoning && !hasContent) {
        // Actively reasoning and no content yet - show expanded
        setIsExpanded(true);
      } else if (!isReasoning && hasContent) {
        // Reasoning finished and content is available - collapse after delay
        timeoutId = setTimeout(() => {
          setIsExpanded(false);
        }, 1000); // Small delay to let user see the completion
      } else if (!isReasoning && !hasContent && localParts.length > 0) {
        // Reasoning finished but no content (incomplete response) - keep expanded briefly then collapse
        timeoutId = setTimeout(() => {
          setIsExpanded(false);
        }, 2000);
      }

      if (initialRenderRef.current) {
        initialRenderRef.current = false;
      }

      // Cleanup timeout
      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, [isReasoning, hasContent, isTimedOut, manuallyToggled, localParts.length]);

    // 🔧 FIX: Reset manual toggle flag with stable timeout
    useEffect(() => {
      if (!manuallyToggled) return;

      const timer = setTimeout(() => {
        setManuallyToggled(false);
      }, 10000); // Reset after 10 seconds

      return () => clearTimeout(timer);
    }, [manuallyToggled]);

    const handleToggleExpanded = useCallback(() => {
      setIsExpanded(!isExpanded);
      setManuallyToggled(true);
    }, [isExpanded]);

    const handleShowAllReasoning = useCallback(() => {
      setShowAllReasoning(true);
    }, []);

    // Don't render if no reasoning steps
    if (localParts.length === 0) {
      return null;
    }

    // Determine the current state for better UI feedback
    const getReasoningState = useCallback(() => {
      if (isReasoning && !isTimedOut) {
        return {
          icon: <SpinnerIcon className="animate-spin" />,
          text: "Thinking...",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
          borderColor: "border-blue-200 dark:border-blue-800",
          textColor: "text-blue-700 dark:text-blue-300"
        };
      } else if (isTimedOut) {
        return {
          icon: <Brain className="h-4 w-4" />,
          text: "Thinking interrupted",
          bgColor: "bg-orange-50 dark:bg-orange-950/30",
          borderColor: "border-orange-200 dark:border-orange-800",
          textColor: "text-orange-700 dark:text-orange-300"
        };
      } else {
        return {
          icon: <Lightbulb className="h-4 w-4" />,
          text: "Thinking complete",
          bgColor: "bg-green-50 dark:bg-green-950/30",
          borderColor: "border-green-200 dark:border-green-800",
          textColor: "text-green-700 dark:text-green-300"
        };
      }
    }, [isReasoning, isTimedOut]);

    const state = getReasoningState();

    return (
      <div className={cn(
        "rounded-lg border transition-all duration-200",
        state.bgColor,
        state.borderColor
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            {state.icon}
            <span className={cn("font-medium text-sm", state.textColor)}>
              {state.text}
            </span>
            {totalReasoningSteps > 0 && (
              <span className={cn("text-xs px-2 py-1 rounded-full", state.bgColor, state.textColor)}>
                {totalReasoningSteps} step{totalReasoningSteps !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            className={cn(
              "cursor-pointer rounded-full p-1.5 transition-colors",
              "hover:bg-white/50 dark:hover:bg-black/20",
              {
                "bg-white/70 dark:bg-black/30": isExpanded,
              }
            )}
            onClick={handleToggleExpanded}
            aria-label={isExpanded ? "Collapse reasoning" : "Expand reasoning"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Reasoning Steps */}
        <AnimatePresence initial={false} mode="wait">
          {isExpanded && (
            <motion.div
              key="reasoning-content"
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={variants}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                <div className="border-l-2 border-gray-300 dark:border-gray-600 pl-4 space-y-3">
                  {displayedSteps.map((part: any, detailIndex) => {
                    // AI SDK 5.0: Access input directly on part
                    const content = part.type === "tool-addReasoningStep"
                      ? part.input?.content || part.input?.step || ""
                      : "";

                    if (!content) return null;

                    return (
                      <motion.div
                        key={`reasoning-step-${detailIndex}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: detailIndex * 0.1 }}
                        className="reasoning-step"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300 mt-0.5">
                            {detailIndex + 1}
                          </div>
                          <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                            <Markdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                ...markdownComponents,
                                // Override paragraph styling for reasoning steps
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0 leading-relaxed">
                                    {children}
                                  </p>
                                ),
                              }}
                            >
                              {content}
                            </Markdown>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Show more button */}
                  {!showAllReasoning && totalReasoningSteps > reasoningLimit && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={handleShowAllReasoning}
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium transition-colors ml-8"
                    >
                      Show {totalReasoningSteps - reasoningLimit} more step{totalReasoningSteps - reasoningLimit !== 1 ? 's' : ''}...
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ReasoningMessagePart.displayName = "ReasoningMessagePart";
