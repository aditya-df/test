// src/hooks/use-network-status.ts
import { useEffect, useState } from "react";

export const useNetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(() => {
        // Initialize with actual browser state
        if (typeof window !== 'undefined') {
            return navigator.onLine;
        }
        return true; // Default to true for SSR
    });

    useEffect(() => {
        // Set initial status
        setIsOnline(navigator.onLine);

        // Event handlers for network status changes
        const handleOnline = () => {
            console.log('🟢 Network: Online');
            setIsOnline(true);
        };

        const handleOffline = () => {
            console.log('🔴 Network: Offline');
            setIsOnline(false);
        };

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Additional connectivity check function
        const checkConnectivity = async (timeoutMs: number) => {
            const url = "http://google.com/generate_204";
            const response = await fetch(url, {
                signal: AbortSignal.timeout(timeoutMs),
            });
            return response.status === 200 || response.status === 204;
        };

        // Check connectivity every 30 seconds if we think we're offline
        const interval = setInterval(() => {
            if (!navigator.onLine) {
                console.log('📡 Navigator says offline, checking connectivity...');
                checkConnectivity(5000);
            }
        }, 30000);

        // Initial connectivity check if navigator says we're online but we want to verify
        if (navigator.onLine) {
            checkConnectivity(5000);
        }

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []); // Remove isOnline from dependencies to avoid infinite loop

    return isOnline;
};