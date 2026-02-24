import { prisma } from "@/config/db";

export async function POST(req: Request) {
  try {
    // Parse the request body to extract the username
    const body = await req.json();
    const { username, email, emailcorp } = body;

    if (!username && !email && !emailcorp) {
      return Response.json(
        {
          message:
            "At least one of Username, email or emailcorp must be provided",
        },
        { status: 400 },
      );
    }

    if (username) {
      const data = await prisma.user.findUnique({
        where: {
          username: username as string,
        },
      });

      if (!data) {
        return Response.json(
          { message: "Username not found", exists: false },
          { status: 200 },
        );
      } else {
        return Response.json({ data, exists: true });
      }
    }

    if (email) {
      const data = await prisma.user.findUnique({
        where: {
          email: email as string,
        },
      });

      if (!data) {
        return Response.json(
          { message: "email not found", exists: false },
          { status: 200 },
        );
      } else {
        return Response.json({ data, exists: true });
      }
    }

    if (emailcorp) {
      const data = await prisma.organization.findUnique({
        where: {
          email: emailcorp as string,
        },
      });

      if (!data) {
        return Response.json(
          { message: "emailcorp not found", exists: false },
          { status: 200 },
        );
      } else {
        return Response.json({ data, exists: true });
      }
    }
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
