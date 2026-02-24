// hooks/use-system-settings.ts

import { useState, useEffect } from 'react';

interface SystemSetting {
    id: string;
    userId: string;
    sessionTimeout: number | null;
    warningTime: number | null;
    updatedAt: Date;
}

interface UseSystemSettingsReturn {
    systemSetting: SystemSetting | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useSystemSettings(): UseSystemSettingsReturn {
    const [systemSetting, setSystemSetting] = useState<SystemSetting | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSystemSetting = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/system-settings', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            setSystemSetting(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            console.error('Error fetching system settings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSystemSetting();
    }, []);

    return {
        systemSetting,
        isLoading,
        error,
        refetch: fetchSystemSetting,
    };
}

// Usage in your component:
// const { systemSetting, isLoading, error, refetch } = useSystemSettings();