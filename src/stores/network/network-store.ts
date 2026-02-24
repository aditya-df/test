// src/stores/network-store.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface NetworkStore {
    isOnline: boolean;
    lastOnlineTime: Date | null;
    setOnline: (status: boolean) => void;
    checkConnectivity: () => Promise<boolean>;
}

export const useNetworkStore = create<NetworkStore>()(
    subscribeWithSelector((set, get) => ({
        isOnline: true,
        lastOnlineTime: null,

        setOnline: (status: boolean) => {
            const currentStatus = get().isOnline;
            if (currentStatus !== status) {
                console.log(status ? '🟢 Network: Online' : '🔴 Network: Offline');
                set({
                    isOnline: status,
                    lastOnlineTime: status ? new Date() : get().lastOnlineTime
                });
            }
        },

        checkConnectivity: async () => {
            try {
                // Use a more reliable endpoint that works with CORS
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);

                await fetch(process.env.NEXT_PUBLIC_APP_URL || window.location.origin, {
                    method: 'HEAD',
                    signal: controller.signal,
                    mode: 'no-cors'
                });

                clearTimeout(timeoutId);
                const isConnected = true; // If we reach here, we're connected
                get().setOnline(isConnected);
                return isConnected;
            } catch (error) {
                console.log('📡 Connectivity check failed:', error);
                get().setOnline(false);
                return false;
            }
        },
    }))
);