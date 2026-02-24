import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.systemSettings.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching timeout settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeout settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { timeout: sessionTimeout, warning: warningTime } = await req.json();

    // Validate input
    if (typeof sessionTimeout !== "number" || sessionTimeout < 60) {
      // Minimum 1 minute
      return NextResponse.json(
        { error: "Invalid session timeout value" },
        { status: 400 }
      );
    }

    if (typeof warningTime !== "number" || warningTime < 0) {
      return NextResponse.json(
        { error: "Invalid warning time value" },
        { status: 400 }
      );
    }

    // Update or create settings
    const settings = await prisma.systemSettings.upsert({
      where: {
        id: session.user.id,
      },
      update: {
        sessionTimeout,
        warningTime,
        updatedAt: new Date(),
      },
      create: {
        id: session.user.id,
        userId: session.user.id,
        sessionTimeout,
        warningTime,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating timeout settings:", error);
    return NextResponse.json(
      { error: "Failed to update timeout settings" },
      { status: 500 }
    );
  }
}
