// src/components/offline-modal.tsx
'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { useNetworkStore } from '@/stores/network/network-store';

export const OfflineModal = () => {
    const { isOnline, checkConnectivity } = useNetworkStore();
    const [isChecking, setIsChecking] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Show modal with a slight delay to avoid flickering
    useEffect(() => {
        if (!isOnline) {
            const timer = setTimeout(() => setShowModal(true), 1000);
            return () => clearTimeout(timer);
        } else {
            setShowModal(false);
        }
    }, [isOnline]);

    const handleRetry = async () => {
        setIsChecking(true);
        await checkConnectivity();
        setIsChecking(false);
    };

    if (!showModal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="text-center">
                    {/* Icon */}
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <WifiOff className="h-8 w-8 text-red-600" />
                    </div>

                    {/* Title */}
                    <h2 className="mb-2 text-xl font-semibold text-gray-900">
                        No Internet Connection
                    </h2>

                    {/* Description */}
                    <p className="mb-6 text-gray-600">
                        Please check your internet connection and try again. Some features may not work properly while offline.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleRetry}
                            disabled={isChecking}
                            className="flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isChecking ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <Wifi className="h-4 w-4" />
                                    Try Again
                                </>
                            )}
                        </button>
                    </div>

                    {/* Status indicator */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <span>Offline Mode</span>
                    </div>
                </div>
            </div>
        </div>
    );
};