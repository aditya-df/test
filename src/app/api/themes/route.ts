import { getAuthSession } from "@/utils/auth-utils-server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";

// GET /api/themes - Get all themes
export async function GET() {
  try {
    const session = await getAuthSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all default themes and user's custom themes
    const themes = await prisma.theme.findMany({
      where: {
        OR: [
          { isDefault: true },
          { userId: session.user.id }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(themes);
  } catch (error) {
    console.error('Error fetching themes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch themes' },
      { status: 500 }
    );
  }
}

// POST /api/themes - Create a new theme
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has 4 custom themes
    const userThemeCount = await prisma.theme.count({
      where: {
        userId: session.user.id,
        isDefault: false
      }
    });

    if (userThemeCount >= 4) {
      return NextResponse.json(
        { error: 'Maximum theme limit reached. You can only create up to 4 custom themes.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, description, colors } = body;

    if (!name || !colors) {
      return NextResponse.json(
        { error: 'Name and colors are required' },
        { status: 400 }
      );
    }

    // Create new theme
    const theme = await prisma.theme.create({
      data: {
        name,
        description,
        colors,
        userId: session.user.id
      }
    });

    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    console.error('Error creating theme:', error);
    return NextResponse.json(
      { error: 'Failed to create theme' },
      { status: 500 }
    );
  }
}