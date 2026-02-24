import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { auth } from "@/auth.config";

export async function POST(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { messageIndex, feedback } = await request.json();

        // Get current chat
        const chat = await prisma.chatNewVersion.findUnique({
            where: { id: (await params).chatId },
            select: { messages: true }
        });

        // Update messages array with feedback
        const messages = chat?.messages as any[];
        if (messages[messageIndex]) {
            messages[messageIndex].feedback = feedback;
        }

        // Save back to database
        await prisma.chatNewVersion.update({
            where: { id: (await params).chatId },
            data: { messages }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating feedback:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

}

export async function GET(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const chat = await prisma.chatNewVersion.findUnique({
            where: {
                id: (await params).chatId,
                userId: session.user.id
            },
            select: { messages: true }
        });

        if (!chat) {
            return NextResponse.json({ error: "Chat not found" }, { status: 404 });
        }

        return NextResponse.json(chat);
    } catch (error) {
        console.error("Error fetching chat:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}