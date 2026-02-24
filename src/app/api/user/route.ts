/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/utils/auth-utils-server';
import { prisma } from '@/config/db';

export async function GET() {
  try {
    const data = await prisma.user.findMany({
      where: {
        onboardingCompleted: true,
      },
    });

    if (!data) {
      return Response.json(
        {
          message: "User not found",
        },
        { status: 404 },
      );
    }

    return Response.json({ data });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user has admin permissions
    if (!user.roles.includes('admin') && !user.roles.includes('superadmin')) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const updateData = await req.json();
    
    // Filter out complex fields that can't be directly updated
    const {
      organization, // Remove this field
      assignedAgents, // Remove this field
      ...safeUpdateData // Keep only simple fields
    } = updateData;

    console.log('Safe update data:', safeUpdateData);

    const updatedUser = await prisma.user.update({
      where: { id: updateData.id },
      data: safeUpdateData,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
