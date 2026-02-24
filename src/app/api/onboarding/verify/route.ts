import { prisma } from '@/config/db'
import { getAuthSession } from '@/utils/auth-utils-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession()
    console.log("Session in API route:", session?.user?.email)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: {
        organization: {
          include: { organization: true },
        },
      },
    })
    console.log("Current user found:", currentUser?.id, currentUser?.email)

    if (!currentUser) {
      return Response.json({ message: 'User not found' }, { status: 404 })
    }

    // Check if superadmin
    const isSuperAdmin = currentUser.role.includes('superadmin')
    console.log("Is super admin:", isSuperAdmin)

    const searchParams = req.nextUrl.searchParams
    const limitParam = searchParams?.get('limit')
    const offsetParam = searchParams?.get('offset')
    const searchQuery = searchParams?.get('search') || '' // Add search parameter
    console.log("Limit, offset, and search:", limitParam, offsetParam, searchQuery)

    // Base filter condition based on user role
    const baseWhereCondition = isSuperAdmin
      ? { onboardingCompleted: true }
      : {
        onboardingCompleted: true,
        organization: {
          some: {
            organizationId: currentUser.organization[0]?.organizationId,
          },
        },
      }

    // Add search condition if search query exists
    const whereCondition = searchQuery
      ? {
        ...baseWhereCondition,
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' as const } },
          { email: { contains: searchQuery, mode: 'insensitive' as const } },
          { username: { contains: searchQuery, mode: 'insensitive' as const } },
        ],
      }
      : baseWhereCondition

    console.log("Where condition:", JSON.stringify(whereCondition))

    // If both limit and offset are provided, use pagination
    if (limitParam !== null && offsetParam !== null) {
      const limit = parseInt(limitParam)
      const offset = parseInt(offsetParam)

      // Get paginated data
      const data = await prisma.user.findMany({
        where: whereCondition,
        include: {
          organization: {
            include: { organization: true },
          },
        },
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc', // Add default ordering
        },
      })

      console.log(`Found ${data.length} users with pagination`)

      // Get total count for pagination
      const totals = await prisma.user.count({
        where: whereCondition
      })
      console.log("Total users count:", totals)

      return Response.json({
        data,
        totals,
        pagination: {
          limit,
          offset,
          totalPages: Math.ceil(totals / limit)
        }
      })
    } else {
      // If limit or offset is not provided, return all records
      const data = await prisma.user.findMany({
        where: whereCondition,
        include: {
          organization: {
            include: { organization: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      console.log(`Found ${data.length} users without pagination`)
      const totals = data.length

      return Response.json({
        data,
        totals,
        pagination: null
      })
    }
  } catch (error) {
    console.error('Error in onboarding/verify route:', error)
    return Response.json(
      {
        message: 'Internal server error',
      },
      { status: 500 },
    )
  }
}