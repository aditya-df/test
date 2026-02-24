import { prisma } from '@/config/db'
import { getAuthSession } from '@/utils/auth-utils-server'

export async function GET() {
  try {
    const session = await getAuthSession()
    const email = session?.user.email
    
    const data = await prisma.user.findUnique({
      where: {
        email: email as string
      }
    })
    
    return Response.json({ data: data })
    
  } catch (error) {
    return Response.json({
      message: "Internal server error : " + error
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {id} = body 
    
    const updatedUser = await prisma.user.update({
      where: { id: id },
      data: { isVerified: true },
    });
  
    return Response.json({ data: updatedUser })
    
  } catch (error) {
    return Response.json({
      message: "Internal server error : "+error
    }, { status: 500 })
  }
}
