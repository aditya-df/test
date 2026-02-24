import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";

export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user's session
    const session = await getAuthSession();

    // If no user is authenticated, return unauthorized
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get URL parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    const search = searchParams.get('search') || '';

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json(
        { error: "Invalid pagination parameters" },
        { status: 400 }
      );
    }

    // Get agents that belong to the authenticated user
    const agents = await prisma.agent.findMany({
      where: {
        userId: userId,
        ...(search ? {
          OR: [
            { agentName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        datasource: {
          select: {
            name: true,
            description: true,
            type: true,
          }
        },
        llmModel: {
          select: {
            modelName: true,
            displayName: true,
            provider: true,
          }
        },
        document: {
          select: {
            id: true,
            fileName: true,
            extensionType: true,
          }
        },
        user: {
          select: {
            // id: true,
            name: true,
            email: true,
            // username: true,
            // image: true,
          }
        },
        users: {
          include: {
            user: {
              select: {
                // id: true,
                name: true,
                email: true,
                // username: true,
                // image: true,
                // surname: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    console.log(`Found ${agents.length} agents`);
    console.log('Agents:', agents);

    // Get total count for pagination
    const totalAgents = await prisma.agent.count({
      where: {
        userId: userId,
        ...(search ? {
          OR: [
            { agentName: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      }
    });

    const transformedAgents = agents.map(agent => ({
      ...agent,
      // Ensure user data is properly included
      user: agent.user ? {
        name: agent.user.name,
        email: agent.user.email,
      } : null,
      // Also include all users who have access to this agent
      sharedWith: agent.users?.map(userAgent => ({
        name: userAgent.user.name,
        email: userAgent.user.email,
      })) || []
    }));

    // Return response with pagination data
    const response = {
      data: transformedAgents,
      total: totalAgents,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      totalPages: Math.ceil(totalAgents / limit)
    };

    console.log('Response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}