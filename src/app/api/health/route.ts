/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/health/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AppInitializer } from "@/lib/app-initialization";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const healthStatus = await AppInitializer.healthCheck();

        const isHealthy = healthStatus.redis.status === 'healthy' &&
            healthStatus.cleanup.status === 'running';

        const response = {
            status: isHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                redis: healthStatus.redis,
                cleanup: healthStatus.cleanup,
            },
            uptime: process.uptime(),
            environment: process.env.NODE_ENV,
        };

        return NextResponse.json(response, {
            status: isHealthy ? 200 : 503,
        });
    } catch (error) {
        console.error("Health check failed:", error);

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            uptime: process.uptime(),
        }, {
            status: 503,
        });
    }
}