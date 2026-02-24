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

        const now = new Date();
        const startOfWeek = new Date(now);
        const day = now.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        startOfWeek.setDate(now.getDate() + diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Get performance metrics from ChatNewVersion
        const [responseTimeData, totalRequests] = await Promise.all([
            // Average response time this week
            prisma.chatNewVersion.aggregate({
                where: {
                    AND: [
                        { userId: { in: userIds } },
                        { createdAt: { gte: startOfWeek } },
                        { totalResponseTime: { not: null } },
                        { totalResponseTime: { gt: 0 } },
                    ],
                },
                _avg: { totalResponseTime: true },
                _count: { id: true },
            }),

            // Total requests this week
            prisma.chatNewVersion.count({
                where: {
                    AND: [
                        { userId: { in: userIds } },
                        { createdAt: { gte: startOfWeek } },
                    ],
                },
            }),

            // Start of month for uptime calculation
            new Date(now.getFullYear(), now.getMonth(), 1)
        ]);

        // Calculate error rate based on chats without responses or with very high response times
        const errorChats = await prisma.chatNewVersion.count({
            where: {
                AND: [
                    { userId: { in: userIds } },
                    { createdAt: { gte: startOfWeek } },
                    {
                        OR: [
                            { totalResponseTime: null },
                            { totalResponseTime: { gt: 30000 } }, // > 30 seconds considered error
                        ]
                    }
                ],
            },
        });

        const avgResponseTime = responseTimeData._avg.totalResponseTime
            ? responseTimeData._avg.totalResponseTime / 1000
            : 0;

        const errorRate = totalRequests > 0 ? (errorChats / totalRequests) * 100 : 0;

        // Calculate uptime (assume 99.9% base uptime, reduce based on error rate)
        const uptimePercentage = Math.max(95, 99.9 - (errorRate * 0.1));

        // Calculate downtime in minutes for the month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const totalMinutesInMonth = daysInMonth * 24 * 60;
        const downtime = Math.round(totalMinutesInMonth * (100 - uptimePercentage) / 100);

        const metrics = {
            avgResponseTime,
            totalRequests,
            totalErrors: errorChats,
            errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
            uptimePercentage: Math.round(uptimePercentage * 100) / 100,
            downtime
        };

        return NextResponse.json(metrics);
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        return NextResponse.json({ error: 'Failed to fetch performance metrics' }, { status: 500 });
    }
}
