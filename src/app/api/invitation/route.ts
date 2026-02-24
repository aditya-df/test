import { prisma } from "@/config/db";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();

        if (!token) {
            return Response.json({
                message: "Token is required",
                valid: false
            }, { status: 400 });
        }

        console.log("Verifying invitation token:", token); // Debug log


        const invitation = await prisma.invitationToken.findFirst({
            where: {
                token: token,
                expires: {
                    gt: new Date(),
                },
            },
        });

        console.log("Found invitation:", invitation); // Debug log

        if (!invitation) {
            return Response.json({
                message: "Invalid invitation token",
                valid: false
            }, { status: 404 });
        }

        const now = new Date();
        const isExpired = now > invitation.expires;

        return Response.json({
            valid: !isExpired,
            message: isExpired ? "Invitation has expired" : "Invitation is valid",
            data: isExpired ? null : invitation
        });
    } catch (error) {
        console.error(error);
        return Response.json({
            message: "Internal server error",
            valid: false
        }, { status: 500 });
    }
}