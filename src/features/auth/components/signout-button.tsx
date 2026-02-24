"use client";

import * as React from "react";
import { useAuth } from "@/utils/auth-utils-client";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Spinner } from "@/components/spinner";
import { DEFAULT_SIGNOUT_REDIRECT } from "@/config/defaults";

export function SignOutButton(): React.ReactElement {
  const { logout: Logout } = useAuth();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await Logout(DEFAULT_SIGNOUT_REDIRECT);
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // In case the redirect doesn't happen immediately
      setTimeout(() => {
        setIsLoading(false);
      }, 3000);
    }
  };

  return (
    <Button
      aria-label="Sign Out"
      variant="ghost"
      className="w-full justify-start text-sm"
      onClick={handleSignOut}
      disabled={isLoading}
    >
      {isLoading ? (
        <div className="flex items-center">
          <Spinner size="sm" className="mr-2" />
          <span>Signing out...</span>
        </div>
      ) : (
        <>
          <Icons.logout className="mr-2 size-4" aria-hidden="true" />
          Sign out
        </>
      )}
    </Button>
  );
}