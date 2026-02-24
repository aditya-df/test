"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/utils/utils";
import { modelID } from "@/lib/models";
import { useRouter } from "nextjs-toploader/app";
import { deleteCookie } from "cookies-next";
import { CLIENT_TIMEOUTS } from "@/lib/timeout-config";
import { useNetworkStore } from "@/stores/network/network-store";
import { formatDate, getTextFromParts } from "@/utils/chat-utils";

// Sub-components
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { MultimodalInput } from "./multimodal-input";
import { ScrollToBottomButton } from "./scroll-to-bottom-button";

interface MessageGroup {
  date: string;
  messages: UIMessage[];
}

interface ChatProps {
  chatId?: string;
  initialMessages?: UIMessage[];
  hasAccess?: boolean;
  MENU_CONST?: string;
  session?: any;
  loadAgent?: boolean;
  agentId?: string;
  selectedAgentNameProps?: string;
  token?: string;
  agentImage?: string;
  userImage?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

export function Chat({
  chatId: initialChatId,
  initialMessages = [],
  agentId,
  selectedAgentNameProps,
  token,
  agentImage,
}: ChatProps) {
  const [attachments, setAttachments] = useState<Array<FileUIPart>>([]);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const [selectedAgentName, setSelectedAgentName] =
    useState<string>(selectedAgentNameProps || "KnowgenAI");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [activeChatId, setActiveChatId] = useState<string | undefined>(
    initialChatId
  );
  const [selectedAgentInfo, setSelectedAgentInfo] = useState({
    name: selectedAgentNameProps || (agentId ? "Agent" : "default"),
    id: agentId || "",
    responseViewConfig: {
      showThinking: true,
      minimizeSearchResults: false,
      showSearchSources: true,
      groundTruthStyle: "list" as const,
    },
  });

  const [streamStarted, setStreamStarted] = useState(false);
  const [selectedModelId, setSelectedModelId] =
    useState<modelID>("gemini-2.5-flash");
  const [isReasoningEnabled, setIsReasoningEnabled] = useState<boolean>(true);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [responseTimeout, setResponseTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  // Use refs to track loading state without causing re-renders
  const isLoadingRef = useRef(false);
  const previousMessages = useRef<UIMessage[]>([]);
  const [isCreatingNewChat] = useState(false);
  const isMounted = useRef(true);

  // AI SDK 5.0 FIX: Track pending file parts that need to be added to messages
  const pendingFileParts = useRef<{ parts: any[]; textContent: string } | null>(null);

  // Scroll behavior state
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAutoScrolling = useRef(false);
  const scrollAnimationFrame = useRef<number | null>(null);
  const lastContentHeight = useRef(0);
  const autoScrollEnabled = useRef(true);

  // AI SDK 5.0: Manage input state manually
  const [input, setInput] = useState("");

  const isOnline = useNetworkStore(
    (state: { isOnline: boolean }) => state.isOnline
  );

  // AI SDK 5.0: Use transport architecture
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: token ? `api/chat/sdk/${token}` : "/api/chat",
        headers: {
          "x-chat-id": activeChatId || "",
          "x-agent-id": selectedAgentInfo.id || "",
        },
        body: {
          id: activeChatId,
          activeChatId: activeChatId,
          agentId: selectedAgentInfo.id || "",
          agentName: selectedAgentInfo.name || "KnowgenAI",
          selectedModelId,
          isReasoningEnabled,
        },
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          const newChatId = response.headers.get("x-chat-id");
          if (newChatId && newChatId !== "unknown" && newChatId !== activeChatId) {
            console.log("🆔 Received new chatId from backend:", newChatId);
            setActiveChatId(newChatId);
          }
          return response;
        },
      }),
    [token, activeChatId, selectedAgentInfo.id, selectedAgentInfo.name, selectedModelId, isReasoningEnabled]
  );

  const { messages, sendMessage, status, stop, setMessages } =
    useChat({
      transport: chatTransport,
      messages: initialMessages,
      onFinish: ({ message }) => {
        const textContent = getTextFromParts(message);
        if (
          message.role === "assistant" &&
          (!textContent || textContent.trim() === "")
        ) {
          const fallbackMessage = {
            ...message,
            parts: [
              {
                type: "text" as const,
                text: "I apologize, but I encountered an issue while processing your request. Could you please rephrase your question?",
              },
            ],
          } as UIMessage;

          setMessages((prev) => [
            ...prev.slice(0, -1),
            fallbackMessage,
          ]);
        }

        if (responseTimeout) {
          clearTimeout(responseTimeout);
          setResponseTimeout(null);
        }
        setStreamStarted(false);
        setIsTimedOut(false);
      },
      onError: (error) => {
        console.error("Chat error:", error);
        
        // Simplified quota detection logic
        const errorString = JSON.stringify(error, Object.getOwnPropertyNames(error)).toLowerCase();
        const isQuotaError = errorString.includes("quota") || 
                           errorString.includes("resource_exhausted") || 
                           errorString.includes("429");

        if (isQuotaError) {
          setIsQuotaExceeded(true);
          toast({
            title: "API Quota Exceeded",
            description: "Please start a new conversation to continue.",
            variant: "destructive",
          });
        }

        setStreamStarted(false);
        setIsTimedOut(false);
        if (responseTimeout) {
          clearTimeout(responseTimeout);
          setResponseTimeout(null);
        }
      },
    });

  const isLoading = status === "streaming" || status === "submitted";

  const append = useCallback(

    async (
      message: { role: string; parts?: any[]; content?: string; createdAt?: Date; experimental_attachments?: any[] },
      options?: { data?: string; body?: any }
    ): Promise<string | null | undefined> => {
      const originalParts = message.parts || [];
      const fileParts = originalParts.filter((p: any) => p.type === "file");
      const textPart = originalParts.find((p: any) => p.type === "text");
      const textContent = textPart?.text || message.content || "";

      if (fileParts.length > 0) {
        pendingFileParts.current = {
          parts: fileParts,
          textContent: textContent,
        };
      }

      if (message.parts && message.parts.length > 0) {
        await sendMessage(
          { parts: message.parts },
          options?.body ? { body: options.body } : undefined
        );
      } else {
        const text = message.content || "";
        await sendMessage(
          { text },
          options?.body ? { body: options.body } : undefined
        );
      }

      return null;
    },
    [sendMessage]
  );

  // Effect to watch for new messages and add file parts if missing
  useEffect(() => {
    if (!pendingFileParts.current || messages.length === 0) return;

    const { parts: fileParts, textContent } = pendingFileParts.current;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "user") {
        const existingFileParts = (msg.parts || []).filter((p: any) =>
          p.type === "file" && (p.url || p.data)
        );

        const msgTextContent = (msg.parts || [])
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join(" ");

        const textMatches = msgTextContent.includes(textContent.substring(0, 50)) ||
          textContent.includes(msgTextContent.substring(0, 50)) ||
          msgTextContent === "" || textContent === "";

        if (existingFileParts.length < fileParts.length && fileParts.length > 0 && textMatches) {
          const filePartsToAdd = [...fileParts];
          const targetTextContent = textContent;
          pendingFileParts.current = null;

          setMessages((prevMessages) => {
            let targetIndex = -1;
            for (let j = prevMessages.length - 1; j >= 0; j--) {
              if (prevMessages[j].role === "user") {
                const prevMsgTextContent = (prevMessages[j].parts || [])
                  .filter((p: any) => p.type === "text")
                  .map((p: any) => p.text)
                  .join(" ");
                const prevExistingFileParts = (prevMessages[j].parts || []).filter((p: any) =>
                  p.type === "file" && (p.url || p.data)
                );

                if (prevExistingFileParts.length < filePartsToAdd.length &&
                  (prevMsgTextContent.includes(targetTextContent.substring(0, 50)) ||
                    targetTextContent.includes(prevMsgTextContent.substring(0, 50)) ||
                    prevMsgTextContent === "" || targetTextContent === "")) {
                  targetIndex = j;
                  break;
                }
              }
            }

            if (targetIndex === -1) return prevMessages;

            const updatedMessages = [...prevMessages];
            const existingNonFileParts = (updatedMessages[targetIndex].parts || []).filter((p: any) =>
              p.type !== "file" || (p.type === "file" && (p.url || p.data))
            );

            const textParts = existingNonFileParts.filter((p: any) => p.type === "text");
            const validExistingFileParts = existingNonFileParts.filter((p: any) => p.type === "file" && (p.url || p.data));
            const existingUrls = new Set(validExistingFileParts.map((p: any) => p.url));
            const newFileParts = filePartsToAdd.filter((p: any) => !existingUrls.has(p.url));

            updatedMessages[targetIndex] = {
              ...updatedMessages[targetIndex],
              parts: [...textParts, ...validExistingFileParts, ...newFileParts],
            };

            return updatedMessages;
          });
        } else if (existingFileParts.length >= fileParts.length) {
          pendingFileParts.current = null;
        }
        break;
      }
    }
  }, [messages, setMessages]);

  const handleStopGeneration = useCallback(() => {
    stop();
    setStreamStarted(false);

    setMessages((prevMessages) => {
      const updatedMessages = prevMessages.map((message) => {
        const textContent = getTextFromParts(message);
        if (message.role === "assistant" && !textContent) {
          return {
            ...message,
            parts: [{ type: "text" as const, text: "Response was stopped by user." }],
          } as UIMessage;
        }
        return message;
      });

      const hasChanges = updatedMessages.some(
        (msg, index) => getTextFromParts(msg) !== getTextFromParts(prevMessages[index])
      );

      return hasChanges ? updatedMessages : prevMessages;
    });

    setTimeout(() => {
      if (isMounted.current) {
        setIsTimedOut(false);
      }
    }, 1000);
  }, [stop, setMessages]);

  // Response timeout effect

  useEffect(() => {
    if (streamStarted && !isTimedOut) {
      const timeoutId = setTimeout(() => {
        if (streamStarted && isMounted.current) {
          handleStopGeneration();
          setIsTimedOut(true);
        }
      }, CLIENT_TIMEOUTS.RESPONSE);

      setResponseTimeout(timeoutId);
      return () => clearTimeout(timeoutId);
    } else if (!streamStarted && responseTimeout) {
      clearTimeout(responseTimeout);
      setResponseTimeout(null);
    }
  }, [streamStarted, isTimedOut, handleStopGeneration]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    return messages.reduce((groups: MessageGroup[], message) => {
      const createdAt = (message as any).createdAt;
      const messageDate = createdAt ? new Date(createdAt) : new Date();
      const dateString = formatDate(messageDate);

      const group = groups.find((g) => g.date === dateString);
      if (group) group.messages.push(message);
      else groups.push({ date: dateString, messages: [message] });

      return groups;
    }, []);
  }, [messages]);

  // Scroll logic
  const scrollToBottomWhenReady = useCallback(async (force = false, smooth = true) => {
    const container = messageContainerRef.current;
    if (!container) return;

    if (force || autoScrollEnabled.current) {
      isAutoScrolling.current = true;
      if (scrollAnimationFrame.current) cancelAnimationFrame(scrollAnimationFrame.current);

      const targetScrollTop = container.scrollHeight - container.clientHeight;

      if (smooth && Math.abs(container.scrollTop - targetScrollTop) > 100) {
        const startScrollTop = container.scrollTop;
        const distance = targetScrollTop - startScrollTop;
        const duration = Math.min(300, Math.abs(distance) / 3);
        const startTime = performance.now();

        const animateScroll = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          container.scrollTop = startScrollTop + distance * easeProgress;

          if (progress < 1) {
            scrollAnimationFrame.current = requestAnimationFrame(animateScroll);
          } else {
            isAutoScrolling.current = false;
            scrollAnimationFrame.current = null;
          }
        };
        scrollAnimationFrame.current = requestAnimationFrame(animateScroll);
      } else {
        container.scrollTop = targetScrollTop;
        isAutoScrolling.current = false;
      }
    }
  }, []);

  const handleScroll = useCallback(() => {
    const container = messageContainerRef.current;
    if (!container || isAutoScrolling.current) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = scrollBottom < 100;

    setShowScrollButton(!isNearBottom && (isLoading || streamStarted || scrollBottom > 200));

    if (isNearBottom) autoScrollEnabled.current = true;
    else if (scrollBottom > 150) autoScrollEnabled.current = false;
  }, [isLoading, streamStarted]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    const throttledHandleScroll = () => {
      requestAnimationFrame(handleScroll);
    };

    container.addEventListener("scroll", throttledHandleScroll, { passive: true });
    return () => container.removeEventListener("scroll", throttledHandleScroll);
  }, [handleScroll]);

  // Automatic scrolling effects
  useEffect(() => {
    if (messages.length > 0) {
      const isInitialLoad = previousMessages.current.length === 0;
      const lastMessage = messages[messages.length - 1];

      if (isInitialLoad || lastMessage.role === "user") {
        autoScrollEnabled.current = true;
        setTimeout(() => scrollToBottomWhenReady(true, !isInitialLoad), 100);
      } else if (isLoading || streamStarted) {
        setTimeout(() => scrollToBottomWhenReady(false, false), 50);
      }

      previousMessages.current = messages;
    }
  }, [messages.length, isLoading, streamStarted, scrollToBottomWhenReady]);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (autoScrollEnabled.current && (isLoading || streamStarted)) {
        scrollToBottomWhenReady(false, true);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [isLoading, streamStarted, scrollToBottomWhenReady]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setIsQuotaExceeded(false);
    pendingFileParts.current = null;
    deleteCookie("chatWidgetId");

    const params = new URLSearchParams();
    if (agentId) params.append("agentId", agentId);
    if (selectedAgentNameProps) params.append("selectedAgentNameProps", selectedAgentNameProps);

    router.push(`/chatbot?${params.toString()}`);
  }, [agentId, selectedAgentNameProps, router, setMessages]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!input.trim()) return;

      try {
        autoScrollEnabled.current = true;
        await append(
          {
            role: "user",
            parts: [{ type: "text", text: input }],
            createdAt: new Date(),
          },
          {
            body: {
              activeChatId,
              selectedModelId,
              isReasoningEnabled,
              agentId: selectedAgentInfo.id || "",
            },
          }
        );
        setInput("");
      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    },
    [input, append, activeChatId, selectedModelId, isReasoningEnabled, selectedAgentInfo.id]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (responseTimeout) clearTimeout(responseTimeout);
      if (scrollAnimationFrame.current) cancelAnimationFrame(scrollAnimationFrame.current);
    };
  }, [responseTimeout]);

  return (
    <div className="flex flex-col h-full w-full mx-auto">
      <div className={cn(
        "flex flex-col h-full w-full relative",
        "bg-gradient-to-b from-blue-50 to-gray-50 dark:from-zinc-900 dark:to-zinc-950",
        "border-0 md:border border-gray-100 dark:border-zinc-800",
        "rounded-none md:rounded-lg shadow-lg"
      )}>
        <ChatHeader
          agentImage={agentImage}
          selectedAgentName={selectedAgentName}
          isOnline={isOnline}
          streamStarted={streamStarted}
          isCreatingNewChat={isCreatingNewChat}
          selectedModelId={selectedModelId}
          onNewChat={handleNewChat}
        />

        <main className="flex flex-col h-full overflow-hidden px-0 bg-[url('/images/bg-chat-light.svg')] dark:bg-[url('/images/bg-chat-dark.svg')] bg-repeat bg-[length:200px] bg-[0_0] [image-rendering:crisp-edges]">
          <MessageList
            messages={messages}
            groupedMessages={groupedMessages}
            isLoading={isLoading}
            streamStarted={streamStarted}
            agentImage={agentImage}
            activeChatId={activeChatId}
            isTimedOut={isTimedOut}
            isQuotaExceeded={isQuotaExceeded}
            agentConfig={selectedAgentInfo.responseViewConfig}
            selectedAgentName={selectedAgentName}
            messageContainerRef={messageContainerRef}
            chatEndRef={chatEndRef}
          />

          {isTimedOut && (
            <div className="w-full flex justify-center my-4 sticky bottom-20 z-50">
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 px-4 py-2 rounded-lg text-sm text-yellow-800 dark:text-yellow-200 shadow-md backdrop-blur-sm">
                ⚠️ Response timed out. You can try asking again or rephrase.
              </div>
            </div>
          )}

          <ScrollToBottomButton
            show={showScrollButton}
            onClick={() => scrollToBottomWhenReady(true, true)}
          />

          <div className="px-3 md:px-6 pb-3 md:pb-6 pt-2 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-t border-gray-200 dark:border-zinc-800">
            <MultimodalInput
              input={input}
              setInput={setInput}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments as any}
              messages={messages}
              append={append as any}
              handleSubmit={handleSubmit}
              isGeneratingResponse={isLoading}
              selectedModelId={selectedModelId}
              setSelectedModelId={setSelectedModelId}
              isReasoningEnabled={isReasoningEnabled}
              setIsReasoningEnabled={setIsReasoningEnabled}
              activeChatId={activeChatId}
              agentId={agentId}
              selectedAgentNameProps={selectedAgentNameProps}
              selectedAgentInfo={selectedAgentInfo}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
