import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatModeState {
  isLiveChat: boolean;
  setIsLiveChat: (isLiveChat: boolean) => void;
}

export const useChatMode = create<ChatModeState>()(
  persist(
    (set) => ({
      isLiveChat: false,
      setIsLiveChat: (isLiveChat) => set({ isLiveChat }),
    }),
    {
      name: 'chat-mode-storage',
    }
  )
);