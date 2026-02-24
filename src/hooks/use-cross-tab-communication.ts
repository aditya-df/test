import { useEffect, useRef, useCallback } from "react";
import {
  CrossTabCommunication,
  createCrossTabCommunication,
  TabEventHandler,
  CrossTabOptions,
} from "@/utils/cross-tab-communication";

/**
 * React hook for cross-tab communication
 */
export function useCrossTabCommunication(options?: CrossTabOptions) {
  const commRef = useRef<CrossTabCommunication | null>(null);

  // Initialize communication instance
  useEffect(() => {
    commRef.current = createCrossTabCommunication(options);

    return () => {
      commRef.current?.destroy();
    };
  }, []);

  // Broadcast function
  const broadcast = useCallback(<T = any>(type: string, payload?: T) => {
    commRef.current?.broadcast(type, payload);
  }, []);

  // Subscribe to events
  const subscribe = useCallback(
    <T = any>(eventType: string, handler: TabEventHandler<T>) => {
      return commRef.current?.on(eventType, handler) || (() => {});
    },
    []
  );

  // Unsubscribe from events
  const unsubscribe = useCallback((eventType: string) => {
    commRef.current?.off(eventType);
  }, []);

  // Set up broadcast on close
  const broadcastOnClose = useCallback(
    <T = any>(eventType: string = "CLOSING", payload?: T) => {
      return (
        commRef.current?.broadcastOnClose(eventType, payload) || (() => {})
      );
    },
    []
  );

  // Get tab ID
  const getTabId = useCallback(() => {
    return commRef.current?.getTabId() || "";
  }, []);

  return {
    broadcast,
    subscribe,
    unsubscribe,
    broadcastOnClose,
    getTabId,
  };
}

/**
 * Hook for listening to specific tab events
 */
export function useTabEventListener<T = any>(
  eventType: string,
  handler: TabEventHandler<T>,
  deps: React.DependencyList = []
) {
  const { subscribe } = useCrossTabCommunication();

  useEffect(() => {
    const unsubscribe = subscribe(eventType, handler);
    return unsubscribe;
  }, [eventType, subscribe, ...deps]);
}

/**
 * Hook for broadcasting on component unmount or tab close
 */
export function useBroadcastOnClose<T = any>(
  eventType: string = "CLOSING",
  payload?: T,
  deps: React.DependencyList = []
) {
  const { broadcastOnClose } = useCrossTabCommunication();

  useEffect(() => {
    const cleanup = broadcastOnClose(eventType, payload);
    return cleanup;
  }, [eventType, broadcastOnClose, ...deps]);
}
