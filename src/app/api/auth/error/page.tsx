"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorMessages } from "@/utils/get-error-message";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const router = useRouter();

  const errorMessage = errorMessages[error ?? "default"];

  if (typeof window !== "undefined") {
    const redirectPage = sessionStorage.getItem("redirectPage");
    if (redirectPage) {
      router.push(redirectPage + "?error=" + error);
      return;
    }
  }

  return (
    <Alert variant="destructive" className="max-w-md">
      <AlertTitle>Authentication Error</AlertTitle>
      <AlertDescription>{errorMessage}</AlertDescription>
    </Alert>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="container flex items-center justify-center min-h-screen">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
}
