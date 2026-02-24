import { NextRequest, NextResponse } from "next/server";
import { downloadFile, parseGcsUrl } from "@/utils/storage-utils";
// import { prisma } from "@/config/db";
// import { auth } from "@/auth.config";

//  async function verifyToken(token: string) {
//     try {

//         const agent = await prisma.agent.findFirst({
//             where: {
//                 token: token,
//             },
//             select: {
//                 id: true,
//                 userId: true,
//                 agentName: true,
//                 user: {
//                     select: {
//                         id: true,
//                         organization: {
//                             select: {
//                                 organizationId: true,
//                                 organization: {
//                                     select: {
//                                         id: true,
//                                         name: true,
//                                         email: true,
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             },
//         });

//         if (!agent) {
//             return null;
//         }

//         return agent;
//     } catch (error) {
//         console.error("Error verifying token:", error);
//         return null;
//     }
// }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // const token = searchParams.get("token");
    const fileUrl = searchParams.get("url");
    // const authHeader = request.headers.get("authorization");

    if (!fileUrl) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Verify this is a GCS URL for security
    if (!fileUrl.includes("storage.googleapis.com")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // // Authentication check
    // if (authHeader && authHeader.startsWith('Bearer ')) {
    //   const internalToken = authHeader.split(' ')[1];
    //   if (internalToken !== process.env.INTERNAL_API_KEY) {
    //     return NextResponse.json({ error: "Invalid internal token" }, { status: 401 });
    //   }
    // } else if (token) {
    //   const agent = await verifyToken(token);
    //   if (!agent) {
    //     return NextResponse.json(
    //       { error: "Unauthorized - Invalid token" },
    //       { status: 401 }
    //     );
    //   }
    // } else {
    //   const session = await auth();
    //   if (!session?.user?.organizationId) {
    //     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    //   }
    // }

    // Parse GCS URL
    const gcsInfo = parseGcsUrl(fileUrl);
    if (!gcsInfo) {
      return NextResponse.json({ error: "Invalid GCS URL format" }, { status: 400 });
    }

    // Download file from GCS using authenticated client
    const { buffer, contentType } = await downloadFile(gcsInfo.bucketName, gcsInfo.filePath);

    // Return the file with proper headers
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Proxy file error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes('File not found')) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      if (error.message.includes('Access denied') || error.message.includes('403')) {
        return NextResponse.json({ error: "Access denied to file" }, { status: 403 });
      }
    }
    
    return NextResponse.json({ error: "Failed to proxy file" }, { status: 500 });
  }
}