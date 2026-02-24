import NextAuth from "next-auth";
import { linkOAuthAccount } from "@/services/auth";
import { getUserById } from "@/services/user";
// import { env } from "@/env.mjs";
import authConfig from "@/config/auth";
import { createPrismaAdapterWrapper } from "@/lib/prisma-adapter-wrapper";
import { UserRole, acl } from "@prisma/client";
import {
  createUserSession,
  removeUserSession,
  cleanupExpiredSessions,
} from "@/utils/session-tracker";
import { prisma } from "@/config/db";
import { createAuditLog, AuditAction } from "@/lib/audit-log";
import apiClient from "./lib/apiClient";

async function logAuditEvent(
  action: AuditAction, // ← Required parameter comes first
  userId?: string, // ← Optional parameters follow
  userEmail?: string,
  userName?: string,
  success: boolean = true,
  errorMessage?: string,
  sessionId?: string,
  additionalDetails?: any,
) {
  try {
    await createAuditLog({
      userId,
      userEmail,
      userName,
      action,
      ipAddress: "unknown", // NextAuth doesn't provide direct access to IP
      userAgent: "unknown", // NextAuth doesn't provide direct access to user agent
      sessionId,
      success,
      errorMessage,
      details: {
        source: "nextauth",
        timestamp: new Date().toISOString(),
        ...additionalDetails,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw error to avoid breaking auth flow
  }
}

// Define session types to include roles
declare module "next-auth" {
  interface User {
    email?: string | null;
    name?: string | null;
    image?: string | null;
    roles: UserRole[];
    acl: acl[];
    organizationId: string;
    provider: string;
    userType?: string;
    trialEndDate?: string;

    token?: string;
    backendToken?: string;
    backendRefreshToken?: string;
    accessToken?: string;
    refreshToken?: string;
  }
  interface Session {
    user: { id: string } & User;
    sessionToken?: string; // Add this to track our DB session
    accessToken?: string; // Add this to fix the type error
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/signin",
    signOut: "/signout",
    verifyRequest: "/signin/magic-link-signin",
    error: "/api/auth/error",
  },
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 12 * 60 * 60, // 12 hours
  },
  events: {
    async linkAccount({ user }) {
      if (user.id) await linkOAuthAccount({ userId: user.id });
    },
    // 🔧 Fixed: Handle both session and token cases with proper type checking
    async signOut(message) {
      try {
        let userId: string | undefined;
        let userEmail: string | undefined;
        let userName: string | undefined;
        let sessionToken: string | undefined;

        // Handle JWT strategy (token-based)
        if ("token" in message && message.token) {
          sessionToken = (message.token as any)?.sessionToken || undefined;
          userId = message.token.sub;
          userEmail = message.token.email as string;
          userName = message.token.name as string;

          if (sessionToken) {
            const sessionData = await removeUserSession(sessionToken);

            // Use session data if available, otherwise fall back to token data
            const logUserId = sessionData?.userId || userId;
            const logUserEmail = sessionData?.userEmail || userEmail;
            const logUserName = sessionData?.userName || userName;

            if (logUserId) {
              await logAuditEvent(
                AuditAction.LOGOUT,
                logUserId,
                logUserEmail || undefined,
                logUserName || undefined,
                true,
                undefined,
                sessionToken,
                { logoutType: "jwt" },
              );
            }
          } else if (userId) {
            // Only log if no sessionToken was processed
            await logAuditEvent(
              AuditAction.LOGOUT,
              userId,
              userEmail,
              userName,
              true,
              undefined,
              undefined, // no sessionToken available
              { logoutType: "jwt" },
            );
          }
        }
        // Handle database strategy (session-based) - for completeness
        else if ("session" in message && message.session) {
          // If you ever switch to database sessions, handle here
          console.log("Database session signout");

          if (message.session?.userId) {
            const user = await getUserById({ id: message.session.userId });
            await logAuditEvent(
              AuditAction.LOGOUT,
              user?.id,
              user?.email || undefined,
              user?.name || undefined,
              true,
              undefined,
              undefined,
              { logoutType: "database" },
            );
          }
        }
      } catch (error) {
        console.error("Error during signOut event:", error);

        try {
          await logAuditEvent(
            AuditAction.LOGOUT,
            undefined,
            undefined,
            undefined,
            false,
            `Logout error`,
            undefined,
            { errorType: "signout_event" },
          );
        } catch (logError) {
          console.error("Failed to log logout error:", logError);
        }
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // For normal sign-in
      if (!account) return true;

      // For account linking when user is already logged in
      if (account?.provider === "google") {
        const session = await auth();
        if (session) {
          try {
            const existingAccount = await apiClient.post(`api/account/check`, {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            });
            console.log("existingAccount", existingAccount);

            if (existingAccount?.data?.exists) {
              if (existingAccount.data.account.userId !== session.user.id) {
                // ADD: Log failed account linking
                await logAuditEvent(
                  AuditAction.ACCOUNT_UPDATED,
                  session.user.id,
                  session.user.email || undefined,
                  session.user.name || undefined,
                  false,
                  "Google account already linked to different user",
                  undefined,
                  {
                    attemptedProvider: account.provider,
                    attemptedAccountId: account.providerAccountId,
                  },
                );
                return "/api/auth/error?error=GoogleAccountAlreadyLinked";
              }
              return true; // Account already linked to current user
            }

            // // ✅ OPTIONAL: Add organization check for account linking if needed
            // // This ensures users linking accounts don't get added to root org unnecessarily
            // const existingUserOrganization = await prisma.userOnOrganization.findFirst({
            //   where: {
            //     userId: session.user.id,
            //   },
            // });

            // if (!existingUserOrganization) {
            //   console.log(`User ${session.user.id} linking account has no organization - organization assignment handled elsewhere`);
            // }

            // Link the account
            await prisma.account.create({
              data: {
                userId: session.user.id,
                type: "oauth",
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              },
            });

            await logAuditEvent(
              AuditAction.ACCOUNT_UPDATED,
              session.user.id,
              session.user.email || undefined,
              session.user.name || undefined,
              true,
              undefined,
              undefined,
              {
                linkedProvider: account.provider,
                linkedAccountId: account.providerAccountId,
              },
            );

            return true;
          } catch (error) {
            console.error("Error linking account:", error);

            const session = await auth();
            if (session?.user) {
              await logAuditEvent(
                AuditAction.ACCOUNT_UPDATED,
                session.user.id,
                session.user.email || undefined,
                session.user.name || undefined,
                false,
                `Account linking error`,
                undefined,
                { provider: account.provider, errorType: "linking_exception" },
              );
            }

            return false;
          }
        }
      }

      // For regular OAuth sign in
      if (account?.provider !== "credentials") {
        // ADD: Log OAuth login attempt
        if (user.email) {
          await logAuditEvent(
            AuditAction.LOGIN,
            user.id,
            user.email,
            user.name || undefined,
            true,
            undefined,
            undefined,
            { provider: account.provider, loginType: "oauth" },
          );
        }
        return true;
      }

      // For credentials sign in
      if (!user.id) {
        // ADD: Log failed credentials login (no user ID)
        await logAuditEvent(
          AuditAction.LOGIN_FAILED,
          undefined,
          user.email || undefined,
          user.name || undefined,
          false,
          "No user ID provided",
          undefined,
          { provider: "credentials", errorType: "no_user_id" },
        );
        return false;
      }

      const existingUser = await getUserById({ id: user.id });
      if (!existingUser || !existingUser.emailVerified) {
        // ADD: Log failed credentials login (user not found or not verified)
        await logAuditEvent(
          AuditAction.LOGIN_FAILED,
          user.id,
          user.email || undefined,
          user.name || undefined,
          false,
          !existingUser ? "User not found" : "Email not verified",
          undefined,
          {
            provider: "credentials",
            errorType: !existingUser ? "user_not_found" : "email_not_verified",
            userId: user.id,
          },
        );
        return false;
      }

      // ADD: Check if trial user is expired
      if (existingUser.userType === "TRIAL" && existingUser.trialEndDate) {
        if (existingUser.trialEndDate < new Date()) {
          // ADD: Log failed login due to expired trial
          await logAuditEvent(
            AuditAction.LOGIN_FAILED,
            user.id,
            user.email || undefined,
            user.name || undefined,
            false,
            "Trial period has expired",
            undefined,
            {
              provider: "credentials",
              errorType: "trial_expired",
              trialEndDate: existingUser.trialEndDate.toISOString(),
            },
          );
          throw new Error("Trial period has expired");
        }
      }

      await logAuditEvent(
        AuditAction.LOGIN,
        user.id,
        user.email || undefined,
        user.name || undefined,
        true,
        undefined,
        undefined,
        {
          provider: "credentials",
          loginType: "credentials",
          userType: existingUser.userType,
        },
      );

      return true;
    },
    async jwt({ token, user, account }) {
      // Add user roles to the token when it's first created
      if (user?.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            role: true,
            userType: true,
            trialEndDate: true,
          },
        });
        token.roles = dbUser?.role || [UserRole.user];
        token.userType = dbUser?.userType;
        token.trialEndDate = dbUser?.trialEndDate?.toISOString();

        await cleanupExpiredSessions();

        // 🆕 Create database session when user signs in
        const sessionToken = await createUserSession(user.id);
        if (sessionToken) {
          token.sessionToken = sessionToken;
        }

        // 🆕 ADD: Link to root organization only for OAuth users without existing organization
        // This handles Google OAuth users who aren't trial users or invited users
        // if (account?.provider === "google") {
        //   // ✅ FIXED: Always check if user already has an organization first
        //   const existingUserOrganization = await prisma.userOnOrganization.findFirst({
        //     where: {
        //       userId: user.id,
        //     },
        //   });

        //   // Only link to root organization if user has NO organization yet
        //   if (!existingUserOrganization) {
        //     const rootOrganization = await prisma.organization.findFirst({
        //       where: {
        //         isRoot: true,
        //       },
        //     });

        //     if (rootOrganization) {
        //       await prisma.userOnOrganization.create({
        //         data: {
        //           userId: user.id,
        //           organizationId: rootOrganization.id,
        //         },
        //       });
        //       console.log(`OAuth user ${user.id} linked to root organization ${rootOrganization.id}`);
        //     } else {
        //       console.warn('No root organization found for OAuth user');
        //     }
        //   } else {
        //     console.log(`OAuth user ${user.id} already has organization, skipping root organization link`);
        //   }
        // }

        if (account) {
          token.accessToken = account.access_token;
        }
        token.provider = account?.provider;

        if (account?.provider === "google") {
          try {
            const result = await fetch(
              `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/user/login-session`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: user.email,
                  session_token: sessionToken,
                }),
                signal: AbortSignal.timeout(10000), // 10 second timeout
              },
            );

            if (result.ok) {
              const data = await result.json();
              user.accessToken = data.access_token;
              user.refreshToken = data.refresh_token;
              console.log(
                "JWT callback: Backend tokens obtained for Google OAuth user",
              );
              console.log(
                "JWT callback: Backend tokens obtained for Google OAuth user",
              );
            } else {
              console.error(
                "JWT callback: Failed to get backend tokens:",
                result.status,
                result.statusText,
              );

              await logAuditEvent(
                AuditAction.LOGIN_FAILED,
                user.id,
                user.email || undefined,
                user.name || undefined,
                false,
                `Backend token request failed: ${result.status}`,
                sessionToken || undefined,
                {
                  provider: "google",
                  errorType: "backend_token_failure",
                  httpStatus: result.status,
                },
              );
            }
          } catch (error) {
            console.error(
              "JWT callback: Error getting backend tokens for Google user:",
              error,
            );

            await logAuditEvent(
              AuditAction.LOGIN_FAILED,
              user.id,
              user.email || undefined,
              user.name || undefined,
              false,
              `Backend token error`,
              sessionToken || undefined,
              {
                provider: "google",
                errorType: "backend_token_exception",
                errorMessage:
                  error instanceof Error ? error.message : String(error),
              },
            );
          }
        }
      }

      if (user?.accessToken) {
        token.access_token = user.accessToken;
      }
      if (user?.refreshToken) {
        token.refresh_token = user.refreshToken;
      }

      // Ensure tokens persist across JWT renewals
      // This is crucial for production environments where session callback might fail
      if (!token.access_token && token.sub) {
        console.log(
          "JWT callback: No access token found, this might cause 401 errors in production",
        );
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.sub) {
        const existingUser = await getUserById({ id: token.sub });
        if (existingUser) {
          const userOrg = await prisma.user.findUnique({
            where: {
              id: existingUser.id,
            },
            include: { organization: true },
          });

          // Add the user ID and roles to the session
          session.user.id = existingUser.id;
          session.user.roles = existingUser.role || [UserRole.user];
          session.user.userType = token.userType as string;
          session.user.trialEndDate = token.trialEndDate as string;

          const acl = await prisma.acl.findMany({
            select: {
              id: true,
              menuType: true,
              role: true,
              create: true,
              update: true,
              delete: true,
              read: true,
              createdAt: true,
              updatedAt: true,
            },
            where: {
              role: {
                in: existingUser.role || [UserRole.user],
              },
            },
            orderBy: [
              {
                createdAt: "asc",
              },
            ],
          });

          session.user = {
            ...session.user,
            acl: acl,
            organizationId: userOrg?.organization[0]?.organizationId ?? "",
            provider: (token.provider as string) || "unknown",
          };

          // Add session token to session for tracking
          session.sessionToken = token.sessionToken as string;
          session.accessToken = token.accessToken as string;
        }
      }

      // Handle backend tokens with improved error handling and fallback
      if (session.user.id) {
        try {
          // For users with tokens (both Google and credentials), validate and refresh if needed
          if (
            typeof token.access_token === "string" &&
            typeof token.refresh_token === "string"
          ) {
            try {
              const resultCheck = await fetch(
                `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/user/check-token`,
                {
                  headers: {
                    Authorization: `Bearer ${token.access_token}`,
                  },
                  // Add timeout for production environments
                  signal: AbortSignal.timeout(10000), // 10 second timeout
                },
              );

              // console.log(
              //   "Token check result:",
              //   resultCheck.status,
              //   resultCheck.ok
              // );

              if (resultCheck.ok) {
                session.user.backendToken = token.access_token as string;
                session.user.backendRefreshToken =
                  token.refresh_token as string;
                // console.log(
                //   "Backend tokens set successfully from existing tokens"
                // );
              } else {
                // Refresh token logic
                console.log("Token expired, attempting refresh...");
                try {
                  const resultRefresh = await fetch(
                    `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/user/refresh-token`,
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token.refresh_token}`,
                      },
                      signal: AbortSignal.timeout(10000), // 10 second timeout
                    },
                  );

                  if (resultRefresh.ok) {
                    const dataRefresh = await resultRefresh.json();
                    console.log("Token refreshed successfully");
                    session.user.backendToken =
                      dataRefresh.access_token as string;
                    session.user.backendRefreshToken =
                      dataRefresh.refresh_token as string;

                    // Update token in JWT for next session callback
                    token.access_token = dataRefresh.access_token;
                    token.refresh_token = dataRefresh.refresh_token;
                  } else {
                    console.error(
                      "Token refresh failed:",
                      resultRefresh.status,
                      resultRefresh.statusText,
                    );
                  }
                } catch (refreshError) {
                  console.error("Error during token refresh:", refreshError);
                }
              }
            } catch (tokenCheckError) {
              console.error("Error during token check:", tokenCheckError);
              // Fallback: use existing tokens if check fails due to network issues
              if (token.access_token && token.refresh_token) {
                console.log(
                  "Using existing tokens as fallback due to network error",
                );
                session.user.backendToken = token.access_token as string;
                session.user.backendRefreshToken =
                  token.refresh_token as string;
              }
            }
          }

          // For Google OAuth users without tokens or as additional fallback
          if (
            token.provider === "google" &&
            (!session.user.backendToken || !session.user.backendRefreshToken)
          ) {
            console.log("Attempting to get tokens for Google OAuth user...");
            try {
              const result = await fetch(
                `${process.env.NEXT_PUBLIC_AUTH_SERVICE_URL}/user/login-session`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    email: session.user.email,
                    session_token: token.sessionToken,
                  }),
                  signal: AbortSignal.timeout(10000), // 10 second timeout
                },
              );

              if (result.ok) {
                const data = await result.json();
                session.user.backendToken = data.access_token;
                session.user.backendRefreshToken = data.refresh_token;

                // Store in token for persistence
                token.access_token = data.access_token;
                token.refresh_token = data.refresh_token;

                console.log("Backend tokens obtained for Google OAuth user");
              } else {
                console.error(
                  "Failed to get backend tokens for Google user:",
                  result.status,
                  result.statusText,
                );
              }
            } catch (error) {
              console.error(
                "Error getting backend tokens for Google user:",
                error,
              );
            }
          }
        } catch (generalError) {
          console.error(
            "General error in backend token handling:",
            generalError,
          );
          // Last resort fallback: use any existing tokens from JWT
          if (
            token.access_token &&
            token.refresh_token &&
            !session.user.backendToken
          ) {
            console.log("Using JWT tokens as last resort fallback");
            session.user.backendToken = token.access_token as string;
            session.user.backendRefreshToken = token.refresh_token as string;
          }
        }
      }

      return session;
    },
  },
  adapter: createPrismaAdapterWrapper(),
  ...authConfig,
});
