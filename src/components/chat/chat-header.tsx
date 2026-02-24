"use client";

import { memo } from "react";
import { Plus } from "lucide-react";
import { Button } from "../ui/button";
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
} from "../ui/alert-dialog";
import { cn } from "@/utils/utils";
import { AgentAvatar } from "./agent-avatar";

interface ChatHeaderProps {
  agentImage?: string;
  selectedAgentName: string;
  isOnline: boolean;
  streamStarted: boolean;
  isCreatingNewChat: boolean;
  selectedModelId: string;
  onNewChat: () => void;
}

const getStatusText = (
  isCreatingNewChat: boolean,
  streamStarted: boolean
): string => {
  if (isCreatingNewChat) {
    return "Starting new conversation...";
  }
  if (streamStarted) {
    return "Typing...";
  }
  return "Online";
};

const getStatusColor = (
  streamStarted: boolean
): string => {
  if (streamStarted) {
    return "text-green-500 dark:text-green-400";
  }
  return "text-gray-500 dark:text-gray-400";
};

export const ChatHeader = memo(({
  agentImage,
  selectedAgentName,
  isOnline,
  streamStarted,
  isCreatingNewChat,
  selectedModelId,
  onNewChat,
}: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-t-lg">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <AgentAvatar agentImage={agentImage} className="w-8 h-8" />
        </div>
        <div>
          <h4 className="text-base md:text-lg font-medium text-gray-800 dark:text-gray-200">
            {selectedAgentName}
          </h4>

          <div className="flex items-center space-x-1">
            <p
              className={cn(
                "text-xs",
                getStatusColor(streamStarted)
              )}
            >
              {getStatusText(isCreatingNewChat, streamStarted)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "px-2 py-1 text-xs flex items-center",
                  "md:bg-transparent md:border md:border-input"
                )}
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
                <AlertDialogAction onClick={onNewChat}>
                  Start New Chat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
          {selectedModelId.split("-")[0]}
        </div>
      </div>
    </div>
  );
});

ChatHeader.displayName = "ChatHeader";
