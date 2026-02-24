// lib/redis-cleanup-service.ts
import { getRedisClient } from './redis';
import { RedisChatService } from './redis-chat-service';

export class RedisCleanupService {
    private static cleanupInterval: NodeJS.Timeout | null = null;
    private static isRunning = false;

    /**
     * Start automatic cleanup service (runs every 5 minutes)
     */
    static startAutomaticCleanup(): void {
        if (this.isRunning) {
            console.log("🔄 Redis cleanup service is already running");
            return;
        }

        console.log("🚀 Starting Redis automatic cleanup service...");
        this.isRunning = true;

        // Run cleanup every 5 minutes (300,000 ms)
        this.cleanupInterval = setInterval(async () => {
            try {
                await this.performCleanup();
            } catch (error) {
                console.error("Error in automatic Redis cleanup:", error);
            }
        }, 5 * 60 * 1000); // 5 minutes

        // Also run an initial cleanup
        this.performCleanup().catch(error => {
            console.error("Error in initial Redis cleanup:", error);
        });
    }

    /**
     * Stop the automatic cleanup service
     */
    static stopAutomaticCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            this.isRunning = false;
            console.log("🛑 Redis cleanup service stopped");
        }
    }

    /**
     * Perform manual cleanup of expired chats
     */
    static async performCleanup(): Promise<{
        deletedChats: number;
        deletedKeys: number;
        cleanupTime: number;
    }> {
        const startTime = Date.now();
        let deletedChats = 0;
        let deletedKeys = 0;

        try {
            const redis = await getRedisClient();
            if (!redis) {
                console.warn("⚠️ Redis client not available - skipping cleanup");
                return {
                    deletedChats: 0,
                    deletedKeys: 0,
                    cleanupTime: Date.now() - startTime,
                };
            }
            console.log("🧹 Starting Redis cleanup...");

            // Get all keys that might be expired
            const allKeys = await redis.keys("*");
            console.log(`🔍 Found ${allKeys.length} total keys in Redis`);

            for (const key of allKeys) {
                const ttl = await redis.ttl(key);

                // If TTL is -2 (key doesn't exist) or -1 (no expiration set), delete it
                if (ttl === -2) {
                    await redis.del(key);
                    deletedKeys++;

                    if (key.startsWith('chat:')) {
                        deletedChats++;
                    }
                }
            }

            // Additional cleanup using the RedisChatService method
            const additionalDeleted = await RedisChatService.cleanupExpiredChats();
            deletedChats += additionalDeleted;

            const cleanupTime = Date.now() - startTime;

            if (deletedChats > 0 || deletedKeys > 0) {
                console.log(`✅ Redis cleanup completed: ${deletedChats} chats, ${deletedKeys} keys deleted in ${cleanupTime}ms`);
            } else {
                console.log(`✅ Redis cleanup completed: No expired items found (${cleanupTime}ms)`);
            }

            return {
                deletedChats,
                deletedKeys,
                cleanupTime,
            };
        } catch (error) {
            const cleanupTime = Date.now() - startTime;
            console.error(`❌ Redis cleanup failed after ${cleanupTime}ms:`, error);
            throw error;
        }
    }

    /**
     * Get cleanup service status
     */
    static getStatus(): {
        isRunning: boolean;
        intervalId: NodeJS.Timeout | null;
    } {
        return {
            isRunning: this.isRunning,
            intervalId: this.cleanupInterval,
        };
    }

    /**
     * Monitor Redis memory usage and perform cleanup if needed
     */
    static async monitorAndCleanup(maxMemoryMB = 200): Promise<{
        memoryUsed: number;
        maxMemory: number;
        cleanupTriggered: boolean;
        cleanupResults?: {
            deletedChats: number;
            deletedKeys: number;
            cleanupTime: number;
        };
    }> {
        try {
            const redis = await getRedisClient();
            if (!redis) {
                console.warn("⚠️ Redis client not available - cannot monitor memory");
                return {
                    memoryUsed: 0,
                    maxMemory: maxMemoryMB,
                    cleanupTriggered: false,
                };
            }

            // Get memory info
            const info = await redis.info('memory');
            const memoryLines = info.split('\n');
            const usedMemoryLine = memoryLines.find(line => line.startsWith('used_memory:'));
            const usedMemoryBytes = usedMemoryLine ? parseInt(usedMemoryLine.split(':')[1]) : 0;
            const usedMemoryMB = Math.round(usedMemoryBytes / 1024 / 1024);

            console.log(`📊 Redis memory usage: ${usedMemoryMB}MB / ${maxMemoryMB}MB`);

            let cleanupResults;
            let cleanupTriggered = false;

            // If memory usage is above threshold, trigger cleanup
            if (usedMemoryMB > maxMemoryMB) {
                console.log(`⚠️ Redis memory usage (${usedMemoryMB}MB) exceeds threshold (${maxMemoryMB}MB), triggering cleanup...`);
                cleanupResults = await this.performCleanup();
                cleanupTriggered = true;
            }

            return {
                memoryUsed: usedMemoryMB,
                maxMemory: maxMemoryMB,
                cleanupTriggered,
                cleanupResults,
            };
        } catch (error) {
            console.error('Error monitoring Redis memory:', error);
            throw error;
        }
    }

    /**
     * Initialize Redis cleanup service (call this in your app startup)
     */
    static async initialize(): Promise<void> {
        try {
            console.log("🔧 Initializing Redis cleanup service...");

            // Test Redis connection
            const redis = await getRedisClient();
            if (!redis) {
                console.warn("⚠️ Redis client not available - cleanup service will not start");
                return;
            }

            await redis.ping();

            // Perform initial cleanup
            await this.performCleanup();

            // Start automatic cleanup
            this.startAutomaticCleanup();

            console.log("✅ Redis cleanup service initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize Redis cleanup service:", error);
            throw error;
        }
    }

    /**
     * Graceful shutdown of cleanup service
     */
    static async shutdown(): Promise<void> {
        console.log("🛑 Shutting down Redis cleanup service...");

        this.stopAutomaticCleanup();

        // Perform final cleanup
        try {
            await this.performCleanup();
            console.log("✅ Final cleanup completed");
        } catch (error) {
            console.error("❌ Error during final cleanup:", error);
        }
    }
}