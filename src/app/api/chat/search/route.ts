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
    const searchPattern = `%${cleanQuery}%`;

    // Search through chat messages for the user
    const chats = await prisma.$queryRaw`
      SELECT DISTINCT 
        c.id, 
        c.messages, 
        c."createdAt", 
        c."userId",
        c."agentId"
      FROM "ChatNewVersion" c
      WHERE c."userId" = ${session.user.id}
        AND (
          c.messages::text ILIKE ${searchPattern}
        )
      ORDER BY c."createdAt" DESC
      LIMIT ${limit}
    `;

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Error searching chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}