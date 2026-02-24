import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/utils/auth-utils-server";
import { prisma } from "@/config/db";

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    // Clean and prepare search query
    const cleanQuery = query.trim();
    
    // Split the query into individual terms for more flexible searching
    const searchTerms = cleanQuery.split(/[\s_-]+/).filter(term => term.length > 0);
    
    // Build search conditions
    const searchConditions = [];

    // Add conditions for each individual term
    for (const term of searchTerms) {
      searchConditions.push(
        {
          agentName: {
            contains: term,
            mode: 'insensitive' as const
          }
        },
        {
          description: {
            contains: term,
            mode: 'insensitive' as const
          }
        }
      );
    }

    // Also add the full query as a search term
    searchConditions.push(
      {
        agentName: {
          contains: cleanQuery,
          mode: 'insensitive' as const
        }
      },
      {
        description: {
          contains: cleanQuery,
          mode: 'insensitive' as const
        }
      }
    );

    // Check if user is admin or superadmin
    const isAdmin = session.user.roles.some((role) => 
      ["admin", "superadmin"].includes(role)
    );

    let agents;

    if (isAdmin) {
      // Admin/Super Admin: Search ALL agents in their organization
      agents = await prisma.agent.findMany({
        where: {
          AND: [
            {
              // Agent belongs to the same organization
              user: {
                organization: {
                  some: {
                    organizationId: session.user.organizationId,
                  },
                },
              },
            },
            {
              // Search criteria - match any of the search conditions
              OR: searchConditions,
            },
          ],
        },
        take: limit,
        orderBy: [
          {
            agentName: "asc",
          },
        ],
      });
    } else {
      // Regular user: Search only assigned agents
      agents = await prisma.agent.findMany({
        where: {
          AND: [
            {
              // User has access to this agent through UserAgent table
              users: {
                some: {
                  userId: session.user.id,
                },
              },
            },
            {
              // Agent belongs to the same organization
              user: {
                organization: {
                  some: {
                    organizationId: session.user.organizationId,
                  },
                },
              },
            },
            {
              // Search criteria - match any of the search conditions
              OR: searchConditions,
            },
          ],
        },
        take: limit,
        orderBy: [
          {
            agentName: "asc",
          },
        ],
      });
    }

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Error searching agents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
