// src/providers/network-provider.tsx
'use client';

import { useEffect } from 'react';
import { useNetworkStore } from '@/stores/network/network-store';

export const NetworkProvider = ({ children }: { children: React.ReactNode }) => {
    const { setOnline, checkConnectivity } = useNetworkStore();

    useEffect(() => {
        // Initialize with actual browser state
        if (typeof window !== 'undefined') {
            setOnline(navigator.onLine);
        }

        // Event handlers for network status changes
        const handleOnline = () => {
            setOnline(true);
            // Double-check connectivity when we think we're back online
            checkConnectivity();
        };

        const handleOffline = () => {
            setOnline(false);
        };

        // Add event listeners
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check connectivity every 30 seconds if we think we're offline
        const interval = setInterval(() => {
            if (!navigator.onLine) {
                console.log('📡 Navigator says offline, checking connectivity...');
                checkConnectivity();
            }
        }, 30000);

        // Initial connectivity check
        if (navigator.onLine) {
            checkConnectivity();
        }

        // Cleanup
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, [setOnline, checkConnectivity]);

    return <>{children}</>;
};