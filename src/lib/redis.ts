// lib/redis.ts
import { createClient } from 'redis';

export type RedisClient = ReturnType<typeof createClient>;

let redis: RedisClient | null = null;

export async function getRedisClient(): Promise<RedisClient | null> {
    const usingRedis = process.env.USING_REDIS !== 'false';

    if (!usingRedis) {
        console.log('Redis is disabled via USING_REDIS=false');
        return null;
    }
    if (!redis) {
        const redisHost = process.env.REDIS_HOST;
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');

        redis = createClient({
            socket: {
                host: redisHost,
                port: redisPort,
            },
            // Optional: Add password if you have one
            // password: process.env.REDIS_PASSWORD,
        });

        redis.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });

        redis.on('connect', () => {
            console.log('Redis Client Connected');
        });

        redis.on('ready', () => {
            console.log('Redis Client Ready');
        });

        redis.on('end', () => {
            console.log('Redis Client Connection Ended');
        });

        await redis.connect();
    }

    return redis;
}

export async function closeRedisConnection(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
    }
}