import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/config/defaults";
import { create } from "zustand";
import { getSession, signOut } from "next-auth/react";
import React from "react";
import { Session } from "next-auth";
import { acl, MenuType, UserRole } from "@prisma/client";

/**
 * Client-side authentication utilities using Zustand
 */

interface AuthState {
  // Session state
  isLoaded: boolean;
  isLoading: boolean;
  session: Session | null;
  error: Error | null;

  // Actions
  checkSession: () => Promise<void>;
  logout: (redirectUrl?: string) => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  hasPermission: (menuType: string) => boolean;

  // Reset state
  resetAuthState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoaded: false,
  isLoading: false,
  session: null,
  error: null,

  checkSession: async () => {
    try {
      set({ isLoading: true, error: null });
      const session = await getSession();
      set({
        isLoaded: true,
        isLoading: false,
        session,
      });
    } catch (error) {
      set({
        isLoading: false,
        isLoaded: true,
        error:
          error instanceof Error ? error : new Error("Failed to load session"),
      });
    }
  },

  logout: async (redirectUrl = DEFAULT_UNAUTHENTICATED_REDIRECT) => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("pendingKnowledgeCreation");
        
        // Logout from WhatsApp before signing out
        // try {
        //   await fetch('/api/whatsapp/logout', {
        //     method: 'POST',
        //   });
        //   console.log('Successfully logged out from WhatsApp');
        // } catch (whatsappError) {
        //   console.error('Error logging out from WhatsApp:', whatsappError);
        //   // Continue with app logout even if WhatsApp logout fails
        // }
      }
      
      await signOut({
        callbackUrl: redirectUrl,
        redirect: true,
      });
      set({ session: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error("Failed to sign out"),
      });
    }
  },

  hasRole: (roles: string[]) => {
    const { session } = get();
    if (!session?.user?.roles) return false;

    return roles.some((role) => session.user.roles.includes(role as UserRole));
  },

  hasPermission: (menuType: string) => {
    const { session } = get();
    if (!session?.user?.acl) return false;

    const menuTypes = session.user.acl
      .map((item: acl) => item.menuType)
      .filter((type) => type !== null);

    return menuTypes.includes(menuType as MenuType);
  },
  resetAuthState: () => {
    set({
      isLoaded: false,
      isLoading: false,
      session: null,
      error: null,
    });
  },
}));
/** * React hook for using auth state in components
 */
export function useAuth() {
  const {
    isLoaded,
    isLoading,
    session,
    error,
    checkSession,
    logout,
    hasRole,
    hasPermission,
  } = useAuthStore();

  // Auto-load session when hook is used
  React.useEffect(() => {
    if (!isLoaded && !isLoading) {
      checkSession();
    }
  }, [isLoaded, isLoading, checkSession]);

  return {
    isLoaded,
    isLoading,
    session,
    error,
    isAuthenticated: !!session?.user,
    user: session?.user,
    checkSession,
    logout,
    hasRole,
    hasPermission,
  };
}
