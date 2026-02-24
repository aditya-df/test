"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { UIMessage } from "ai";
import { cn } from "@/utils/utils";
import { MessageItem } from "./message";
import {
  ChatBubble,
  ChatBubbleMessage,
} from "../ui/chat/chat-bubble";
import { AgentAvatar } from "./agent-avatar";
import { UserAvatar } from "./user-avatar";

// Helper function to extract text content from parts (AI SDK 5.0)
const getTextFromParts = (message: UIMessage): string => {
  if (!message.parts || message.parts.length === 0) {
    return "";
  }

  return message.parts
    .filter((part: any) => part.type === "text")
    .map((part: any) => part.text)
    .join(" ");
};

// FIXED: Helper function to generate stable message keys
const generateStableMessageKey = (message: UIMessage, index: number): string => {
  const filePartsWithUrls = (message.parts || []).filter(
    (p: any) => p.type === "file" && (p.url || p.data)
  ).length;
  const totalFileParts = (message.parts || []).filter((p: any) => p.type === "file").length;

  if (message.id) {
    return `${message.id}-files${totalFileParts}-urls${filePartsWithUrls}`;
  }

  const textContent = getTextFromParts(message);
  const contentHash = textContent.slice(0, 50).replace(/\s+/g, "-");
  const timestamp = (message as any).createdAt
    ? new Date((message as any).createdAt).getTime()
    : index;

  return `${message.role}-${timestamp}-${contentHash}-${index}-files${totalFileParts}-urls${filePartsWithUrls}`;
};

interface MessageGroup {
  date: string;
  messages: UIMessage[];
}

interface MessageListProps {
  messages: UIMessage[];
  groupedMessages: MessageGroup[];
  isLoading: boolean;
  streamStarted: boolean;
  agentImage?: string;
  activeChatId?: string;
  isTimedOut: boolean;
  isQuotaExceeded: boolean;
  agentConfig: any;
  selectedAgentName: string;
  messageContainerRef: React.RefObject<HTMLDivElement | null>;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList = memo(({
  messages,
  groupedMessages,
  isLoading,
  streamStarted,
  agentImage,
  activeChatId,
  isTimedOut,
  isQuotaExceeded,
  agentConfig,
  selectedAgentName,
  messageContainerRef,
  chatEndRef,
}: MessageListProps) => {
  return (
    <div
      className={cn(
        "flex-grow overflow-y-auto relative",
        "px-3 md:px-6 py-3 md:py-5",
        "space-y-4",
        "bg-opacity-30",
        "scroll-smooth"
      )}
      ref={messageContainerRef}
    >
      {messages.length === 0 && !streamStarted ? (
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
        <div className="w-full space-y-6">
          {groupedMessages.map((group, groupIndex) => (
            <div
              key={`group-${groupIndex}`}
              className="flex flex-col gap-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-center my-4">
                <div className="bg-white/70 dark:bg-zinc-800/70 px-4 py-1.5 rounded-full text-sm text-gray-600 dark:text-gray-300 shadow-sm backdrop-blur-sm">
                  {group.date}
                </div>
              </div>
              {group.messages.map((message, messageIndex) => {
                const isUser = message.role === "user";
                const previousMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
                const previousMessageContent = previousMessage && previousMessage.role === "user"
                  ? getTextFromParts(previousMessage)
                  : undefined;

                return (
                  <div
                    key={generateStableMessageKey(message, messageIndex)}
                    className="flex items-start gap-3 mb-4"
                  >
                    {!isUser && (
                      <div className="flex-shrink-0 hidden sm:block">
                        <AgentAvatar
                          agentImage={agentImage}
                          className="w-8 h-8"
                        />
                      </div>
                    )}

                    <div
                      className={`flex-1 ${isUser ? "text-right" : "text-left"}`}
                    >
                      <MessageItem
                        {...message}
                        id={message.id}
                        replyTo={(message as any).replyTo}
                        parts={message.parts || []}
                        chatId={activeChatId}
                        messageIndex={messageIndex}
                        previousMessageContent={previousMessageContent}
                        isTimedOut={isTimedOut}
                        isTyping={
                          isLoading &&
                          messageIndex === messages.length - 1
                        }
                        isQuotaExceeded={isQuotaExceeded && !isUser}
                        agentConfig={agentConfig}
                        isReasoningUIEnabled={true}
                      />
                    </div>

                    {isUser && (
                      <div className="flex-shrink-0 hidden sm:block">
                        <UserAvatar className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {(isLoading || streamStarted) &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex items-start gap-2 justify-start">
                <div className="size-[24px] border rounded-sm p-1 flex flex-col justify-center items-center shrink-0 text-zinc-500 hidden sm:flex">
                  <AgentAvatar
                    agentImage={agentImage}
                    className="flex items-center justify-center"
                  />
                </div>
                <ChatBubble
                  variant="received"
                  className="max-w-[80%] shadow-sm"
                >
                  <ChatBubbleMessage variant="received" isLoading />
                </ChatBubble>
              </div>
            )}

          <div ref={chatEndRef} />
        </div>
      )}
    </div>
  );
});

MessageList.displayName = "MessageList";
