import { prisma } from "@/config/db";
import crypto from "crypto";

export async function createUserSession(userId: string) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  try {
    // Remove any existing sessions for this user (optional - for single session per user)
    await prisma.session.deleteMany({ where: { userId } });

    const session = await prisma.session.create({
      data: {
        sessionToken,
        userId,
        expires,
      },
    });

    return session.sessionToken;
  } catch (error) {
    console.error("Error creating user session:", error);
    return null;
  }
}

export async function removeUserSession(sessionToken: string) {
  try {
    // First check if the session exists and include the user relation
    const existingSession = await prisma.session.findUnique({
      where: { sessionToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      },
    });

    if (!existingSession) {
      console.log(`Session ${sessionToken} not found, may have already been deleted`);
      return null;
    }

    // Delete the session
    await prisma.session.delete({
      where: { sessionToken },
    });

    console.log(`Successfully removed session: ${sessionToken}`);

    // Return user data for audit logging
    return {
      userId: existingSession.userId,
      userEmail: existingSession.user?.email,
      userName: existingSession.user?.name,
    };
  } catch (error) {
    console.error("Error removing user session:", error);
    return null;
  }
}
export async function getActiveSessionsCount(organizationIds: string[]) {
  try {
    const count = await prisma.session.count({
      where: {
        AND: [
          { expires: { gt: new Date() } },
          {
            user: {
              organization: {
                some: { organizationId: { in: organizationIds } }
              }
            }
          }
        ]
      }
    });

    return count;
  } catch (error) {
    console.error("Error getting active sessions count:", error);
    return 0;
  }
}

// Cleanup expired sessions (run this periodically)
export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expires: { lt: new Date() }
      }
    });
    return result.count;
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return 0;
  }
}