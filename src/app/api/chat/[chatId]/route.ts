import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { prisma } from "@/config/db";
import { AuditAction, logChatAction } from "@/lib/audit-log";

// GET a specific chat by ID
export async function GET(req: Request, params: { params: Promise<{ chatId: string }> }) {
    const { chatId } = await params.params
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // const { chatId } = params;

    try {
        // Fetch the chat with agent information
        const chat = await prisma.chatNewVersion.findFirst({
            where: {
                id: chatId,
                userId: session.user.id, // Ensure the chat belongs to the current user
                isDeleted: { not: true } // Exclude soft-deleted chats
            },
            include: {
                agent: {
                    select: {
                        id: true,
                        agentName: true,
                        description: true,
                        systemInstruction: true,
                    },
                },
            },
        });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        return NextResponse.json(chat);
    } catch (error) {
        console.error('Error fetching chat:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat' },
            { status: 500 }
        );
    }
}

// PUT - Soft delete a specific chat by setting isDeleted to true
export async function PUT(
    request: NextRequest,
    params: { params: Promise<{ chatId: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { chatId } = await params.params

    try {
        // Check if the chat exists and belongs to the user
        const chat = await prisma.chatNewVersion.findUnique({
            where: {
                id: chatId,
                userId: session.user.id,
            },
            include: {
                agent: {
                    select: {
                        agentName: true,
                    },
                },
            },
        });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        // Check if chat is already deleted
        if (chat.isDeleted) {
            return NextResponse.json({ error: 'Chat already deleted' }, { status: 400 });
        }

        // Log chat deletion to audit logs before soft deleting
        try {
            const messages = chat.messages as any[];
            await logChatAction(
                session.user.id,
                session.user.email || "unknown",
                session.user.name || "Unknown User",
                AuditAction.CHAT_HISTORY_DELETED,
                chatId,
                request,
                {
                    topic: chat.topic || "Untitled Chat",
                    messageCount: messages?.length || 0,
                    agentId: chat.agentId || null,
                    agentName: chat.agent?.agentName || "Unknown Agent",
                    totalTokens: chat.totalTokens || 0,
                    promptTokens: chat.promptTokens || 0,
                    completionTokens: chat.completionTokens || 0,
                    responseTime: chat.totalResponseTime || 0,
                    deletedAt: new Date().toISOString(),
                },
                true
            );
            console.log("Chat deletion logged to audit logs:", chatId);
        } catch (auditError) {
            console.error("Error logging chat deletion to audit:", auditError);
        }

        // Soft delete the chat by setting isDeleted to true
        await prisma.chatNewVersion.update({
            where: {
                id: chatId,
            },
            data: {
                isDeleted: true,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error soft deleting chat:', error);
        return NextResponse.json(
            { error: 'Failed to delete chat' },
            { status: 500 }
        );
    }
}