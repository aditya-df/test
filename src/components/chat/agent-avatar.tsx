"use client";

import { AvatarPreview } from "@/components/dashboard/agent/agent-avatar";
import { ChatBubbleAvatar } from "../ui/chat/chat-bubble";
import { cn } from "@/utils/utils";

export const AgentAvatar = ({
  agentImage,
  className,
}: {
  agentImage?: string;
  className?: string;
}) => {
  if (agentImage) {
    // Use the custom avatar with gradient
    return (
      <div className={className}>
        <AvatarPreview avatarId={agentImage} size="sm" />
      </div>
    );
  }

  // Fallback to ChatBubbleAvatar for agents without custom image
  return (
    <ChatBubbleAvatar
      role="assistant"
      className={cn(
        "border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 rounded-full",
        className
      )}
    />
  );
};
