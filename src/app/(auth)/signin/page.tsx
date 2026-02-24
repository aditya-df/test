// pages/signin.js

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { env } from "@/env.mjs";

import { DEFAULT_SIGNIN_REDIRECT } from "@/config/defaults";
import { getThemeColors } from "@/utils/theme-colors";
import { cn } from "@/utils/utils";
import { getUserOnboardingStatus } from "@/services/onboarding";
import { authMethods, getAuthSession } from "@/utils/auth-utils-server";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OAuthButtons } from "../../../features/auth/components/oauth-buttons";
import { SignInWithEmailForm } from "../../../features/auth/components/forms/signin-with-email-form";
import { SignInWithPasswordForm } from "../../../features/auth/components/forms/signin-with-password-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: "Sign In",
  description: "Sign in to your account",
};

export default async function SignInPage(): Promise<React.ReactElement> {
  const session = await getAuthSession();
  const themeColors = getThemeColors();

  if (session) {
    // Check onboarding status to prevent redirect loop
    const { hasOnboarded, hasVerify } = await getUserOnboardingStatus(
      session.user.email ?? "",
    );

    // If onboarded but not verified, show pending verification message
    if (hasOnboarded && !hasVerify) {
      return (
        <Card
          className={cn(
            "max-sm:flex max-sm:w-full max-sm:flex-col items-center justify-center max-sm:rounded-none sm:min-w-[370px] sm:max-w-[368px] shadow-none border-none",
            process.env.NEXT_PUBLIC_BAZNAS_THEME == "true"
              ? "bg-[#ecfff6] dark:bg-gray-900"
              : "bg-white dark:bg-gray-900",
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-x-2">
              <div className="space-y-1">
                <CardTitle className="text-2xl">Verification Pending</CardTitle>
                <CardDescription>
                  Your account is awaiting admin verification
                </CardDescription>
              </div>
              <ThemeToggle />
            </div>
          </CardHeader>
          <CardContent className="max-sm:w-full max-sm:max-w-[340px] max-sm:px-10">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground">
                Thank you for completing your registration. Your account is
                currently under review by our admin team.
              </p>
              <p className="text-sm text-muted-foreground">
                You will receive an email notification once your account has
                been verified.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // If user hasn't completed onboarding, send to onboarding
    if (!hasOnboarded) {
      redirect(DEFAULT_SIGNIN_REDIRECT);
    }

    // User is fully verified and onboarded - redirect based on role
    const isAdmin =
      session.user.roles?.includes("admin") ||
      session.user.roles?.includes("superadmin");
    if (isAdmin) {
      redirect("/dashboard");
    }

    // Regular users - find their latest agent and redirect to chatbot
    // const userOrganizations = await prisma.userOnOrganization.findMany({
    //   where: { userId: session.user.id },
    //   select: { organizationId: true },
    // });

    // const organizationIds = userOrganizations.map((org) => org.organizationId);

    // const latestAgent = await prisma.agent.findFirst({
    //   where: {
    //     AND: [
    //       {
    //         user: {
    //           organization: {
    //             some: {
    //               organizationId: {
    //                 in: organizationIds,
    //               },
    //             },
    //           },
    //         },
    //       },
    //       {
    //         OR: [
    //           {
    //             AND: [
    //               { userId: session.user.id },
    //               {
    //                 OR: [
    //                   { visibilityType: "PRIVATE" },
    //                   { visibilityType: null },
    //                 ],
    //               },
    //             ],
    //           },
    //           { visibilityType: "PUBLIC" },
    //           {
    //             AND: [
    //               {
    //                 users: {
    //                   some: {
    //                     userId: session.user.id,
    //                   },
    //                 },
    //               },
    //               { visibilityType: "ORGANIZATION" },
    //             ],
    //           },
    //         ],
    //       },
    //     ],
    //   },
    //   orderBy: {
    //     createdAt: "desc",
    //   },
    //   select: {
    //     id: true,
    //     agentName: true,
    //   },
    // });

    // if (latestAgent) {
    //   redirect(
    //     `/chatbot?agentId=${latestAgent.id}&selectedAgentNameProps=${encodeURIComponent(latestAgent.agentName)}`,
    //   );
    // }

    redirect("/chatbot");
  }

  return (
    <Card
      className={cn(
        "max-sm:flex max-sm:w-full max-sm:flex-col items-center justify-center max-sm:rounded-none sm:min-w-[370px] sm:max-w-[368px] shadow-none border-none",
        process.env.NEXT_PUBLIC_BAZNAS_THEME == "true"
          ? "bg-[#ecfff6] dark:bg-gray-900"
          : "bg-white dark:bg-gray-900",
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-x-2">
          <div className="space-y-1">
            <CardTitle className="text-2xl">Welcome to Knowgen</CardTitle>
            <CardDescription>Log in to access your agent</CardDescription>
          </div>
          <ThemeToggle />
        </div>
      </CardHeader>
      <CardContent className="max-sm:w-full max-sm:max-w-[340px] max-sm:px-10">
        <OAuthButtons authMethods={authMethods} />
        {authMethods.magicLink && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative mb-3 mt-6 flex justify-center text-xs uppercase">
                <span className="bg-background px-2">
                  {(authMethods.github || authMethods.google) && "Or"} continue
                  with magic link
                </span>
              </div>
            </div>

            <SignInWithEmailForm />
          </>
        )}
        {authMethods.password && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative mb-3 mt-6 flex justify-center text-xs uppercase">
                <span className="bg-background px-2">
                  {(authMethods.magicLink ||
                    authMethods.google ||
                    authMethods.github) &&
                    "Or"}{" "}
                  continue with password
                </span>
              </div>
            </div>

            <SignInWithPasswordForm useRecaptcha={env.USING_RECAPTCHA} />
          </>
        )}
      </CardContent>

      {authMethods.password && (
        <CardFooter className="grid w-full text-sm text-muted-foreground max-sm:max-w-[340px] max-sm:px-10">
          <div className="hidden">
            <span>Don&apos;t have an account? </span>
            <Link
              aria-label="Sign up"
              href="/signup"
              className={`font-bold tracking-wide ${themeColors.textPrimary} underline-offset-4 transition-colors hover:underline`}
            >
              Sign up
              <span className="sr-only">Sign up</span>
            </Link>
            .
          </div>
          <div>
            <span>Forgot your password? </span>
            <Link
              aria-label="Reset password"
              href="/signin/password-reset"
              className={`text-sm font-normal ${themeColors.textPrimary} underline-offset-4 transition-colors hover:underline`}
            >
              Reset now
              <span className="sr-only">Reset Password</span>
            </Link>
            .
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
