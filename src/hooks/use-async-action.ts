import { useState, useCallback } from "react";

export function useAsyncAction(actionFn: any) {
  const [loading, setLoading] = useState(false);

  const wrappedFn = useCallback(
    async (...args: any) => {
      setLoading(true);
      try {
        return await actionFn(...args);
      } finally {
        setLoading(false);
      }
    },
    [actionFn]
  );

  return { loading, run: wrappedFn };
}
