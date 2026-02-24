"use client";

import { Reply } from "lucide-react";
import { cn } from "@/utils/utils";
import { ReplyData } from "@/types";

interface ReplyBadgeProps {
    replyTo: ReplyData;
    onClick?: () => void;
}

export const ReplyBadge = ({ replyTo, onClick }: ReplyBadgeProps) => {
    const isReplyingToUser = replyTo.role === "user";

    const truncateContent = (text: string, maxLength: number = 40) => {
        return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    };

    return (
        <div
            className={cn(
                "flex items-start gap-2 p-2 mb-2 bg-gray-100 dark:bg-zinc-700/50 rounded-lg border-l-2",
                isReplyingToUser ? "border-l-green-500" : "border-l-blue-500",
                onClick && "cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-600/50 transition-colors"
            )}
            onClick={onClick}
        >
            <Reply size={14} className={cn(
                "mt-0.5 flex-shrink-0",
                isReplyingToUser ? "text-green-500" : "text-blue-500"
            )} />
            <div className="min-w-0 flex-1">
                <div className="text-xs font-medium mb-1">
                    <span className={cn(
                        isReplyingToUser ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"
                    )}>
                        {isReplyingToUser ? "You" : "Assistant"}
                    </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {truncateContent(replyTo.content)}
                </p>
            </div>
        </div>
    );
};
