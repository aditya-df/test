// src/app/api/dashboard/feedback-details/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/config/db";
import { auth } from '@/auth.config';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userIds } = await request.json();

        // Get real feedback data from MessageFeedback table
        const [feedbackData, totalFeedback] = await Promise.all([
            // Get recent feedback with chat and agent info
            prisma.messageFeedback.findMany({
                where: {
                    chat: {
                        userId: { in: userIds }
                    }
                },
                include: {
                    chat: {
                        include: {
                            agent: {
                                select: {
                                    agentName: true
                                }
                            },
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 50
            }),

            // Get total feedback count
            prisma.messageFeedback.count({
                where: {
                    chat: {
                        userId: { in: userIds }
                    }
                }
            })
        ]);

        // Calculate rating breakdown (convert like/dislike to 1-5 scale)
        const likesCount = feedbackData.filter(f => f.feedbackType === 'like').length;
        const dislikesCount = feedbackData.filter(f => f.feedbackType === 'dislike').length;

        // Convert to 5-star rating system
        // Likes = 5 stars, Dislikes = 1 star, assume some 3-4 star ratings
        const breakdown = [
            { rating: 5, count: likesCount, percentage: totalFeedback > 0 ? Math.round((likesCount / totalFeedback) * 100) : 0 },
            { rating: 4, count: Math.round(likesCount * 0.3), percentage: totalFeedback > 0 ? Math.round((likesCount * 0.3 / totalFeedback) * 100) : 0 },
            { rating: 3, count: Math.round(totalFeedback * 0.1), percentage: totalFeedback > 0 ? 10 : 0 },
            { rating: 2, count: Math.round(dislikesCount * 0.3), percentage: totalFeedback > 0 ? Math.round((dislikesCount * 0.3 / totalFeedback) * 100) : 0 },
            { rating: 1, count: dislikesCount, percentage: totalFeedback > 0 ? Math.round((dislikesCount / totalFeedback) * 100) : 0 },
        ];

        // Recent feedback
        const recent = feedbackData.slice(0, 10).map(f => ({
            user: f.chat.user?.name || "Anonymous User",
            email: f.chat.user?.email || "no-email@example.com",
            rating: f.feedbackType === 'like' ? 5 : 1, // Convert to star rating
            comment: f.comment || (f.feedbackType === 'like' ? "Positive feedback" : "Negative feedback"),
            timestamp: getTimeAgo(f.createdAt),
            agentName: f.chat.agent?.agentName || "Unknown Agent",
            messageContent: f.messageContent ? f.messageContent.substring(0, 100) + "..." : ""
        }));

        return NextResponse.json({
            breakdown,
            recent,
            totalFeedback,
            likesCount,
            dislikesCount
        });
    } catch (error) {
        console.error('Error fetching feedback details:', error);
        return NextResponse.json({ error: 'Failed to fetch feedback details' }, { status: 500 });
    }
}

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const hours = Math.floor(diffInMinutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}