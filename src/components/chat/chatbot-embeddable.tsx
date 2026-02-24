"use client";
export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
// AI SDK 5.0: Attachment renamed to FileUIPart, DefaultChatTransport for transport architecture
import type { FileUIPart, UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MultimodalInput } from "./multimodal-input";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat/chat-bubble";
import { MessageItem } from "./message";
import { modelID } from "@/lib/models";
import Image from "next/image";
import { cn } from "@/utils/utils";
import { ChevronDown, Plus } from "lucide-react";

interface ChatbotV3EmbedableProps {
  token: string;
  initialMessages?: UIMessage[];
}

export interface AgentData {
  id: string;
  agentName: string;
  description?: string;
  projectId?: string;
  searchEngineId?: string;
  sdkToken: string;
  isActive: boolean;
}

export const Chatbotv3embedable = ({ token, initialMessages = [] }: ChatbotV3EmbedableProps) => {
  const [agentInfo, setAgentInfo] = useState<AgentData | null>(null)
  const [, setSelectedAgentInfo] = useState({ name: 'default', id: '' })
  const [attachments, setAttachments] = useState<Array<FileUIPart>>([]);
  const [chatId, setChatId] = useState<string | undefined>()
  const chatEndRef = useRef<HTMLDivElement>(null)
  const messageContainerRef = useRef<HTMLDivElement>(null)
  const [selectedModelId,] = useState<modelID>(
    "gemini-2.5-flash"
  );
  const [selectedAgentName, setSelectedAgentName] = useState<string>('')
  const [streamStarted, setStreamStarted] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [persistedMessages, setPersistedMessages] = useState<UIMessage[]>([]);

  const STORE_CHAT_HISTORY = (process.env.NEXT_PUBLIC_STORE_CHAT_HISTORY || 'true') !== 'false';


  const userHasScrolled = useRef(false);
  const isClearing = useRef(false);

  useEffect(() => {
    if (!STORE_CHAT_HISTORY) return;
    const savedMessages = localStorage.getItem('chatWidgetMessages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setPersistedMessages(parsed);
      } catch (error) {
        console.error('Error loading messages from local storage:', error);
      }
    }
  }, [STORE_CHAT_HISTORY]);

  // AI SDK 5.0: Manage input state manually (removed from useChat)
  const [input, setInput] = useState("");

  // AI SDK 5.0: Use transport architecture instead of api/body options
  // Use the Next.js API route directly (same pattern as chat.tsx) to avoid
  // race condition where apiUrl was '' before fetchAgentData completed.
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/chat/sdk/${token}`,
        headers: {
          "Content-Type": "application/json",
          "x-chat-id": chatId || "",
        },
        body: {
          id: chatId,
          activeChatId: chatId,
          agentId: agentInfo?.id,
          selectedModelId,
          isReasoningEnabled: true,
        },
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          const newChatId = response.headers.get("x-chat-id");
          if (newChatId && newChatId !== "unknown" && newChatId !== chatId) {
            setChatId(newChatId);
            if (STORE_CHAT_HISTORY) {
              localStorage.setItem("chatWidgetId", newChatId);
            }
          }
          return response;
        },
      }),
    [chatId, agentInfo?.id, token, selectedModelId, STORE_CHAT_HISTORY]
  );

  // AI SDK 5.0: useChat returns sendMessage instead of append, status instead of isLoading
  const {
    messages,
    sendMessage,
    status,
    stop,
    // setMessages,
  } = useChat({
    transport: chatTransport,
    messages: STORE_CHAT_HISTORY && persistedMessages.length > 0 ? persistedMessages : initialMessages,
    // AI SDK 5.0: onResponse removed, use onFinish for post-response handling
    onFinish: () => {
      setStreamStarted(false);
      // Reset the userHasScrolled flag when streaming ends
      userHasScrolled.current = false;
    },
    onError: (error: Error) => {
      console.error("Chat error:", error);
      console.error("Error type:", error?.constructor?.name);
      console.error("Error message:", error?.message);

      // Check if this is a quota exceeded error in multiple ways
      const errorMessage = error?.message || "";
      const errorString = JSON.stringify(error);

      const isQuotaError =
        errorMessage.includes("QUOTA_EXCEEDED") ||
        errorMessage.includes("quota") ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorString.includes("QUOTA_EXCEEDED") ||
        errorString.includes("quota") ||
        errorString.includes("RESOURCE_EXHAUSTED");

      if (isQuotaError) {
        console.log("✅ Quota exceeded detected in embeddable chatbot onError handler");
        setIsQuotaExceeded(true);
      }
    },
  });

  // AI SDK 5.0: Compatibility layer - derive isLoading from status
  const isLoading = status === "streaming" || status === "submitted";

  // AI SDK 5.0: Compatibility layer - handleSubmit using sendMessage
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim()) return;
      setStreamStarted(true);
      await sendMessage({ text: input });
      setInput("");
    },
    [input, sendMessage]
  );

  // AI SDK 5.0: Compatibility layer - append using sendMessage
  const append = useCallback(
    async (
      message: { role: string; parts?: any[]; content?: string },
      options?: { body?: any }
    ): Promise<string | null | undefined> => {
      const text = message.parts?.find((p: any) => p.type === "text")?.text || message.content || "";
      await sendMessage(
        { text },
        options?.body ? { body: options.body } : undefined
      );
      return null;
    },
    [sendMessage]
  );

  useEffect(() => {
    if (!STORE_CHAT_HISTORY) return;
    const savedChatId = localStorage.getItem("chatWidgetId");
    if (savedChatId) {
      setChatId(savedChatId);
    }
  }, [STORE_CHAT_HISTORY]);

  useEffect(() => {
    if (!STORE_CHAT_HISTORY) return;
    if (messages.length > 0 && !isClearing.current) {
      localStorage.setItem('chatWidgetMessages', JSON.stringify(messages));
    }
  }, [messages, STORE_CHAT_HISTORY]);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        console.log('Fetching agent data for token:', token);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/agent/sdk/${token}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );

        console.log('Agent data response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Agent data fetch failed:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Agent data response:', responseData);

        if (responseData.error) {
          console.error('Agent data error:', responseData.error);
          throw new Error(responseData.error);
        }

        const data = responseData.data;
        const agentName = data?.agentName;

        setSelectedAgentInfo({ name: agentName, id: data?.id || "" });
        setSelectedAgentName(agentName);
        setAgentInfo(data);

        // Load chat ID from localStorage if exists
        if (STORE_CHAT_HISTORY) {
          const savedChatId = localStorage.getItem("chatWidgetId");
          if (savedChatId) {
            setChatId(savedChatId);
          }
        }
      } catch (error) {
        console.error("Error fetching agent data:", error);
        setSelectedAgentName("KnowgenAI");
      }
    };

    fetchAgentData();
    // setMessages([])
  }, [token]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Show button if scrolled up more than 200px from bottom
      setShowScrollButton(distanceFromBottom > 200);

      // If user scrolls up during streaming, mark as manually scrolled
      if (distanceFromBottom > 100 && streamStarted) {
        userHasScrolled.current = true;
      }

      // If user scrolls to bottom, reset the manual scroll flag
      if (distanceFromBottom < 50) {
        userHasScrolled.current = false;
      }
    };

    // Initial check
    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [streamStarted]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleNewChat = () => {
    // Set clearing flag to prevent saving during cleanup
    isClearing.current = true;

    // Clear from storage
    if (STORE_CHAT_HISTORY) {
      localStorage.removeItem("chatWidgetId");
      localStorage.removeItem('chatWidgetMessages');
    }

    // Reload the page to start fresh
    // No need to clear state - the reload will reset everything
    window.location.reload();
  };

  //add scroll event listener
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        messageContainer.scrollTop += e.deltaY;
      };
      messageContainer.addEventListener("wheel", handleWheel, {
        passive: false,
      });
      return () => messageContainer.removeEventListener("wheel", handleWheel);
    }
  }, []);

  //add touch event
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      let startY: number;

      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0]?.clientY ?? 0;
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) {
          const deltaY = startY - e.touches[0].clientY;
          messageContainer.scrollTop += deltaY;
          startY = e.touches[0].clientY;
        }
      };

      messageContainer.addEventListener("touchstart", handleTouchStart);
      messageContainer.addEventListener("touchmove", handleTouchMove);

      return () => {
        messageContainer.removeEventListener("touchstart", handleTouchStart);
        messageContainer.removeEventListener("touchmove", handleTouchMove);
      };
    }
  }, []);

  useEffect(() => {
    setSelectedAgentName("KnowgenAI");
  }, []);

  useEffect(() => {
    console.log("selectedAgentName updated:", selectedAgentName);
  }, [selectedAgentName]);

  return (
    <div className="flex flex-col overflow-hidden w-full  shadow-md sm:shadow-lg md:shadow-xl lg:shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <ChatBubbleAvatar role="assistant" className="w-8 h-8 " />
          </div>
          <div>
            <h4 className="text-base md:text-lg font-medium text-gray-800 dark:text-gray-200">
              {selectedAgentName}
            </h4>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isLoading || streamStarted ? "Typing..." : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost" // Default for mobile
                  className={cn(
                    "px-2 py-1 text-xs flex items-center",
                    "md:bg-transparent md:border md:border-input" // Add outline styling for md+
                  )}
                  // onClick={handleNewChat}
                  // disabled={isLoading || streamStarted || isCreatingNewChat}
                >
                  <Plus className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">New conversation</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Start a New Chat?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear the current conversation. Are you sure you
                    want to start a new chat?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleNewChat}>
                    Start New Chat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {/* <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
            {selectedModelId.split("-")[0]}
          </div> */}
        </div>
      </div>
      <div className="relative flex flex-col overflow-hidden h-screen">
        <main className="flex flex-col h-full overflow-hidden px-0 bg-[url('/images/bg-chat-light.svg')] dark:bg-[url('/images/bg-chat-dark.svg')] bg-repeat bg-[length:200px] bg-[0_0] [image-rendering:crisp-edges]">
          <div
            ref={messageContainerRef}
            className="p-6 py-4 flex-grow overflow-y-auto -webkit-overflow-scrolling-touch"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-center p-8 bg-white dark:bg-zinc-900/60 rounded-xl shadow-sm backdrop-blur-sm">
                  <div className="flex gap-x-2 items-center justify-center">
                    <Image
                      src="/km/favicon/new-knowgen-logo.png"
                      className="aspect-square"
                      alt="KnowgenAI Logo"
                      width={96}
                      height={96}
                    />
                    {process.env.NEXT_PUBLIC_BAZNAS_THEME == "true" && (
                      <>
                        <p className="text-gray-400 mx-5">x</p>
                        <Image
                          src="/images/logo_baznas.png"
                          alt="Baznas Logo"
                          width={80}
                          height={64}
                        />
                      </>
                    )}
                    {process.env.NEXT_PUBLIC_BP_THEME == "true" && (
                      <>
                        <p className="text-gray-400 mx-5">x</p>
                        <Image
                          src="/images/logo_bp_tiwi.png"
                          alt="BP Logo"
                          width={96}
                          height={96}
                        />
                      </>
                    )}
                  </div>
                  <p className="text-xl font-medium text-gray-700 dark:text-gray-200 mb-3">
                    Welcome to {selectedAgentName}
                  </p>
                  <p className="text-md text-gray-500 dark:text-gray-400 max-w-md">
                    Start a conversation by typing a message below. I&apos;m
                    here to help answer your questions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, messageIndex) => {
                  // AI SDK 5.0: Get text from parts instead of content
                  const getTextFromParts = (msg: UIMessage) => {
                    return msg.parts
                      ?.filter((p: any) => p.type === "text")
                      .map((p: any) => p.text)
                      .join("\n") || "";
                  };

                  // Get previous message content for feedback
                  const previousMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
                  const previousMessageContent = previousMessage && previousMessage.role === "user"
                    ? getTextFromParts(previousMessage)
                    : undefined;

                  // AI SDK 5.0: createdAt and experimental_attachments are no longer on UIMessage
                  const createdAt = (message as any).createdAt;
                  const experimentalAttachments = (message as any).experimental_attachments;

                  return (
                    <MessageItem
                      key={`${message.id || Date.now()}-${message.role
                        }-${Math.random().toString(36).substring(7)}`}
                      id={
                        message.id ||
                        `msg-${Date.now()}-${Math.random()
                          .toString(36)
                          .substring(7)}`
                      }
                      role={message.role}
                      // AI SDK 5.0: content is now derived from parts
                      content={getTextFromParts(message)}
                      parts={message.parts || []}
                      createdAt={
                        createdAt
                          ? new Date(createdAt)
                          : new Date()
                      }
                      experimental_attachments={experimentalAttachments}
                      previousMessageContent={previousMessageContent}
                      token={token}
                      isQuotaExceeded={isQuotaExceeded && message.role === "assistant"}
                      isReasoningUIEnabled={false}
                    />
                  );
                })}

                {isLoading &&
                  messages[messages.length - 1]?.role === "user" && (
                    <div className="flex items-start justify-start">
                      <div className="">
                        <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500">
                          <ChatBubbleAvatar
                            role="assistant"
                            className="flex items-center justify-center"
                          />
                        </div>
                      </div>
                      <div className="">
                        <ChatBubble variant="received" className="max-w-[80%]">
                          <ChatBubbleMessage variant="received" isLoading />
                        </ChatBubble>
                      </div>
                    </div>
                  )}
              </div>
            )}
            <div ref={chatEndRef} />

            {/* Quota exceeded banner */}
            {isQuotaExceeded && (
              <div className="absolute top-4 left-0 right-0 flex justify-center z-50 px-4">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg shadow-lg border border-red-200 dark:border-red-800 max-w-lg">
                  <div className="flex items-start">
                    <svg
                      className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5"
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
                      <div className="font-semibold text-lg mb-1">
                        API Quota Exceeded
                      </div>
                      <div className="text-sm mb-3">
                        The AI service has reached its usage limit for this conversation.
                        To continue chatting, please start a new conversation.
                      </div>
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Start New Conversation
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Start a New Chat?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will clear the current conversation and reset the quota. Are you sure you want to start a new chat?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleNewChat}>
                                Start New Chat
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setIsQuotaExceeded(false)}
                          className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {showScrollButton && (
            <div className="sticky bottom-[80px] w-full pointer-events-none">
              <div className="relative w-full max-w-full flex justify-end px-4">
                <button
                  onClick={() => {
                    scrollToBottom();
                    userHasScrolled.current = false;
                  }}
                  className={cn(
                    "p-3 rounded-full shadow-lg pointer-events-auto",
                    "bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200",
                    "hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors",
                    "border border-gray-200 dark:border-zinc-700",
                    "animate-bounce-gentle z-50"
                  )}
                  aria-label="Scroll to bottom"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
          <form className="w-full mx-auto py-2 flex flex-col px-4 sticky bg-none bottom-0">
            <MultimodalInput
              input={input}
              setInput={setInput}
              handleSubmit={async (e?: React.FormEvent) => {
                if (e) e.preventDefault();
                handleSubmit(e);
                return Promise.resolve();
              }}
              isLoading={isLoading}
              stop={stop}
              attachments={attachments}
              setAttachments={setAttachments}
              messages={messages}
              append={append}
              selectedModelId={selectedModelId}
              isReasoningEnabled={true}
              setSelectedModelId={() => { }} // No-op function since we don't need to change models in embedded chat
              setIsReasoningEnabled={() => { }} // No-op function since we don't change reasoning in embedded chat
              isGeneratingResponse={isLoading}
              activeChatId={chatId}
              hideLiveChat={true}
              hideAttachment={true}
              hideModelSelection={true}
            />
          </form>
        </main>
      </div>
    </div>
  );
};
