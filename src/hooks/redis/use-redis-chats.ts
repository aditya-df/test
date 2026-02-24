// hooks/use-redis-chats.ts
import { useState, useEffect, useCallback } from 'react';
// import type { RedisChatData } from '@/lib/redis-chat-service';

interface ChatHistoryItem {
    id: string;
    userId: string;
    agentId?: string | null;
    messages: any;
    createdAt: string | Date;
    topic?: string | null;
    agent?: {
        id: string;
        agentName: string;
        description: string | null;
    } | null;
}

export function useRedisChats() {
    const [chats, setChats] = useState<ChatHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [useRedisCache, setUseRedisCache] = useState(true);

    const fetchChats = useCallback(async (page = 1, limit = 20) => {
        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                useRedis: useRedisCache.toString(),
            });

            const response = await fetch(`/api/chat?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch chats: ${response.status}`);
            }

            const fetchedChats: ChatHistoryItem[] = await response.json();
            setChats(fetchedChats);

            console.log(`📊 Fetched ${fetchedChats.length} chats (Redis: ${useRedisCache})`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            console.error('Error fetching chats:', err);
        } finally {
            setIsLoading(false);
        }
    }, [useRedisCache]);

    const refreshChat = useCallback(async (chatId: string) => {
        try {
            // This would refresh the expiration of a specific chat in Redis
            const response = await fetch('/api/admin/redis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'refresh',
                    chatId,
                }),
            });

            if (response.ok) {
                console.log(`🔄 Refreshed chat ${chatId} expiration`);
            }
        } catch (err) {
            console.error('Error refreshing chat:', err);
        }
    }, []);

    const deleteChat = useCallback(async (chatId: string, userId: string, agentId?: string) => {
        try {
            const response = await fetch('/api/admin/redis', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatId,
                    userId,
                    agentId,
                }),
            });

            if (response.ok) {
                // Remove from local state
                setChats(prev => prev.filter(chat => chat.id !== chatId));
                console.log(`🗑️ Deleted chat ${chatId} from Redis and local state`);
            }
        } catch (err) {
            console.error('Error deleting chat:', err);
        }
    }, []);

    const getRedisStats = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/redis?action=stats');
            if (response.ok) {
                return await response.json();
            }
        } catch (err) {
            console.error('Error getting Redis stats:', err);
        }
        return null;
    }, []);

    const toggleRedisUsage = useCallback(() => {
        setUseRedisCache(prev => !prev);
    }, []);

    // Auto-refresh chats every 30 seconds when using Redis
    useEffect(() => {
        if (!useRedisCache) return;

        const interval = setInterval(() => {
            fetchChats();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [fetchChats, useRedisCache]);

    return {
        chats,
        isLoading,
        error,
        useRedisCache,
        fetchChats,
        refreshChat,
        deleteChat,
        getRedisStats,
        toggleRedisUsage,
    };
}