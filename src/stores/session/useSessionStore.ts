import { create } from 'zustand';
import { getSession } from 'next-auth/react';

interface SessionState {
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  checkSession: () => Promise<void>;
  resetSessionState: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  isLoaded: false,
  isLoading: false,
  error: null,
  
  checkSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const session = await getSession();
      set({ isLoaded: !!session, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error : new Error('Failed to load session') 
      });
    }
  },
  
  resetSessionState: () => {
    set({ isLoaded: false, isLoading: false, error: null });
  }
}));
