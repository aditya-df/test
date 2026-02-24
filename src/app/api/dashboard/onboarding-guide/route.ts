import { prisma } from '@/config/db'
import {  NextResponse } from 'next/server'
import { getAuthSession } from '@/utils/auth-utils-server'
import { auth } from '@/auth.config'

export async function PATCH() {
    // const body = await req.json()
    const session = await getAuthSession()
    const email = session?.user.email

    if (!email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const updatedUser = await prisma.user.update({
            where: {
                email: email as string,
            },
            data: { onboardingGuideCompleted: true },
            select: { id: true, email: true, onboardingGuideCompleted: true }
        })

        return NextResponse.json({
            data: updatedUser,
            message: 'Onboarding guide status updated successfully'
        })
    } catch (error) {
        console.error('Error updating onboarding guide status:', error)
        return NextResponse.json({ message: 'Error updating onboarding guide status' }, { status: 500 })
    }
}

export async function GET() {
    const session = await auth()
    const email = session?.user?.email

    if (!email) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email as string },
            select: { id: true, email: true, onboardingGuideCompleted: true }
        })

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({
            data: {
                onboardingGuideCompleted: user.onboardingGuideCompleted
            },
            message: 'Onboarding guide status fetched successfully'
        })
    } catch (error) {
        console.error('Error fetching onboarding guide status:', error)
        return NextResponse.json({ message: 'Error fetching onboarding guide status' }, { status: 500 })
    }
}