import { prisma } from '@/config/db'
import { NextRequest } from 'next/server'

export async function POST(req: Request) {
  const body = await req.json()
  // const session = await auth()
  try {
    const acl = await prisma.acl.create({
      data: {
        menuType: body.menuType,
        role: body.role,
        create: body.create,
        update: body.update,
        delete: body.delete,
        read: body.read,
      },
    })

    return Response.json({ data: acl })
  } catch (e) {
    // if (e instanceof Prisma.PrismaClientKnownRequestError) {
    //   return Response.json({ error: e.message }, { status: 400 })
    // }
    return Response.json({ error: e }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  // const session = await auth()

  const searchParams = req.nextUrl.searchParams
  // totals records for each page
  const limit = searchParams?.get('limit') ?? '1'
  // skip for the offset
  const offset = searchParams?.get('offset') ?? '0'

  const role = searchParams?.get('role')

  const whereClause: any = {}
  if (role && role !== 'all') {
    whereClause.role = role
  }

  const data = await prisma.acl.findMany({
    skip: Number(offset),
    take: Number(limit),
    where: whereClause,
    select: {
      id: true,
      menuType: true,
      role: true,
      create: true,
      update: true,
      delete: true,
      read: true,
    },
    orderBy: [
      {
        createdAt: 'asc',
      },
    ],
  })
  const totals = await prisma.acl.count({
    where: whereClause,
  })

  // const response = {
  //   data: [
  //     /* array of items */
  //   ],
  //   meta: {
  //     totalItems: 100,
  //     totalPages: 10,
  //     currentPage: 2,
  //     pageSize: 10,
  //     nextPage: '/api/items?page=3&limit=10',
  //     prevPage: '/api/items?page=1&limit=10',
  //   },
  // }
  return Response.json({ data, totals })
}
