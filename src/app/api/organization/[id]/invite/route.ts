import { prisma } from "@/config/db";
import { EmailInvitationEmailHtml } from "@/template/emails/invitation-email";
import { getAuthSession } from "@/utils/auth-utils-server";
import { sendMail } from "@/utils/send-email";
import crypto from "crypto";
import { NextRequest } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const expiryTime = 4320;

    if (!id) {
      return Response.json(
        { message: "Organization id is not defined" },
        { status: 400 }
      );
    }

    // ✅ NEW: Better validation
    if (!body || !body.emails || !Array.isArray(body.emails)) {
      return Response.json(
        { message: "Please provide valid email(s)" },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: id },
    });

    if (!org) {
      return Response.json(
        { message: "Organization with the given id is not found" },
        { status: 404 }
      );
    }

    const emails: string[] = body.emails;

    // ✅ NEW: Limit maximum emails per request
    const MAX_EMAILS = 10;
    if (emails.length > MAX_EMAILS) {
      return Response.json(
        { message: `Maximum ${MAX_EMAILS} email addresses allowed per request. Gmail has strict rate limits.` },
        { status: 400 }
      );
    }

    // ✅ NEW: Gmail-safe configuration
    const DELAY_BETWEEN_EMAILS = 2000; // 2 seconds between emails

    // ✅ NEW: Track success/failure individually
    const results = {
      success: [] as string[],
      failed: [] as { email: string; error: string }[],
    };

    console.log(`📧 Starting to process ${emails.length} invitation(s)...`);

    // ✅ NEW: Process emails sequentially (one at a time)
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      try {
        const trimmedEmail = email.trim();

        // ✅ FIXED: Generate UNIQUE token for each email
        const invitationToken = crypto.randomBytes(32).toString("base64url");

        console.log(`📤 [${i + 1}/${emails.length}] Processing ${trimmedEmail}...`);

        // Save to database
        await prisma.invitationToken.upsert({
          where: {
            email_organizationId: {
              email: trimmedEmail,
              organizationId: id,
            },
          },
          update: {
            token: invitationToken,
            expires: new Date(new Date().getTime() + expiryTime * 60000),
            userId: session.user.id,
          },
          create: {
            email: trimmedEmail,
            token: invitationToken,
            expires: new Date(new Date().getTime() + expiryTime * 60000),
            organizationId: id,
            userId: session.user.id,
          },
        });

        // ✅ FIXED: Send email with retry logic (automatic retries built-in)
        await sendMail({
          email: "Knowgen.AI <knowgen.ai@gmail.com>",
          sendTo: trimmedEmail,
          subject: "Invitation to Join KnowgenAI",
          body: EmailInvitationEmailHtml({
            email: trimmedEmail,
            invitationToken: invitationToken,
          }),
        });

        results.success.push(trimmedEmail);
        console.log(`✅ [${i + 1}/${emails.length}] Successfully sent to ${trimmedEmail}`);

        // ✅ NEW: Wait 2 seconds before next email (except for last one)
        if (i < emails.length - 1) {
          console.log(`⏳ Waiting 2 seconds before next email...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));
        }

      } catch (error) {
        console.error(`❌ [${i + 1}/${emails.length}] Failed to send to ${email}:`, error);
        results.failed.push({
          email: email.trim(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
        // ✅ NEW: Continue to next email even if one fails
      }
    }

    // ✅ NEW: Return detailed response
    const totalProcessed = results.success.length + results.failed.length;

    console.log(`\n📊 Invitation Summary:`);
    console.log(`   ✅ Successful: ${results.success.length}/${totalProcessed}`);
    console.log(`   ❌ Failed: ${results.failed.length}/${totalProcessed}`);

    if (results.failed.length === 0) {
      // All successful
      return Response.json({
        message: "All invitations sent successfully",
        success: results.success,
        total: totalProcessed,
      });
    } else if (results.success.length === 0) {
      // All failed
      return Response.json(
        {
          message: "All invitations failed to send. Please try again later.",
          failed: results.failed,
          total: totalProcessed,
        },
        { status: 500 }
      );
    } else {
      // ✅ NEW: Partial success (207 Multi-Status)
      return Response.json(
        {
          message: `${results.success.length} invitation(s) sent successfully, ${results.failed.length} failed.`,
          success: results.success,
          failed: results.failed,
          total: totalProcessed,
        },
        { status: 207 }
      );
    }
  } catch (error) {
    console.error("POST /invite error:", error);
    return Response.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // totals records for each page
    const limit = searchParams?.get("limit") ?? "1";
    // skip for the offset
    const offset = searchParams?.get("offset") ?? "0";

    const data = await prisma.invitationToken.findMany({
      where: {
        organizationId: id,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip: Number(offset),
      take: Number(limit),
    });

    const totals = await prisma.invitationToken.count({
      where: {
        organizationId: id,
      },
    });

    if (!data) {
      return Response.json({ message: "Data not found" }, { status: 404 });
    }

    return Response.json({ data: data, totals: totals }, { status: 200 });
  } catch (error) {
    console.error(error);
    return Response.json({ message: "Internal server error" }, { status: 500 });
  }
}
