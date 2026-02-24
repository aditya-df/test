import { prisma } from "@/config/db";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth.config";
import { AuditAction, logUserAction } from "@/lib/audit-log";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { role, isVerified } = body;

    if (!id) {
      return Response.json(
        {
          message: "Id parameter not found",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return Response.json(
        {
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Get current session for audit logging
    const session = await auth();

    let updatedData;

    // Modify the relevant section of the API route
    if (Object.values(UserRole).includes(role)) {
      const previousRole = user.role;

      updatedData = await prisma.user.update({
        where: { id },
        data: { role: [role as UserRole] },
        // Include the organization data in the response
        include: {
          organization: {
            include: {
              organization: true,
            },
          },
        },
      });

      // Log role update to audit logs
      try {
        await logUserAction(
          session?.user?.id || 'unknown',
          session?.user?.email || 'unknown',
          session?.user?.name || 'Unknown User',
          AuditAction.USER_ROLE_UPDATED,
          request,
          {
            targetUserId: user.id,
            targetUserEmail: user.email,
            targetUserName: user.name,
            previousRole: previousRole,
            newRole: [role],
          },
          true
        );
      } catch (auditError) {
        console.error('Failed to create audit log for role update:', auditError);
      }
    } else if (isVerified !== undefined) {
      const previousVerification = user.isVerified;

      updatedData = await prisma.user.update({
        where: { id },
        data: { isVerified: isVerified },
        // Include the organization data in the response
        include: {
          organization: {
            include: {
              organization: true,
            },
          },
        },
      });

      // Log verification status update to audit logs
      try {
        await logUserAction(
          session?.user?.id || 'unknown',
          session?.user?.email || 'unknown',
          session?.user?.name || 'Unknown User',
          AuditAction.USER_ROLE_UPDATED,
          request,
          {
            targetUserId: user.id,
            targetUserEmail: user.email,
            targetUserName: user.name,
            previousVerification: previousVerification,
            newVerification: isVerified,
            updateType: 'verification'
          },
          true
        );
      } catch (auditError) {
        console.error('Failed to create audit log for verification update:', auditError);
      }
    }

    return Response.json({ data: updatedData });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return Response.json(
        {
          message: "Id parameter not found",
        },
        { status: 400 }
      );
    }

    // Capture user details before deletion for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: {
        organization: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!userToDelete) {
      return Response.json(
        {
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Get current session for audit logging
    const session = await auth();

    const deleteData = await prisma.user.delete({
      where: { id },
    });

    // Log user deletion to audit logs
    try {
      await logUserAction(
        session?.user?.id || 'unknown',
        session?.user?.email || 'unknown',
        session?.user?.name || 'Unknown User',
        AuditAction.USER_DELETED,
        request,
        {
          deletedUserId: userToDelete.id,
          deletedUserEmail: userToDelete.email,
          deletedUserName: userToDelete.name,
          deletedUserRole: userToDelete.role,
          deletedUserOrganizations: userToDelete.organization.map(org => ({
            id: org.organization.id,
            name: org.organization.name
          })),
        },
        true
      );
    } catch (auditError) {
      console.error('Failed to create audit log for user deletion:', auditError);
    }

    return Response.json({ data: deleteData });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
