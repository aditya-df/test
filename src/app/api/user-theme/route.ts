// src/app/api/user-theme/route.ts
import { getAuthSession } from "@/utils/auth-utils-server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";

// GET /api/user-theme - Get user's active theme
export async function GET() {
  try {
    const session = await getAuthSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's active theme
    const userTheme = await prisma.userTheme.findFirst({
      where: {
        userId: session.user.id,
        isActive: true
      },
      include: {
        theme: true
      }
    });

    return NextResponse.json({
      data: {
        theme: userTheme?.theme || null,
        isActive: !!userTheme
      }
    });
  } catch (error) {
    console.error('Error fetching user theme:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user theme' },
      { status: 500 }
    );
  }
}

// POST /api/user-theme - Set user's active theme
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { themeId } = body;

    // Handle null themeId - deactivate all themes (go back to default)
    if (themeId === null || themeId === undefined) {
      // Deactivate all user themes
      await prisma.userTheme.updateMany({
        where: {
          userId: session.user.id,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      return NextResponse.json({
        data: {
          theme: null,
          isActive: false,
          message: 'All themes deactivated'
        }
      });
    }

    // Validate themeId is a string
    if (typeof themeId !== 'string' || themeId.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid theme ID' },
        { status: 400 }
      );
    }

    // Check if theme exists
    const theme = await prisma.theme.findUnique({
      where: {
        id: themeId
      }
    });

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Deactivate all user themes first
    await prisma.userTheme.updateMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    // Check if user already has this theme
    const existingUserTheme = await prisma.userTheme.findFirst({
      where: {
        userId: session.user.id,
        themeId
      }
    });

    let userTheme;

    if (existingUserTheme) {
      // Update existing user theme
      userTheme = await prisma.userTheme.update({
        where: {
          id: existingUserTheme.id
        },
        data: {
          isActive: true
        },
        include: {
          theme: true
        }
      });
    } else {
      // Create new user theme
      userTheme = await prisma.userTheme.create({
        data: {
          userId: session.user.id,
          themeId,
          isActive: true
        },
        include: {
          theme: true
        }
      });
    }

    return NextResponse.json({
      data: userTheme
    });
  } catch (error) {
    console.error('Error setting user theme:', error);
    return NextResponse.json(
      { error: 'Failed to set user theme' },
      { status: 500 }
    );
  }
}

// DELETE /api/user-theme - Deactivate all themes (alternative endpoint)
export async function DELETE() {
  try {
    const session = await getAuthSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Deactivate all user themes
    await prisma.userTheme.updateMany({
      where: {
        userId: session.user.id,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    return NextResponse.json({
      data: {
        theme: null,
        isActive: false,
        message: 'All themes deactivated'
      }
    });
  } catch (error) {
    console.error('Error deactivating themes:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate themes' },
      { status: 500 }
    );
  }
}