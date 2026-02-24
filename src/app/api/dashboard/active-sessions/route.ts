import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/config/db";
import { auth } from '@/auth.config';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { organizationIds } = await request.json();

        // Get users in organizations with their latest chat activity
        const usersInOrgs = await prisma.userOnOrganization.findMany({
            where: { organizationId: { in: organizationIds } },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        // FIXED: Use correct relation name from schema
                        ChatNewVersion: {
                            select: {
                                createdAt: true,
                            },
                            orderBy: {
                                createdAt: 'desc'
                            },
                            take: 1
                        }
                    }
                }
            }
        });

        // Filter for recently active users (last 30 minutes)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const activeUsers = usersInOrgs
            .filter(userOrg => {
                // FIXED: Use correct property name
                const lastChat = userOrg.user.ChatNewVersion[0];
                return lastChat && lastChat.createdAt > thirtyMinutesAgo;
            })
            .map(userOrg => {
                // FIXED: Use correct property name
                const lastChat = userOrg.user.ChatNewVersion[0];
                return {
                    id: userOrg.user.id,
                    name: userOrg.user.name || "Unknown User",
                    email: userOrg.user.email || "no-email@example.com",
                    role: userOrg.user.role[0] || "user",
                    lastActivity: getTimeAgo(lastChat.createdAt),
                    location: "Jakarta",
                    device: getRandomDevice()
                };
            });

        return NextResponse.json({ activeUsers });
    } catch (error) {
        console.error('Error fetching active sessions:', error);
        return NextResponse.json({ error: 'Failed to fetch active sessions' }, { status: 500 });
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

function getRandomDevice(): string {
    const devices = ["Desktop", "Mobile", "Tablet"];
    return devices[Math.floor(Math.random() * devices.length)];
}