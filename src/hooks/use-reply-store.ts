"use client";

import { ReplyData } from '@/types';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ReplyStore {
    replyingTo: ReplyData | null;
    setReplyingTo: (reply: ReplyData | null) => void;
    clearReply: () => void;
    isReplying: boolean;
}

export const useReplyStore = create<ReplyStore>()(
    devtools(
        (set) => ({
            replyingTo: null,
            isReplying: false,

            setReplyingTo: (reply: ReplyData | null) =>
                set({
                    replyingTo: reply,
                    isReplying: reply !== null
                }),

            clearReply: () =>
                set({
                    replyingTo: null,
                    isReplying: false
                }),
        }),
        { name: 'reply-store' }
    )
);

// Convenience hook with computed values
export const useReply = () => {
    const store = useReplyStore();
    return {
        ...store,
        replyingToUser: store.replyingTo?.role === 'user',
        hasReply: store.replyingTo !== null,
    };
};