import { prisma } from "@/config/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  try {
    const resolvedParams = await params;
    const { email } = resolvedParams;

    if (!email) {
      return Response.json(
        {
          message: "Params not complete",
        },
        { status: 400 },
      );
    }

    const data = await prisma.user.findUnique({
      where: {
        email: email,
      },
      include: {
        organization: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!data) {
      return Response.json(
        {
          message: "User not found",
        },
        { status: 404 },
      );
    }

    return Response.json({ data: data });
  } catch (error) {
    console.error(error);
    return Response.json(
      {
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
