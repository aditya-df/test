import { prisma } from '@/config/db'

export async function GET(req: Request, params: { params: Promise<{ id: string }> }) {
    const { id } = await params.params

    const data = await prisma.acl.findUnique({
        where: { id },
    })

    return Response.json({ data })
}

export async function PUT(req: Request, params: { params: Promise<{ id: string }> }) {
    const { id } = await params.params

    const body = await req.json()

    //   return Response.json({ data: id })
    const updatedIntegration = await prisma.acl.update({
        where: { id },
        data: {
            menuType: body.menuType,
            role: body.role,
            create: body.create,
            update: body.update,
            delete: body.delete,
            read: body.read,
        },
    })

    return Response.json({ data: updatedIntegration })
}

export async function DELETE(req: Request, params: { params: Promise<{ id: string }> }) {
    const { id } = await params.params

    const data = await prisma.acl.delete({
        where: { id },
    })

    return Response.json({ data })
}