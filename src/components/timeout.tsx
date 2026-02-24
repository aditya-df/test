"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import debounce from "just-debounce-it";
import { useAuth } from "@/utils/auth-utils-client";

const DEFAULT_TIMEOUT = 600; // 10 minutes in seconds
const DEFAULT_WARNING = 30; // 30 seconds
const DEBOUNCE_DELAY = 300; // Reduced to 300ms for better responsiveness

export default function Timeout() {
  const { isAuthenticated, session, logout } = useAuth();

  const [countdown, setCountdown] = useState(DEFAULT_TIMEOUT);
  const [timeoutSettings, setTimeoutSettings] = useState({
    sessionTimeout: DEFAULT_TIMEOUT,
    warningTime: DEFAULT_WARNING,
  });
  const [showWarning, setShowWarning] = useState(false);

  // Use refs to store timers so they persist across renders
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown and logout timers
  const startTimers = useCallback(
    (timeout: number) => {
      // Clear existing timers
      if (timerRef.current) clearInterval(timerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

      // Set countdown timer
      timerRef.current = setInterval(() => {
        setCountdown((prevCount) => {
          const newCount = prevCount - 1;
          // Update warning visibility based on countdown
          setShowWarning(newCount <= timeoutSettings.warningTime);
          return newCount;
        });
      }, 1000);

      // Set logout timer
      logoutTimerRef.current = setTimeout(async () => {
        await logout("/");
      }, timeout * 1000);
    },
    [timeoutSettings.warningTime, logout]
  );
  // Fetch timeout settings and start timers
  useEffect(() => {
    const fetchTimeoutSettings = async () => {
      try {
        const response = await fetch("/api/timeout");
        if (response.ok) {
          const data = await response.json();
          if (data) {
            const sessionTimeout = data.sessionTimeout || DEFAULT_TIMEOUT;
            const warningTime = data.warningTime || DEFAULT_WARNING;

            setTimeoutSettings({
              sessionTimeout,
              warningTime,
            });
            setCountdown(sessionTimeout);
            startTimers(sessionTimeout);
          }
        }
      } catch (error) {
        console.error("Error fetching timeout settings:", error);
      }
    };

    // Only fetch settings when session changes
    if (isAuthenticated) {
      fetchTimeoutSettings();
    }

    return () => {
      // Clean up on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [session, startTimers, isAuthenticated]); // Now includes startTimers as a dependency

  // Reset timers on user activity - debounced
  // Fix: Use an inline function with explicit dependencies
  const handleUserActivity = useCallback(() => {
    const debouncedReset = debounce(() => {
      setCountdown(timeoutSettings.sessionTimeout);
      startTimers(timeoutSettings.sessionTimeout);
      setShowWarning(false);
    }, DEBOUNCE_DELAY);

    // Add cancel method
    debouncedReset.cancel = () => {
      // This is needed for cleanup
    };

    return debouncedReset;
  }, [timeoutSettings.sessionTimeout, startTimers])();

  // Set up event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];

    // Add all event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      // Remove all event listeners on cleanup
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      handleUserActivity.cancel();
    };
  }, [isAuthenticated, handleUserActivity]);

  // Only render warning when needed
  if (!isAuthenticated || !showWarning) {
    return null;
  }

  return (
    <section className="fixed bottom-4 right-4 z-50 animate-fadeIn">
      <div className="text-c-primary-marine-blue bg-yellow-200 p-4 rounded-lg shadow-lg border border-yellow-400">
        {countdown > 0 ? (
          <>
            <h4 className="font-semibold text-lg mb-1">
              Session Timeout Warning
            </h4>
            <p>
              You&apos;ll be logged out in{" "}
              <span className="font-bold">{countdown}</span> seconds due to
              inactivity.
            </p>
            <button
              onClick={() => handleUserActivity()}
              className="mt-2 px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Keep Session Active
            </button>
          </>
        ) : (
          <p className="font-medium">Logging out...</p>
        )}
      </div>
    </section>
  );
}
