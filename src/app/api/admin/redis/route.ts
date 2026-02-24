/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/api/admin/redis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { RedisChatService } from "@/lib/redis-chat-service";
import { getRedisClient } from "@/lib/redis";
import { getAuthSession } from "@/utils/auth-utils-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const session = await getAuthSession();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only allow admin users to access Redis management
    if (!session.user.roles?.some(role => ['admin', 'superadmin'].includes(role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }


    try {
        const searchParams = request.nextUrl.searchParams;
        const action = searchParams.get("action");

        switch (action) {
            case "stats":
                const stats = await RedisChatService.getChatStats();
                return NextResponse.json(stats);

            case "user-chats":
                const userId = searchParams.get("userId");
                if (!userId) {
                    return NextResponse.json({ error: "userId required" }, { status: 400 });
                }
                const userChats = await RedisChatService.getUserChats(userId);
                return NextResponse.json(userChats);

            case "health":
                const redis = await getRedisClient();
                if (!redis) {
                    return NextResponse.json(
                        { error: "Redis client not available" },
                        { status: 503 }
                    );
                }
                const ping = await redis.ping();
                const info = await redis.info();
                return NextResponse.json({
                    status: "healthy",
                    ping,
                    info: info.split('\n').slice(0, 10) // First 10 lines of info
                });

            case "cleanup":
                const deletedCount = await RedisChatService.cleanupExpiredChats();
                return NextResponse.json({ deletedCount });

            default:
                return NextResponse.json({
                    error: "Invalid action",
                    availableActions: ["stats", "user-chats", "health", "cleanup"]
                }, { status: 400 });
        }
    } catch (error) {
        console.error("Redis management error:", error);
        return NextResponse.json(
            { error: "Redis operation failed" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    const session = await getAuthSession();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Only allow admin users to access Redis management
    if (!session.user.roles?.some(role => ['admin', 'superadmin'].includes(role))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const { chatId, userId, agentId } = await request.json();

        if (!chatId || !userId) {
            return NextResponse.json({
                error: "chatId and userId are required"
            }, { status: 400 });
        }

        await RedisChatService.deleteChat(chatId, userId, agentId);

        return NextResponse.json({
            success: true,
            message: `Chat ${chatId} deleted from Redis`
        });
    } catch (error) {
        console.error("Error deleting chat from Redis:", error);
        return NextResponse.json(
            { error: "Failed to delete chat from Redis" },
            { status: 500 }
        );
    }
}