import { getSession } from "next-auth/react";
import { auth } from "@/auth.config";
import { User } from "next-auth";

/**
 * NextAuth Token Management Utility
 * Provides secure token retrieval for both client and server-side operations
 */
class NextAuthToken {
  /**
   * Get access token from NextAuth session (client-side)
   * @returns Promise<string | null> - The access token or null if not available
   */
  public async getClientToken(): Promise<string | null> {
    try {
      const session = await getSession();

      if (session?.accessToken) {
        return session.accessToken as string;
      }

      // Fallback to user's backendToken if available
      if (session?.user && "backendToken" in session.user) {
        return (session.user as any).backendToken;
      }

      return null;
    } catch (error) {
      console.error("Error retrieving client token:", error);
      return null;
    }
  }

  /**
   * Get access token from NextAuth session (server-side)
   * @returns Promise<string | null> - The access token or null if not available
   */
  public async getServerToken(): Promise<string | null> {
    try {
      const session = await auth();

      if (session?.accessToken) {
        return session.accessToken as string;
      }

      // Fallback to user's backendToken if available
      if (session?.user && "backendToken" in session.user) {
        return (session.user as any).backendToken;
      }

      return null;
    } catch (error) {
      console.error("Error retrieving server token:", error);
      return null;
    }
  }

  /**
   * Get token with automatic client/server detection
   * @returns Promise<string | null> - The access token or null if not available
   */
  public async getToken(): Promise<string | null> {
    // Check if we're on the client side
    if (typeof window !== "undefined") {
      return this.getClientToken();
    } else {
      return this.getServerToken();
    }
  }

  /**
   * Check if user is authenticated
   * @returns Promise<boolean> - True if user has a valid session
   */
  public async isAuthenticated(): Promise<boolean> {
    try {
      if (typeof window !== "undefined") {
        const session = await getSession();
        return !!session?.user;
      } else {
        const session = await auth();
        return !!session?.user;
      }
    } catch (error) {
      console.error("Error checking authentication status:", error);
      return false;
    }
  }

  /**
   * Get user information from session
   * @returns Promise<any | null> - User object or null if not available
   */
  public async getUser(): Promise<User | null> {
    try {
      if (typeof window !== "undefined") {
        const session = await getSession();
        return session?.user || null;
      } else {
        const session = await auth();
        return session?.user || null;
      }
    } catch (error) {
      console.error("Error retrieving user information:", error);
      return null;
    }
  }
}

const nextAuthToken = new NextAuthToken();
export default nextAuthToken;
