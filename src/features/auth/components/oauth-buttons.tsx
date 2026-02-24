"use client";

import * as React from "react";
import { signIn } from "next-auth/react";

import { DEFAULT_SIGNIN_REDIRECT } from "@/config/defaults";
import { useToast } from "@/hooks/use-toast";
import { AuthMethods } from "@/utils/auth-utils-server";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Spinner } from "@/components/spinner";

export function OAuthButtons({
  authMethods,
}: {
  authMethods: AuthMethods;
}): React.ReactElement {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<{
    google: boolean;
    github: boolean;
  }>({
    google: false,
    github: false,
  });

  async function handleOAuthSignIn(
    provider: "google" | "github",
  ): Promise<void> {
    try {
      // Set loading state for the specific provider
      setIsLoading((prev) => ({ ...prev, [provider]: true }));

      await signIn(provider, {
        callbackUrl: DEFAULT_SIGNIN_REDIRECT,
      });

      toast({
        title: "Success!",
        description: "You are now signed in",
      });
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again",
        variant: "destructive",
      });

      console.error(error);
      throw new Error(`Error signing in with ${provider}`);
    } finally {
      // Reset loading state
      setIsLoading((prev) => ({ ...prev, [provider]: false }));
    }
  }

  return (
    <div className="flex flex-wrap sm:gap-4">
      {authMethods.google && (
        <Button
          aria-label="Sign in with Google"
          variant="outline"
          onClick={() => void handleOAuthSignIn("google")}
          className="w-full sm:w-auto grow bg-white dark:bg-transparent"
          disabled={isLoading.google || isLoading.github}
        >
          {isLoading.google ? (
            <div className="flex items-center">
              <Spinner size="sm" className="mr-2" />
              <span>Signing in...</span>
            </div>
          ) : (
            <>
              <Icons.google className="mr-2 size-4" />
              Google
            </>
          )}
        </Button>
      )}

      {authMethods.github && (
        <>
          <Button
            aria-label="Sign in with gitHub"
            variant="outline"
            onClick={() => void handleOAuthSignIn("github")}
            className="w-full sm:w-auto grow bg-white dark:bg-transparent"
            disabled={isLoading.google || isLoading.github}
          >
            {isLoading.github ? (
              <div className="flex items-center">
                <Spinner size="sm" className="mr-2" />
                <span>Signing in...</span>
              </div>
            ) : (
              <>
                <Icons.gitHub className="mr-2 size-4" />
                GitHub
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
