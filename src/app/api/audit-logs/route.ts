// app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from "@/utils/auth-utils-server";
import { prisma } from "@/config/db";

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthSession();

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user has admin or superadmin role
        if (!session.user.roles?.includes('admin') && !session.user.roles?.includes('superadmin') && !session.user.roles?.includes('user')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const action = searchParams.get('action');
        const userId = searchParams.get('userId');
        const organizationId = searchParams.get('organizationId');
        const organizationName = searchParams.get('organizationName'); // Add organization name search param
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const search = searchParams.get('search');

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        // Role-based filtering
        if (session.user.roles?.includes('user')) {
            // Regular users can only see their own audit logs
            where.userId = session.user.id;
        } else if (session.user.roles?.includes('admin')) {
            // Admins can see logs from users in their organization
            // Note: This filter requires the user to exist and have organization associations
            where.OR = [
                {
                    // Logs with user associations in the admin's organization
                    user: {
                        organization: {
                            some: {
                                organizationId: {
                                    in: session.user.organizationId ? [session.user.organizationId] : []
                                }
                            }
                        }
                    }
                },
                {
                    // Logs without user object but with matching userId
                    userId: session.user.id
                }
            ];
        }
        // Superadmins can see all logs (no additional filtering needed)

        if (action && action !== 'all') {
            where.action = action;
        }

        if (userId) {
            where.userId = userId;
        }

        // Organization filtering - support both ID and name
        if ((organizationId && organizationId !== 'all') || organizationName) {
            where.user = {
                ...where.user,
                organization: {
                    some: {
                        ...(organizationId && organizationId !== 'all' ? { organizationId } : {}),
                        ...(organizationName ? {
                            organization: {
                                name: { contains: organizationName, mode: 'insensitive' }
                            }
                        } : {})
                    }
                }
            };
        }

        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) {
                // Set to start of day (00:00:00)
                where.timestamp.gte = new Date(startDate);
            }
            if (endDate) {
                // Set to end of day (23:59:59.999) to include all records from that day
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                where.timestamp.lte = endDateTime;
            }
        }

        if (search) {
            where.OR = [
                { userEmail: { contains: search, mode: 'insensitive' } },
                { userName: { contains: search, mode: 'insensitive' } },
                { ipAddress: { contains: search, mode: 'insensitive' } },
                { action: { contains: search, mode: 'insensitive' } },
                // Add organization name to general search
                {
                    user: {
                        organization: {
                            some: {
                                organization: {
                                    name: { contains: search, mode: 'insensitive' }
                                }
                            }
                        }
                    }
                }
            ];
        }

        // Debug: Log the where clause to see what's being filtered
        console.log('Audit logs query where clause:', JSON.stringify(where, null, 2));

        // Get audit logs with pagination
        const [auditLogs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            username: true,
                            organization: {
                                select: {
                                    organization: {
                                        select: {
                                            id: true,
                                            name: true,
                                            email: true,
                                            address: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.auditLog.count({ where })
        ]);

        // Debug: Check if any CHAT_HISTORY_DELETED logs exist regardless of filters
        const chatDeletedCount = await prisma.auditLog.count({
            where: { action: 'CHAT_HISTORY_DELETED' }
        });
        console.log(`Total CHAT_HISTORY_DELETED logs in database: ${chatDeletedCount}`);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            data: auditLogs,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

// Create audit log entry
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, userEmail, userName, action, details, ipAddress, userAgent, sessionId, success, errorMessage } = body;

        const auditLog = await prisma.auditLog.create({
            data: {
                userId,
                userEmail,
                userName,
                action,
                details,
                ipAddress,
                userAgent,
                sessionId,
                success: success ?? true,
                errorMessage
            }
        });

        return NextResponse.json(auditLog);

    } catch (error) {
        console.error('Error creating audit log:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}