import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "@/hooks/use-toast";

export type FeedbackType = "like" | "dislike" | null;
export type MessageRole = "user" | "assistant";

interface FeedbackData {
  chatId: string;
  messageIndex?: number;
  messageRole: MessageRole;
  feedbackType: Exclude<FeedbackType, null>;
  messageContent?: string;
  previousMessageContent?: string;
  comment?: string;
}

interface FeedbackResponse {
  id: string;
  messageIndex?: number;
  messageRole: MessageRole;
  feedbackType: Exclude<FeedbackType, null>;
  createdAt: string;
  updatedAt: string;
}

interface UseFeedbackOptions {
  enabled?: boolean;
  autoFetch?: boolean;
}

export const useMessageFeedback = (
  chatId: string | undefined,
  messageIndex?: number,
  options: UseFeedbackOptions = {}
) => {
  // 🔧 FIX 1: Memoize options to prevent recreation on every render
  const stableOptions = useMemo(() => ({
    enabled: true,
    autoFetch: true,
    ...options
  }), [options.enabled, options.autoFetch]); // Only depend on actual option values

  const { enabled, autoFetch } = stableOptions;
  
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 FIX 2: Create a stable key for this message to prevent unnecessary re-renders
  const messageKey = useMemo(() => {
    if (!chatId || !enabled) return null;
    return `${chatId}-${messageIndex ?? 'no-index'}`;
  }, [chatId, messageIndex, enabled]);

  // 🔧 FIX 3: Add ref to prevent multiple simultaneous calls
  const fetchStatusRef = useRef<{
    isInProgress: boolean;
    lastFetchedKey: string | null;
  }>({
    isInProgress: false,
    lastFetchedKey: null
  });

  // 🔧 FIX 4: Clear error when messageKey changes (not individual dependencies)
  useEffect(() => {
    setError(null);
    // Reset fetch status when message changes
    if (fetchStatusRef.current.lastFetchedKey !== messageKey) {
      fetchStatusRef.current.lastFetchedKey = null;
      fetchStatusRef.current.isInProgress = false;
    }
  }, [messageKey]);

  // 🔧 FIX 5: Optimized fetchFeedback with proper dependency management
  const fetchFeedback = useCallback(async () => {
    if (!messageKey || !chatId) return; // Make sure we have both messageKey and chatId
    
    // Prevent multiple calls for the same message
    if (fetchStatusRef.current.isInProgress || 
        fetchStatusRef.current.lastFetchedKey === messageKey) {
      return;
    }

    try {
      fetchStatusRef.current.isInProgress = true;
      setIsInitialLoading(true);
      setError(null);
      
      // 🔧 FIX: Use the actual chatId parameter, not extracted from messageKey
      const params = new URLSearchParams({ chatId }); // Use chatId directly
      if (messageIndex !== undefined) {
        params.append("messageIndex", messageIndex.toString());
      }

      const response = await fetch(`/api/chat/feedback?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.feedback) {
        const feedbackItem = data.feedback as FeedbackResponse;
        setFeedback(feedbackItem.feedbackType);
      } else {
        setFeedback(null);
      }

      // Mark as successfully fetched
      fetchStatusRef.current.lastFetchedKey = messageKey;
      
    } catch (error) {
      console.error("Error fetching feedback:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch feedback");
    } finally {
      setIsInitialLoading(false);
      fetchStatusRef.current.isInProgress = false;
    }
  }, [messageKey, chatId, messageIndex]); // Include chatId in dependencies

  // 🔧 FIX 6: Memoize toast messages to prevent recreation
  const toastMessages = useMemo(() => ({
    like: {
      title: "👍 Feedback: Helpful",
      description: "Thank you for your feedback!",
    },
    dislike: {
      title: "👎 Feedback: Not Helpful", 
      description: "Thank you for your feedback!",
    },
    removed: {
      title: "Feedback Removed",
      description: "Your feedback has been removed.",
    },
    error: {
      title: "Error",
      description: "Failed to submit feedback. Please try again.",
      variant: "destructive" as const,
    },
    removeError: {
      title: "Error",
      description: "Failed to remove feedback. Please try again.",
      variant: "destructive" as const,
    }
  }), []);

  // 🔧 FIX 7: Optimized submitFeedback with stable dependencies
  const submitFeedback = useCallback(
    async (feedbackData: FeedbackData): Promise<boolean> => {
      if (!enabled) return false;

      try {
        setIsLoading(true);
        setError(null);
        
        // Optimistic update
        const previousFeedback = feedback;
        setFeedback(feedbackData.feedbackType);

        const response = await fetch("/api/chat/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(feedbackData),
        });

        if (!response.ok) {
          // Revert optimistic update
          setFeedback(previousFeedback);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.success) {
          // Confirm the optimistic update
          setFeedback(feedbackData.feedbackType);
          
          const toastMessage = feedbackData.feedbackType === "like" 
            ? toastMessages.like 
            : toastMessages.dislike;
          
          toast(toastMessage);
          
          return true;
        } else {
          // Revert optimistic update
          setFeedback(previousFeedback);
          throw new Error(data.error || "Failed to submit feedback");
        }
      } catch (error) {
        console.error("Error submitting feedback:", error);
        setError(error instanceof Error ? error.message : "Failed to submit feedback");
        
        toast(toastMessages.error);
        
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [enabled, feedback, toastMessages] // Stable dependencies
  );

  // 🔧 FIX 8: Optimized removeFeedback with stable dependencies
  const removeFeedback = useCallback(async (): Promise<boolean> => {
    if (!chatId || !enabled) return false;

    try {
      setIsLoading(true);
      setError(null);
      
      // Optimistic update
      const previousFeedback = feedback;
      setFeedback(null);

      const params = new URLSearchParams({ chatId });
      if (messageIndex !== undefined) {
        params.append("messageIndex", messageIndex.toString());
      }

      const response = await fetch(`/api/chat/feedback?${params.toString()}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert optimistic update
        setFeedback(previousFeedback);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Confirm the optimistic update
        setFeedback(null);
        
        toast(toastMessages.removed);
        
        return true;
      } else {
        // Revert optimistic update
        setFeedback(previousFeedback);
        throw new Error(data.error || "Failed to remove feedback");
      }
    } catch (error) {
      console.error("Error removing feedback:", error);
      setError(error instanceof Error ? error.message : "Failed to remove feedback");
      
      toast(toastMessages.removeError);
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [chatId, messageIndex, enabled, feedback, toastMessages]); // Stable dependencies

  // 🔧 FIX 9: Optimized handleFeedback with stable dependencies
  const handleFeedback = useCallback(
    async (
      type: Exclude<FeedbackType, null>,
      messageRole: MessageRole,
      messageContent?: string,
      previousMessageContent?: string,
      comment?: string
    ): Promise<boolean> => {
      if (!chatId || !enabled) return false;

      // If clicking the same feedback type, remove it (toggle off)
      if (feedback === type) {
        return await removeFeedback();
      }

      // Submit new feedback
      return await submitFeedback({
        chatId,
        messageIndex,
        messageRole,
        feedbackType: type,
        messageContent,
        previousMessageContent,
        comment,
      });
    },
    [chatId, messageIndex, enabled, feedback, submitFeedback, removeFeedback]
  );

  // 🔧 FIX 10: Auto-fetch effect with proper dependency management
  useEffect(() => {
    if (autoFetch && messageKey && 
        fetchStatusRef.current.lastFetchedKey !== messageKey) {
      fetchFeedback();
    }
  }, [messageKey, autoFetch, fetchFeedback]);

  // 🔧 FIX 11: Memoize derived loading state
  const isAnyLoading = useMemo(() => 
    isLoading || isInitialLoading, 
    [isLoading, isInitialLoading]
  );

  // 🔧 FIX 12: Memoize utility values to prevent object recreation
  const utilityValues = useMemo(() => ({
    isLiked: feedback === "like",
    isDisliked: feedback === "dislike",
    hasFeedback: feedback !== null,
  }), [feedback]);

  // 🔧 FIX 13: Memoize the return object to prevent recreation
  return useMemo(() => ({
    feedback,
    isLoading: isAnyLoading,
    isInitialLoading,
    error,
    handleFeedback,
    submitFeedback,
    removeFeedback,
    refetchFeedback: fetchFeedback,
    // Utility methods
    ...utilityValues,
    messageKey,
  }), [
    feedback,
    isAnyLoading,
    isInitialLoading,
    error,
    handleFeedback,
    submitFeedback,
    removeFeedback,
    fetchFeedback,
    utilityValues,
    messageKey,
  ]);
};
