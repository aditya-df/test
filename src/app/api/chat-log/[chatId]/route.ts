import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { prisma } from "@/config/db";

// GET a specific chat by ID for audit log purposes (admin access)
export async function GET(
    req: NextRequest,
    params: { params: Promise<{ chatId: string }> }
) {
    const { chatId } = await params.params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin/superadmin permissions
    const hasPermission =
        session?.user?.roles?.includes("admin") ||
        session?.user?.roles?.includes("superadmin");

    if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    try {
        // Get userId from query parameters (optional)
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        // Build where clause based on whether userId is provided
        const whereClause: any = {
            id: chatId,
            // Don't filter by current user - allow admin to view any chat
        };

        // If userId is provided, filter by that user
        if (userId) {
            whereClause.userId = userId;
        }

        // Fetch the chat with agent information
        const chat = await prisma.chatNewVersion.findFirst({
            where: whereClause,
            include: {
                agent: {
                    select: {
                        id: true,
                        agentName: true,
                        description: true,
                        systemInstruction: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                    },
                },
            },
        });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        return NextResponse.json(chat);
    } catch (error) {
        console.error('Error fetching chat for audit log:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat' },
            { status: 500 }
        );
    }
}
