// lib/app-initialization.ts
import { RedisCleanupService } from './redis-cleanup-service';
import { getRedisClient } from './redis';

export class AppInitializer {
    private static initialized = false;

    /**
     * Initialize all app services including Redis
     */
    static async initialize(): Promise<void> {
        if (this.initialized) {
            console.log("App already initialized, skipping...");
            return;
        }

        console.log("🚀 Initializing application services...");

        try {
            // Initialize Redis connection and cleanup service
            await this.initializeRedis();

            // Set up graceful shutdown handlers
            this.setupGracefulShutdown();

            this.initialized = true;
            console.log("✅ Application services initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize application services:", error);
            throw error;
        }
    }

    /**
     * Initialize Redis services
     */
    private static async initializeRedis(): Promise<void> {
        try {
            console.log("🔧 Initializing Redis services...");

            // Test Redis connection
            const redis = await getRedisClient();
            if (!redis) {
                console.warn("⚠️ Redis client not available - skipping Redis initialization");
                return;
            }
            const pingResult = await redis.ping();
            console.log(`📡 Redis connection test: ${pingResult}`);

            // Initialize cleanup service
            await RedisCleanupService.initialize();

            console.log("✅ Redis services initialized");
        } catch (error) {
            console.error("❌ Redis initialization failed:", error);
            // Don't throw error to prevent app from crashing if Redis is down
            console.log("⚠️ App will continue without Redis caching");
        }
    }

    /**
     * Setup graceful shutdown handlers
     */
    private static setupGracefulShutdown(): void {
        const gracefulShutdown = async (signal: string) => {
            console.log(`📡 Received ${signal}, starting graceful shutdown...`);

            try {
                // Stop Redis cleanup service
                await RedisCleanupService.shutdown();

                // Close Redis connection
                const { closeRedisConnection } = await import('./redis');
                await closeRedisConnection();

                console.log("✅ Graceful shutdown completed");
                process.exit(0);
            } catch (error) {
                console.error("❌ Error during graceful shutdown:", error);
                process.exit(1);
            }
        };

        // Handle different shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });
    }

    /**
     * Health check for all services
     */
    static async healthCheck(): Promise<{
        redis: { status: string; latency?: number; error?: string };
        cleanup: { status: string; isRunning: boolean };
    }> {
        const healthStatus = {
            redis: { status: 'unknown' as string, latency: undefined as number | undefined, error: undefined as string | undefined },
            cleanup: { status: 'unknown' as string, isRunning: false },
        };

        // Check Redis health
        try {
            const redis = await getRedisClient();
            if (!redis) {
                healthStatus.redis = {
                    status: 'unavailable',
                    latency: undefined,
                    error: 'Redis client not available',
                };
                return healthStatus;
            }

            const startTime = Date.now();
            await redis.ping();
            const latency = Date.now() - startTime;

            healthStatus.redis = {
                status: 'healthy',
                latency,
                error: undefined,
            };
        } catch (error) {
            healthStatus.redis = {
                status: 'unhealthy',
                latency: undefined,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }

        // Check cleanup service status
        const cleanupStatus = RedisCleanupService.getStatus();
        healthStatus.cleanup = {
            status: cleanupStatus.isRunning ? 'running' : 'stopped',
            isRunning: cleanupStatus.isRunning,
        };

        return healthStatus;
    }
}

// Auto-initialize when this module is imported in a Node.js environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
    // Only auto-initialize in server environments, not in client or test environments
    AppInitializer.initialize().catch(error => {
        console.error("Failed to auto-initialize app services:", error);
    });
}