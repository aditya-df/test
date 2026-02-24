import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/utils/auth-utils-server";
import { prisma } from "@/config/db";
import { AuditAction, logUserAction } from "@/lib/audit-log";

// GET: Fetch user-agent assignments
export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin/superadmin
    if (
      !session.user.roles.some((role) => ["admin", "superadmin"].includes(role))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all user-agent assignments with agent details but only for the same organization
    const userAgents = await prisma.userAgent.findMany({
      where: {
        agent: {
          user: {
            organization: {
              some: {
                organizationId: session.user.organizationId,
              },
            },
          },
        },
      },
      include: {
        agent: true,
      },
    });

    // Group by userId for easier consumption
    const groupedByUser = userAgents.reduce((acc, ua) => {
      if (!acc[ua.userId]) {
        acc[ua.userId] = [];
      }
      acc[ua.userId].push(ua);
      return acc;
    }, {} as Record<string, typeof userAgents>);

    return NextResponse.json(groupedByUser);
  } catch (error) {
    console.error("Error fetching user agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Update user-agent assignments
// This endpoint ONLY updates user-agent relationships, not user properties
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin/superadmin
    if (
      !session.user.roles.some((role) => ["admin", "superadmin"].includes(role))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, agentIds } = await req.json();

    if (!userId || !Array.isArray(agentIds)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Capture previous agent assignments for audit log
    const previousUserAgents = await prisma.userAgent.findMany({
      where: { userId },
      include: {
        agent: {
          select: {
            id: true,
            agentName: true,
          },
        },
      },
    });

    const previousAgentIds = previousUserAgents.map(ua => ua.agentId);

    // Get target user details for audit log
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Delete existing assignments for this user
    await prisma.userAgent.deleteMany({
      where: { userId },
    });

    // Create new assignments - with duplicate prevention
    if (agentIds.length > 0) {
      // Remove duplicates from agentIds array
      const uniqueAgentIds = [...new Set(agentIds)];

      try {
        await prisma.userAgent.createMany({
          data: uniqueAgentIds.map((agentId) => ({
            userId,
            agentId,
          })),
        });
      } catch (createError: any) {
        // If a unique constraint error still occurs, handle it gracefully
        console.error("Error creating user agents:", createError);

        // Alternative approach: create records one by one to avoid failing the entire batch
        if (createError.code === "P2002") {
          console.log("Falling back to individual record creation");

          for (const agentId of uniqueAgentIds) {
            try {
              await prisma.userAgent.create({
                data: {
                  userId,
                  agentId,
                },
              });
            } catch (innerError: any) {
              // Skip duplicate entries but log them
              if (innerError.code === "P2002") {
                console.log(
                  `Skipping duplicate entry for userId: ${userId}, agentId: ${agentId}`
                );
              } else {
                throw innerError;
              }
            }
          }
        } else {
          throw createError;
        }
      }
    }

    // Get new agent assignments with details for audit log
    const newUserAgents = await prisma.userAgent.findMany({
      where: { userId },
      include: {
        agent: {
          select: {
            id: true,
            agentName: true,
          },
        },
      },
    });

    // Calculate added and removed agents
    const newAgentIds = agentIds.filter((id): id is string => typeof id === 'string');
    const addedAgentIds = newAgentIds.filter(id => !previousAgentIds.includes(id));
    const removedAgentIds = previousAgentIds.filter(id => !newAgentIds.includes(id));

    // Log agent assignment update to audit logs
    try {
      await logUserAction(
        session.user.id || 'unknown',
        session.user.email || 'unknown',
        session.user.name || 'Unknown User',
        AuditAction.USER_AGENTS_UPDATED,
        req,
        {
          targetUserId: targetUser?.id,
          targetUserEmail: targetUser?.email,
          targetUserName: targetUser?.name,
          previousAgents: previousUserAgents.map(ua => ({
            id: ua.agent.id,
            name: ua.agent.agentName,
          })),
          newAgents: newUserAgents.map(ua => ({
            id: ua.agent.id,
            name: ua.agent.agentName,
          })),
          addedAgentIds,
          removedAgentIds,
          totalPrevious: previousAgentIds.length,
          totalNew: newAgentIds.length,
        },
        true
      );
    } catch (auditError) {
      console.error('Failed to create audit log for agent assignment update:', auditError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user agents:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
