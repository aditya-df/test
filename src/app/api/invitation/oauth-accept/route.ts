// src/app/api/invitation/oauth-accept/route.ts
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();
        const session = await getAuthSession();

        if (!session?.user?.id) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!token) {
            return NextResponse.json(
                { message: "Token is required" },
                { status: 400 }
            );
        }

        // Find the invitation
        const invitation = await prisma.invitationToken.findFirst({
            where: {
                token: token,
                expires: {
                    gt: new Date(),
                },
            },
        });

        if (!invitation) {
            return NextResponse.json(
                { message: "Invalid or expired invitation" },
                { status: 400 }
            );
        }

        // Check if user's email matches invitation email
        if (session.user.email !== invitation.email) {
            return NextResponse.json(
                { message: "Email mismatch. Please sign in with the invited email address." },
                { status: 400 }
            );
        }

        // Check if user is already in the organization
        const existingMembership = await prisma.userOnOrganization.findUnique({
            where: {
                userId_organizationId: {
                    userId: session.user.id,
                    organizationId: invitation.organizationId
                }
            }
        });

        if (existingMembership) {
            // Delete the invitation token since user is already a member
            await prisma.invitationToken.delete({
                where: {
                    email_organizationId: {
                        email: invitation.email,
                        organizationId: invitation.organizationId
                    }
                }
            });

            return NextResponse.json({
                message: "You are already a member of this organization",
                alreadyMember: true
            });
        }

        // Add user to organization
        await prisma.userOnOrganization.create({
            data: {
                userId: session.user.id,
                organizationId: invitation.organizationId
            }
        });

        // Delete the invitation token
        await prisma.invitationToken.delete({
            where: {
                email_organizationId: {
                    email: invitation.email,
                    organizationId: invitation.organizationId
                }
            }
        });

        return NextResponse.json({
            message: "Successfully joined the organization",
            success: true
        });

    } catch (error) {
        console.error("Error accepting OAuth invitation:", error);
        return NextResponse.json(
            { message: "Failed to accept invitation" },
            { status: 500 }
        );
    }
}