import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/config/db";
import type { Adapter } from "next-auth/adapters";

/**
 * Custom Prisma adapter wrapper that handles verification token deletion errors gracefully
 */
export function createPrismaAdapterWrapper(): Adapter {
  const baseAdapter = PrismaAdapter(prisma);
  
  return {
    ...baseAdapter,
    async useVerificationToken(identifier_token) {
      try {
        // Try to use (delete) the verification token
        const result = await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: identifier_token.identifier,
              token: identifier_token.token,
            },
          },
        });
        return result;
      } catch (error: any) {
        // Handle the case where the token doesn't exist or has already been used
        if (error.code === 'P2025' || error.message?.includes('No record was found for a delete')) {
          console.warn('Verification token not found or already used:', identifier_token);
          // Return null to indicate the token is invalid/expired
          return null;
        }
        // Re-throw other errors
        throw error;
      }
    },
  };
}