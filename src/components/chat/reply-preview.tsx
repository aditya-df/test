"use client";

import { X, Reply } from "lucide-react";
import { cn } from "@/utils/utils";
import { useReply } from "@/hooks/use-reply-store";

export const ReplyPreview = () => {
    const { replyingTo, clearReply, replyingToUser } = useReply();

    if (!replyingTo) return null;

    const truncateContent = (text: string, maxLength: number = 60) => {
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    return (
        <div className="bg-gray-50 dark:bg-zinc-800 border-l-4 border-blue-500 p-3 mx-3 mb-2 rounded-r-lg">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Reply size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                                "text-sm font-medium",
                                replyingToUser ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"
                            )}>
                                {replyingToUser ? "You" : (replyingTo.senderName || "Assistant")}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                            {truncateContent(replyingTo.content)}
                        </p>
                    </div>
                </div>
                <button
                    onClick={clearReply}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};