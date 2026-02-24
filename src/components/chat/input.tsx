"use client";

import { toast } from "@/hooks/use-toast";
import { useChat } from "@ai-sdk/react";
// AI SDK 5.0: Import DefaultChatTransport for transport architecture
import { DefaultChatTransport } from "ai";
import { useMemo } from "react";

interface InputProps {
  input: string;
  setInput: (value: string) => void;
  selectedModelId: string;
  isGeneratingResponse: boolean;
  isReasoningEnabled: boolean;
}

export function Input({
  input,
  setInput,
  selectedModelId,
  isGeneratingResponse,
  isReasoningEnabled,
}: InputProps) {
  // AI SDK 5.0: Use transport architecture instead of body option
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          selectedModelId,
          isReasoningEnabled,
        },
      }),
    [selectedModelId, isReasoningEnabled]
  );

  // AI SDK 5.0: sendMessage instead of append
  const { sendMessage } = useChat({
    transport: chatTransport,
    onError: () => {
      toast.error("An error occurred, please try again!");
    },
  });

  return (
    <textarea
      className="mb-12 resize-none w-full min-h-12 outline-none bg-transparent placeholder:text-zinc-400"
      placeholder="Send a message"
      value={input}
      autoFocus
      onChange={(event) => {
        setInput(event.currentTarget.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();

          if (input === "") {
            return;
          }

          if (isGeneratingResponse) {
            toast.error("Please wait for the model to finish its response!");

            return;
          }

          // AI SDK 5.0: sendMessage with text format
          sendMessage({ text: input });

          setInput("");
        }
      }}
    />
  );
}