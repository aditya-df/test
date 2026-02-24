import { useEffect } from 'react';
import { useSessionStore } from '@/stores/session/useSessionStore';

export function useSessionLoader() {
  const { isLoaded, isLoading, error, checkSession } = useSessionStore();

  useEffect(() => {
    if (!isLoaded && !isLoading) {
      checkSession();
    }
  }, [isLoaded, isLoading, checkSession]);

  return { isLoaded, isLoading, error };
}
