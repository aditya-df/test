"use client";
import {
  useBroadcastOnClose,
  useCrossTabCommunication,
} from "@/hooks/use-cross-tab-communication";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [responseData, setResponseData] = useState(null);

  useEffect(() => {
    const processOAuthCallback = async () => {
      const paramsObject = Object.fromEntries(searchParams.entries());
      const { code, state, ...data } = paramsObject;
      let finalState = JSON.parse(state || "{}");

      const localState = localStorage.getItem("state");
      if (!state && localState) {
        finalState = { ...finalState, ...JSON.parse(localState) };
        // sessionStorage.removeItem("state");
        console.log(finalState);
      }

      // Only process if we have a code and haven't processed yet
      if (code && !isProcessing && !isComplete) {
        setIsProcessing(true);
        setError(null);

        try {
          const response = await fetch("/api/oauth/callback", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
              state: JSON.stringify(finalState),
              ...data,
            }),
          });

          const result = await response.json();
          if (!response.ok) {
            throw new Error(`HTTP error: ${result.error}`);
          }

          if (result.success) {
            setResponseData(result);
            setIsComplete(true);
          } else {
            throw new Error(result.error || "OAuth callback failed");
          }
        } catch (err) {
          console.error("OAuth callback error:", err);

          setIsComplete(true);
          setError(
            err instanceof Error ? err.message : "An unexpected error occurred"
          );
        } finally {
          setIsProcessing(false);
        }
      }
    };

    processOAuthCallback();
  }, [searchParams, isProcessing, isComplete]); // Dependencies ensure this only runs when needed

  // Add these hooks to replace the cross-tab communication logic
  const { getTabId } = useCrossTabCommunication();

  // Broadcast when this tab is closing - only when responseData is available
  useBroadcastOnClose(
    "CLOSING",
    {
      state: responseData || null,
      tabId: getTabId(),
    },
    [responseData]
  ); // Add responseData as dependency

  // Countdown timer effect for auto-close when authorization is complete
  useEffect(() => {
    if (isComplete && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (isComplete && countdown === 0) {
      // Close the window when countdown reaches zero
      window.close();
    }
  }, [isComplete, countdown]);

  // Render different states
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-600 mb-2">Error processing authorization:</p>
        <p className="text-sm text-gray-600">{error}</p>
        <p className="text-sm text-gray-500 mt-4">
          Please close this window and try again.
        </p>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="p-4 text-center">
        <p>Processing authorization...</p>
        <div className="mt-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="p-4 text-center">
        <p className="text-green-600 mb-2">✓ Authorization successful!</p>
        <p className="text-sm text-gray-600 mb-3">
          You can now close this window.
        </p>
        <p className="text-sm text-gray-600">
          This window will automatically close in {countdown} second
          {countdown !== 1 ? "s" : ""}.
        </p>
      </div>
    );
  }

  // No code parameter
  return (
    <div className="p-4 text-center">
      <p className="text-gray-600">No authorization code received.</p>
      <p className="text-sm text-gray-500 mt-2">Please close this window.</p>
    </div>
  );
}
