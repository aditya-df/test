import { prisma } from "@/config/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/account/check", request);
    const body = await request.json();

    // Ambil data provider dan providerAccountId dari payload
    const { provider, providerAccountId } = body;

    if (!provider || !providerAccountId) {
      return NextResponse.json(
        { error: "Missing provider or providerAccountId" },
        { status: 400 },
      );
    }

    const existingAccount = await prisma.account.findFirst({
      where: {
        provider,
        providerAccountId,
      },
    });

    return NextResponse.json(
      { exists: !!existingAccount, account: existingAccount },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error checking account:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
