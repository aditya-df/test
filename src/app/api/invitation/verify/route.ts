// app/api/invitation/verify/route.ts
import { prisma } from "@/config/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json(
                { valid: false, message: "Token is required" },
                { status: 400 }
            );
        }

        // console.log("Verifying token:", token); // Debug log

        const invitation = await prisma.invitationToken.findFirst({
            where: {
                token: token,
                expires: {
                    gt: new Date(),
                },
            },
            include: {
                User: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                organization: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // console.log("Found invitation:", invitation); // Debug log

        if (!invitation) {
            return NextResponse.json(
                { valid: false, message: "Invalid or expired invitation" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            valid: true,
            invitation: {
                email: invitation.email,
                organizationId: invitation.organizationId,
                organizationName: invitation.organization.name,
                invitedBy: invitation.User ? {
                    name: invitation.User.name,
                    email: invitation.User.email,
                    image: invitation.User.image
                } : null,
                expires: invitation.expires,
                createdAt: invitation.createdAt
            }
        });
    } catch (error) {
        console.error("Error verifying invitation:", error);
        return NextResponse.json(
            { valid: false, message: "Failed to verify invitation" },
            { status: 500 }
        );
    }
}