"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon, TrashIcon } from "./icons";
import { cn } from "@/utils/utils";
import { ParsedChat } from "@/types";

// src\components\chat\chat-list.tsx
interface ChatListProps {
  chats: ParsedChat[];
  currentChatId?: string;
  onSelectChat: (id: string) => void;
  setDeleteId: (id: string) => void;
  setShowDeleteDialog: (show: boolean) => void;
}

export const ChatList = ({
  chats,
  currentChatId,
  onSelectChat,
  setDeleteId,
  setShowDeleteDialog
}: ChatListProps) => {

  const getChatTitle = (chat: ParsedChat): string => {
    const firstUserMessage = chat.messages.find((message) => message.role === 'user');
    const content = firstUserMessage?.content;
    if (!content) return 'New Chat';
    
    // Split into words and rejoin until we reach roughly 20 characters
    const words = content.split(' ');
    let title = '';
    let i = 0;
    
    while (i < words.length && (title + words[i]).length <= 20) {
      title += (i === 0 ? '' : ' ') + words[i];
      i++;
    }
    
    return title + (i < words.length ? '...' : '');
  };

  return (
    <>
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={cn(
            "flex flex-row items-center gap-6 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md pr-2",
            { "bg-zinc-200 dark:bg-zinc-700": chat.id === currentChatId }
          )}
        >
          <Button
            variant="ghost"
            className="hover:bg-zinc-200 dark:hover:bg-zinc-700 justify-between p-0 text-sm font-normal flex flex-row items-center gap-2 pr-2 w-full transition-none"
            onClick={() => 
              onSelectChat(chat.id)
            }
          >
            <span className="text-ellipsis overflow-hidden text-left py-2 pl-2 rounded-lg outline-zinc-900">
              {getChatTitle(chat)}
            </span>
          </Button>

          <DropdownMenu modal={true}>
            <DropdownMenuTrigger asChild>
              <Button
                className="p-0 h-fit font-normal text-zinc-500 transition-none hover:bg-zinc-200 dark:hover:bg-zinc-700"
                variant="ghost"
              >
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="left" className="z-[60]">
              <DropdownMenuItem asChild>
                <Button
                  className="flex flex-row gap-2 items-center justify-start w-full h-fit font-normal p-1.5 rounded-sm"
                  variant="ghost"
                  onClick={() => {
                    setDeleteId(chat.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <TrashIcon />
                  <div>Delete</div>
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </>
  );
};
