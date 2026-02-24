import { prisma } from "@/config/db";
import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic'

export async function GET (req: NextRequest) {
    try {
        const token = req.nextUrl.searchParams.get('token')

        const validInvitation = await prisma.invitationToken.findFirst({
            where: {
                token: token as string
            }
        })

        if(validInvitation) {
            const isTokenValid =  validInvitation.expires > new Date()

            if(!isTokenValid) {
                return Response.json({
                    message: "Link already expires"
                }, { status: 400 })
            }

            return Response.json({
                message: "Link is valid"
            }, { status: 200 })
        }

        return Response.json({
            message: "Token not found"
        }, { status: 404 })

    } catch (error) {
        console.error(error)
        return Response.json({
            message: "Internal server error"
        }, { status: 500 })
    }
}