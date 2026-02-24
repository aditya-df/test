import { getAuthSession } from "@/utils/auth-utils-server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";

// GET /api/themes/[id] - Get a single theme by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const theme = await prisma.theme.findUnique({
      where: {
        id
      }
    });

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this theme
    if (!theme.isDefault && theme.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json(theme);
  } catch (error) {
    console.error('Error fetching theme:', error);
    return NextResponse.json(
      { error: 'Failed to fetch theme' },
      { status: 500 }
    );
  }
}

// PUT /api/themes/[id] - Update a theme
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const theme = await prisma.theme.findUnique({
      where: {
        id
      }
    });

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Check if user owns this theme (cannot edit default themes or other users' themes)
    if (theme.isDefault) {
      return NextResponse.json(
        { error: 'Cannot edit default themes' },
        { status: 403 }
      );
    }

    if (theme.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
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

    // Update theme
    const updatedTheme = await prisma.theme.update({
      where: {
        id
      },
      data: {
        name,
        description,
        colors
      }
    });

    return NextResponse.json(updatedTheme);
  } catch (error) {
    console.error('Error updating theme:', error);
    return NextResponse.json(
      { error: 'Failed to update theme' },
      { status: 500 }
    );
  }
}

// DELETE /api/themes/[id] - Delete a theme
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const theme = await prisma.theme.findUnique({
      where: {
        id
      }
    });

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Check if user owns this theme (cannot delete default themes or other users' themes)
    if (theme.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default themes' },
        { status: 403 }
      );
    }

    if (theme.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete theme
    await prisma.theme.delete({
      where: {
        id
      }
    });

    return NextResponse.json({ success: true, message: 'Theme deleted successfully' });
  } catch (error) {
    console.error('Error deleting theme:', error);
    return NextResponse.json(
      { error: 'Failed to delete theme' },
      { status: 500 }
    );
  }
}
