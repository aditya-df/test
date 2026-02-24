import { NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { prisma } from "@/config/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.organizationId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized or missing organization" }, 
        { status: 401 }
      );
    }

    // Get all users in the same organization
    const organizationUsers = await prisma.user.findMany({
      where: {
        organization: {
          some: {
            organizationId: session.user.organizationId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    const organizationUserIds = organizationUsers.map(user => user.id);

    // Get feedback statistics for the entire organization's chats
    const feedbackStats = await prisma.messageFeedback.groupBy({
      by: ['feedbackType'],
      where: {
        userId: {
          in: organizationUserIds,
        },
      },
      _count: {
        feedbackType: true,
      },
    });

    // Calculate satisfaction metrics
    const likes = feedbackStats.find(stat => stat.feedbackType === 'like')?._count.feedbackType || 0;
    const dislikes = feedbackStats.find(stat => stat.feedbackType === 'dislike')?._count.feedbackType || 0;
    const totalFeedback = likes + dislikes;
    
    // Calculate satisfaction percentage and rating
    const satisfactionPercentage = totalFeedback > 0 ? (likes / totalFeedback) * 100 : 0;
    const avgRating = totalFeedback > 0 ? (likes / totalFeedback) * 5 : 0;

    // Get recent feedback for trend analysis (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentFeedbackStats = await prisma.messageFeedback.groupBy({
      by: ['feedbackType'],
      where: {
        userId: {
          in: organizationUserIds,
        },
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        feedbackType: true,
      },
    });

    const recentLikes = recentFeedbackStats.find(stat => stat.feedbackType === 'like')?._count.feedbackType || 0;
    const recentDislikes = recentFeedbackStats.find(stat => stat.feedbackType === 'dislike')?._count.feedbackType || 0;
    const recentTotal = recentLikes + recentDislikes;
    const recentSatisfactionPercentage = recentTotal > 0 ? (recentLikes / recentTotal) * 100 : 0;

    // Calculate trend (comparison with overall satisfaction)
    const trend = satisfactionPercentage - recentSatisfactionPercentage;

    return NextResponse.json({
      success: true,
      data: {
        totalFeedback,
        likes,
        dislikes,
        satisfactionPercentage: Math.round(satisfactionPercentage * 100) / 100, // Round to 2 decimal places
        avgRating: Math.round(avgRating * 100) / 100, // Round to 2 decimal places
        recentFeedback: {
          total: recentTotal,
          likes: recentLikes,
          dislikes: recentDislikes,
          satisfactionPercentage: Math.round(recentSatisfactionPercentage * 100) / 100,
        },
        trend: Math.round(trend * 100) / 100, // Positive means improving, negative means declining
      },
    });

  } catch (error) {
    console.error("Error fetching feedback statistics:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" }, 
      { status: 500 }
    );
  }
}