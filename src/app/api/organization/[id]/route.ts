import { prisma } from '@/config/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

  
    const data = await prisma.organization.findUnique({
      where: { id },
    })

    if(!data) {
      return Response.json({
        message: "Organization not found"
      }, { status: 404 })
    }
  
    return Response.json({ data })
    
  } catch (error) {
    console.error(error)
    return Response.json({
      message: "Internal server error"
    }, { status: 500 })
  }
}

