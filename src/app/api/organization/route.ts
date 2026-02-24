import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    const userEmail = session?.user.email;
    console.log("user email", userEmail);

    const user = await prisma.user.findUnique({
      where: {
        email: userEmail as string,
      },
    });

    console.log("user id", user?.id);

    const body = await req.json();
    console.log("body", body);

    const { name, address, phone, email } = body;
    console.log("data body", name, address, phone, email);

    const organization = await prisma.organization.create({
      data: {
        name,
        address,
        phone,
        email,
        user: {
          create: {
            user: {
              connect: { id: user?.id },
            },
          },
        },
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: user?.id },
      data: { onboardingCompleted: true },
    });

    return Response.json({ data: organization, updateStatus: updatedUser });
  } catch (error) {
    return Response.json(
      {
        message: "Internal server error : " + error,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin or superadmin role
    if (!session.user.roles?.includes('admin') && !session.user.roles?.includes('superadmin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let organizations;

    if (session.user.roles?.includes('superadmin')) {
      // Superadmin can see all organizations
      organizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc'
        }
      });
    } else if (session.user.roles?.includes('admin')) {
      // Admin can only see their own organizations
      organizations = await prisma.organization.findMany({
        where: {
          id: {
            in: session.user.organizationId ? [session.user.organizationId] : []
          }
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc'
        }
      });
    }

    return NextResponse.json(organizations || []);

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}