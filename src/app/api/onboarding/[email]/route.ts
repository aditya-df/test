import { prisma } from '@/config/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  try {
    const resolvedParams = await params;
    const { email } = resolvedParams;

    const data = await prisma.user.findUnique({
      where: {
        email: email
      }
    })

    if(!data) {
      return Response.json({
        message: "User not found"
      }, { status: 404 })
    }
    
    return Response.json({ data: data })
    
  } catch (error) {
    return Response.json({
      message: "Internal server error : "+error
    }, { status: 500 })
  }
}