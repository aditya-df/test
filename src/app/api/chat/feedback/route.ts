// src/app/api/chat/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { prisma } from "@/config/db";
import { z } from "zod";
import { logMessageFeedback } from "@/lib/audit-log";

// Validation schemas
const feedbackCreateSchema = z.object({
  chatId: z.string().min(1),
  messageIndex: z.number().int().min(0),
  messageRole: z.enum(["user", "assistant"]),
  feedbackType: z.enum(["like", "dislike"]),
  messageContent: z.string().optional(),
  previousMessageContent: z.string().optional(),
  comment: z.string().optional(),
});

const feedbackQuerySchema = z.object({
  chatId: z.string().min(1),
  messageIndex: z.string().transform(Number).optional(),
});

// POST - Create or update feedback
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = feedbackCreateSchema.parse(body);

    // Verify chat belongs to user
    const chat = await prisma.chatNewVersion.findFirst({
      where: { 
        id: validatedData.chatId, 
        userId: session.user.id 
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found or unauthorized" }, 
        { status: 404 }
      );
    }

    // Validate message index if provided
    if (validatedData.messageIndex !== undefined) {
      const messages = Array.isArray(chat.messages) ? chat.messages : [];
      if (validatedData.messageIndex >= messages.length) {
        return NextResponse.json(
          { success: false, error: "Invalid message index" }, 
          { status: 400 }
        );
      }
    }

    // Upsert feedback
    const feedback = await prisma.messageFeedback.upsert({
      where: {
        userId_chatId_messageIndex: {
          userId: session.user.id,
          chatId: validatedData.chatId,
          messageIndex: validatedData.messageIndex,
        },
      },
      update: {
        feedbackType: validatedData.feedbackType,
        messageContent: validatedData.messageContent,
        comment: validatedData.comment,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        chatId: validatedData.chatId,
        messageIndex: validatedData.messageIndex,
        messageRole: validatedData.messageRole,
        feedbackType: validatedData.feedbackType,
        messageContent: validatedData.messageContent,
        comment: validatedData.comment,
      },
    });

    // Log the feedback action to audit logs
    await logMessageFeedback(
      session.user.id,
      session.user.email || '',
      session.user.name || 'Unknown User',
      validatedData.chatId,
      request,
      {
        messageIndex: (validatedData.messageIndex + 1),
        messageRole: validatedData.messageRole,
        feedbackType: validatedData.feedbackType,
        messageContent: validatedData.messageContent,
        previousMessageContent: validatedData.previousMessageContent,
        // hasComment: !!validatedData.comment,
        feedbackId: feedback.id
      },
      true
    );

    return NextResponse.json({
      success: true,
      feedback,
      message: "Feedback saved successfully"
    });

  } catch (error) {
    console.error("Error creating feedback:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request data",
          details: error.issues
        }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

// GET - Retrieve feedback
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = feedbackQuerySchema.parse(queryParams);

    // Verify chat belongs to user
    const chat = await prisma.chatNewVersion.findFirst({
      where: { 
        id: validatedQuery.chatId, 
        userId: session.user.id 
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found or unauthorized" }, 
        { status: 404 }
      );
    }

    // Build where clause
    const whereClause: any = {
      userId: session.user.id,
      chatId: validatedQuery.chatId,
    };

    if (validatedQuery.messageIndex !== undefined) {
      whereClause.messageIndex = validatedQuery.messageIndex;
    }

    // Get feedback
    const feedback = await prisma.messageFeedback.findFirst({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      feedback: feedback || null
    });

  } catch (error) {
    console.error("Error fetching feedback:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid query parameters",
          details: error.issues
        }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

// DELETE - Remove feedback
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validatedQuery = feedbackQuerySchema.parse(queryParams);

    // Verify chat belongs to user
    const chat = await prisma.chatNewVersion.findFirst({
      where: { 
        id: validatedQuery.chatId, 
        userId: session.user.id 
      }
    });

    if (!chat) {
      return NextResponse.json(
        { success: false, error: "Chat not found or unauthorized" }, 
        { status: 404 }
      );
    }

    // Delete feedback
    const deletedFeedback = await prisma.messageFeedback.deleteMany({
      where: {
        userId: session.user.id,
        chatId: validatedQuery.chatId,
        messageIndex: validatedQuery.messageIndex ?? null,
      },
    });

    return NextResponse.json({ 
      success: true, 
      deletedCount: deletedFeedback.count,
      message: "Feedback removed successfully"
    });

  } catch (error) {
    console.error("Error deleting feedback:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid query parameters",
          details: error.issues
        }, 
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" }, 
      { status: 500 }
    );
  }
}