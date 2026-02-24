"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { Icons } from "@/components/icons";
import { Button } from "../ui/button";

export const LinkGoogleAccount = ({ className, redirect }: any) => {
  const [isLinking, setIsLinking] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const handleLink = async () => {
    try {
      if (session?.user?.provider === "google") {
        toast({
          title: "Error",
          description: "You are already signed in with a Google account",
          variant: "destructive",
        });
        return;
      }

      if (redirect) {
        sessionStorage.setItem("redirectPage", window.location.pathname);
      }
      setIsLinking(true);
      await signIn("google", {
        redirect: true,
        callbackUrl: `${window.location.href}?linking=true`,
        error: `${window.location.href}?linking=true`,
      });
      toast({
        title: "Success",
        description: "Successfully linked Google account",
      });
    } catch (error) {
      setIsLinking(false);
      toast({
        title: "Error",
        description: "Failed to initiate Google login : " + error,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const isLinking = searchParams.get("linking");

    if (!isLinking) return;

    if (error) {
      let description = "Failed to link account";

      // Handle specific error cases
      if (error === "OAuthAccountNotLinked") {
        description = "This Google account is already linked to another user";
      } else if (error === "AuthorizedCallbackError") {
        description =
          "This Google account is already associated with an existing account";
      } else if (errorDescription) {
        description = errorDescription;
      }

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Google account linked successfully",
      });
    }

    setIsLinking(false);
    router.replace(window.location.pathname);
  }, [searchParams, router]);

  return (
    <Button
      variant={"ghost"}
      onClick={handleLink}
      disabled={isLinking}
      className={className || "p-0 h-fit font-normal"}
    >
      <Icons.GoogleIcon className="w-4 h-4 mr-3 text-muted-foreground dark:fill-white" />
      {isLinking ? "Linking..." : "Link Google Account"}
    </Button>
  );
};
