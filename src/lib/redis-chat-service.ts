// lib/redis-chat-service.ts
import { getRedisClient } from './redis';
import type { UIMessage } from 'ai';

export interface RedisChatData {
    id: string;
    userId?: string;
    token?: string;
    agentId?: string;
    messages: UIMessage[];
    createdAt: string;
    updatedAt: string;
    topic?: string;
    metadata?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        totalResponseTime?: number;
    };
}

// Redis key patterns
const CHAT_KEY = (chatId: string) => `chat:${chatId}`;
const USER_CHATS_KEY = (userId: string) => `user:${userId}:chats`;
const AGENT_CHATS_KEY = (agentId: string) => `agent:${agentId}:chats`;

// Cache duration in seconds (5 minutes)
const CHAT_CACHE_DURATION = 5 * 60; // 5 minutes

export class RedisChatService {
    private static async ensureRedisConnection() {
        try {
            return await getRedisClient();
        } catch (error) {
            console.error('Failed to connect to Redis:', error);
            return null;
        }
    }

    /**
     * Create or update a chat in Redis with 5-minute expiration
     */
    static async setChat(chatData: RedisChatData): Promise<void> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to store chat');
                return;
            }

            const chatKey = CHAT_KEY(chatData.id);
            const userChatsKey = USER_CHATS_KEY(chatData.userId ?? "user-chat-widget");

            // Store chat data as JSON with expiration
            await redis.setEx(
                chatKey,
                CHAT_CACHE_DURATION,
                JSON.stringify({
                    ...chatData,
                    updatedAt: new Date().toISOString(),
                })
            );

            // Add chat ID to user's chat set (also with expiration)
            await redis.sAdd(userChatsKey, chatData.id);
            await redis.expire(userChatsKey, CHAT_CACHE_DURATION);

            // If agent is specified, also add to agent's chat set
            if (chatData.agentId) {
                const agentChatsKey = AGENT_CHATS_KEY(chatData.agentId);
                await redis.sAdd(agentChatsKey, chatData.id);
                await redis.expire(agentChatsKey, CHAT_CACHE_DURATION);
            }

            console.log(`✅ Chat ${chatData.id} stored in Redis with ${CHAT_CACHE_DURATION}s expiration`);
        } catch (error) {
            console.error('Error storing chat in Redis:', error);
            // Don't throw error to prevent blocking the main chat functionality
        }
    }

    /**
     * Get a chat from Redis
     */
    static async getChat(chatId: string): Promise<RedisChatData | null> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to retrieve chat');
                return null;
            }

            const chatKey = CHAT_KEY(chatId);

            const chatJson = await redis.get(chatKey);
            if (!chatJson) {
                return null;
            }

            return JSON.parse(chatJson) as RedisChatData;
        } catch (error) {
            console.error('Error getting chat from Redis:', error);
            return null;
        }
    }

    /**
     * Update messages for an existing chat in Redis
     */
    static async updateChatMessages(
        chatId: string,
        messages: UIMessage[],
        metadata?: Partial<RedisChatData['metadata']>
    ): Promise<void> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to update chat messages');
                return;
            }

            const existingChat = await this.getChat(chatId);

            if (!existingChat) {
                console.log(`Chat ${chatId} not found in Redis for update`);
                return;
            }

            const updatedChat: RedisChatData = {
                ...existingChat,
                messages,
                updatedAt: new Date().toISOString(),
                metadata: {
                    ...existingChat.metadata,
                    ...metadata,
                },
            };

            await this.setChat(updatedChat);
        } catch (error) {
            console.error('Error updating chat messages in Redis:', error);
        }
    }

    /**
     * Get all chats for a user from Redis
     */
    static async getUserChats(userId: string): Promise<RedisChatData[]> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to retrieve user chats');
                return [];
            }

            const userChatsKey = USER_CHATS_KEY(userId);

            const chatIds = await redis.sMembers(userChatsKey);
            if (chatIds.length === 0) {
                return [];
            }

            // Get all chat data in parallel
            const chatKeys = chatIds.map(id => CHAT_KEY(id));
            const chatJsons = await redis.mGet(chatKeys);

            const chats: RedisChatData[] = [];
            for (const chatJson of chatJsons) {
                if (chatJson) {
                    try {
                        chats.push(JSON.parse(chatJson));
                    } catch (parseError) {
                        console.error('Error parsing chat JSON from Redis:', parseError);
                    }
                }
            }

            // Sort by creation date (newest first)
            return chats.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        } catch (error) {
            console.error('Error getting user chats from Redis:', error);
            return [];
        }
    }

    /**
     * Delete a chat from Redis
     */
    static async deleteChat(chatId: string, userId: string, agentId?: string): Promise<void> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to delete chat');
                return;
            }

            // Delete the chat data
            await redis.del(CHAT_KEY(chatId));

            // Remove from user's chat set
            await redis.sRem(USER_CHATS_KEY(userId), chatId);

            // Remove from agent's chat set if applicable
            if (agentId) {
                await redis.sRem(AGENT_CHATS_KEY(agentId), chatId);
            }

            console.log(`🗑️ Chat ${chatId} deleted from Redis`);
        } catch (error) {
            console.error('Error deleting chat from Redis:', error);
        }
    }

    /**
     * Check if a chat exists in Redis
     */
    static async chatExists(chatId: string): Promise<boolean> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to check chat existence');
                return false;
            }

            const exists = await redis.exists(CHAT_KEY(chatId));
            return exists === 1;
        } catch (error) {
            console.error('Error checking chat existence in Redis:', error);
            return false;
        }
    }

    /**
     * Extend the expiration time for a chat (refresh the 5-minute timer)
     */
    static async refreshChatExpiration(chatId: string): Promise<void> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to refresh chat expiration');
                return;
            }

            const chatKey = CHAT_KEY(chatId);

            // Check if chat exists before extending expiration
            const exists = await redis.exists(chatKey);
            if (exists) {
                await redis.expire(chatKey, CHAT_CACHE_DURATION);
                console.log(`🔄 Extended expiration for chat ${chatId}`);
            }
        } catch (error) {
            console.error('Error refreshing chat expiration:', error);
        }
    }

    /**
     * Get chat statistics from Redis
     */
    static async getChatStats(): Promise<{
        totalActiveChats: number;
        chatsByUser: Record<string, number>;
    }> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to get chat stats');
                return {
                    totalActiveChats: 0,
                    chatsByUser: {},
                };
            }

            // Get all chat keys
            const chatKeys = await redis.keys('chat:*');
            const totalActiveChats = chatKeys.length;

            // Count chats by user (this requires getting all chat data)
            const chatsByUser: Record<string, number> = {};

            if (chatKeys.length > 0) {
                const chatJsons = await redis.mGet(chatKeys);
                for (const chatJson of chatJsons) {
                    if (chatJson) {
                        try {
                            const chat: RedisChatData = JSON.parse(chatJson);
                            const userKey = chat.userId ?? "user-chat-widget";
                            chatsByUser[userKey] = (chatsByUser[userKey] || 0) + 1;
                        } catch (parseError) {
                            console.error('Error parsing chat for stats:', parseError);
                        }
                    }
                }
            }

            return {
                totalActiveChats,
                chatsByUser,
            };
        } catch (error) {
            console.error('Error getting chat stats from Redis:', error);
            return {
                totalActiveChats: 0,
                chatsByUser: {},
            };
        }
    }

    /**
     * Cleanup expired chats manually (useful for debugging)
     */
    static async cleanupExpiredChats(): Promise<number> {
        try {
            const redis = await this.ensureRedisConnection();
            if (!redis) {
                console.warn('⚠️ Redis client not available - unable to cleanup expired chats');
                return 0;
            }

            // Get all chat keys
            const chatKeys = await redis.keys('chat:*');
            let deletedCount = 0;

            for (const chatKey of chatKeys) {
                const ttl = await redis.ttl(chatKey);
                // If TTL is -1 (no expiration) or -2 (key doesn't exist), clean it up
                if (ttl <= 0) {
                    await redis.del(chatKey);
                    deletedCount++;
                }
            }

            console.log(`🧹 Cleaned up ${deletedCount} expired chats`);
            return deletedCount;
        } catch (error) {
            console.error('Error cleaning up expired chats:', error);
            return 0;
        }
    }
}