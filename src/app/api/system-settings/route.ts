import { NextResponse } from 'next/server';
import { auth } from "@/auth.config";
import { prisma } from "@/config/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const systemSetting = await prisma.systemSettings.findFirst({
            where: {
                userId: session.user.id,
            },
            select: {
                id: true,
                userId: true,
                sessionTimeout: true,
                warningTime: true,
                updatedAt: true
            }
        });

        return NextResponse.json(systemSetting);
    } catch (error) {
        console.error('Error fetching system settings:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}