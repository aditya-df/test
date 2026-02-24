import { auth } from "@/auth.config";
import { redirect } from "next/navigation";
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/config/defaults";
import { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { env } from "@/env.mjs";

/**
 * Server-side authentication utilities
 */

/**
 * Checks if the user is authenticated and redirects to the login page if not.
 * This function is meant to be used in server components.
 *
 * @returns The authenticated session if the user is logged in
 */
export async function requireAuth() {
  const session = await auth();

  if (!session?.user) {
    redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);
  }

  return session;
}

/**
 * Checks if the user is authenticated without redirecting.
 * This function is meant to be used in server components.
 *
 * @returns The session object or null if not authenticated
 */
export async function getAuthSession() {
  return await auth();
}

/**
 * Checks if the user has specific roles.
 * This function is meant to be used after requireAuth.
 *
 * @param session The authenticated session
 * @param roles Array of roles to check against
 * @param redirectPath Optional path to redirect if role check fails
 * @returns True if the user has any of the specified roles
 */
export function checkUserRole(
  session: Session,
  roles: string[],
  redirectPath?: string
) {
  const hasRole = roles.some((role) =>
    session?.user?.roles?.includes(role as UserRole)
  );

  if (!hasRole && redirectPath) {
    redirect(redirectPath);
  }

  return hasRole;
}

export interface AuthMethods {
  google: boolean;
  github: boolean;
  magicLink: boolean;
  password: boolean;
}
export const authMethods: AuthMethods = {
  google: env.LOGIN_WITH_GOOGLE === "true",
  github: env.LOGIN_WITH_GITHUB === "true",
  magicLink: env.LOGIN_WITH_MAGICLINK === "true",
  password: env.LOGIN_WITH_EMAIL === "true",
};
