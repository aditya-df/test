// File: app/api/user-organizations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";
import { AuditAction, logUserAction } from "@/lib/audit-log";

export async function PUT(request: NextRequest) {
    try {
        // Check authentication
        const session = await getAuthSession()

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { userId, organizationIds } = body;

        // Validate required fields
        if (!userId) {
            return NextResponse.json(
                { error: "Missing required field: userId" },
                { status: 400 }
            );
        }

        if (!Array.isArray(organizationIds)) {
            return NextResponse.json(
                { error: "organizationIds must be an array" },
                { status: 400 }
            );
        }

        // Check if user exists
        const userExists = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!userExists) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Validate that all organization IDs exist
        if (organizationIds.length > 0) {
            const existingOrgs = await prisma.organization.findMany({
                where: {
                    id: { in: organizationIds }
                },
                select: { id: true }
            });

            const existingOrgIds = existingOrgs.map(org => org.id);
            const nonExistentOrgIds = organizationIds.filter(id => !existingOrgIds.includes(id));

            if (nonExistentOrgIds.length > 0) {
                return NextResponse.json(
                    {
                        error: "Some organizations not found",
                        nonExistentOrganizations: nonExistentOrgIds
                    },
                    { status: 400 }
                );
            }
        }

        // Capture previous organization assignments for audit log
        const previousUserOrgs = await prisma.userOnOrganization.findMany({
            where: { userId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        const previousOrgIds = previousUserOrgs.map(uo => uo.organizationId);

        // Use transaction to update user organizations
        const result = await prisma.$transaction(async (tx) => {
            // First, delete all existing organization associations for this user
            await tx.userOnOrganization.deleteMany({
                where: {
                    userId: userId,
                },
            });

            // If organizationIds is not empty, create new associations
            if (organizationIds.length > 0) {
                const userOrgData = organizationIds.map((orgId: string) => ({
                    userId: userId,
                    organizationId: orgId,
                }));

                await tx.userOnOrganization.createMany({
                    data: userOrgData,
                });
            }

            // Return updated user with organizations
            return await tx.user.findUnique({
                where: { id: userId },
                include: {
                    organization: {
                        include: {
                            organization: {
                                select: {
                                    id: true,
                                    name: true,
                                    address: true,
                                    email: true,
                                    phone: true,
                                }
                            }
                        }
                    }
                }
            });
        });

        // Calculate added and removed organizations
        const addedOrgIds = organizationIds.filter((id: string) => !previousOrgIds.includes(id));
        const removedOrgIds = previousOrgIds.filter(id => !organizationIds.includes(id));

        // Log organization assignment update to audit logs
        try {
            await logUserAction(
                session.user?.id || 'unknown',
                session.user?.email || 'unknown',
                session.user?.name || 'Unknown User',
                AuditAction.USER_ORGANIZATION_UPDATED,
                request,
                {
                    targetUserId: result?.id,
                    targetUserEmail: result?.email,
                    targetUserName: result?.name,
                    previousOrganizations: previousUserOrgs.map(uo => ({
                        id: uo.organization.id,
                        name: uo.organization.name,
                    })),
                    newOrganizations: result?.organization?.map(uo => ({
                        id: uo.organization.id,
                        name: uo.organization.name,
                    })) || [],
                    addedOrgIds,
                    removedOrgIds,
                    totalPrevious: previousOrgIds.length,
                    totalNew: organizationIds.length,
                },
                true
            );
        } catch (auditError) {
            console.error('Failed to create audit log for organization assignment update:', auditError);
        }

        return NextResponse.json({
            message: "User organizations updated successfully",
            user: result,
        });

    } catch (error) {
        console.error("Error updating user organizations:", error);

        return NextResponse.json(
            {
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}