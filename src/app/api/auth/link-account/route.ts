import { NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { provider, providerAccountId, access_token } = await req.json();

    const existingAccount = await prisma.account.findFirst({
      where: {
        provider,
        providerAccountId,
      },
    });

    if (existingAccount) {
      return new NextResponse("Account already linked", { status: 400 });
    }

    await prisma.account.create({
      data: {
        userId: session.user.id,
        type: "oauth",
        provider,
        providerAccountId,
        access_token,
      },
    });

    return new NextResponse("Account linked successfully", { status: 200 });
  } catch (error) {
    return new NextResponse("Internal error : " + error, { status: 500 });
  }
}
