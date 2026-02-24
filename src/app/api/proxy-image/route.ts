import { NextRequest, NextResponse } from "next/server";
// import { auth } from "@/auth.config";
// import { prisma } from "@/config/db";
import { downloadFile, parseGcsUrl } from "@/utils/storage-utils";

// async function verifyToken(token: string) {
//   try {
//     const agent = await prisma.agent.findFirst({
//       where: {
//         token: token,
//       },
//       select: {
//         id: true,
//         userId: true,
//         agentName: true,
//         user: {
//           select: {
//             id: true,
//             organization: {
//               select: {
//                 organizationId: true,
//                 organization: {
//                   select: {
//                     id: true,
//                     name: true,
//                     email: true,
//                   },
//                 },
//               },
//             },
//           },
//         },
//       },
//     });

//     if (!agent) {
//       return null;
//     }

//     return agent;
//   } catch (error) {
//     console.error("Error verifying token:", error);
//     return null;
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const token = searchParams.get("token");
//     const imageUrl = searchParams.get("url");

//     if (!imageUrl) {
//       return NextResponse.json(
//         { error: "URL parameter is required" },
//         { status: 400 }
//       );
//     }

//     // Verify this is a GCS URL for security
//     if (!imageUrl.includes("storage.googleapis.com")) {
//       return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
//     }

//     // Optional: Add authentication check
//     if (token) {
//       const agent = await verifyToken(token);
//       if (!agent) {
//         return NextResponse.json(
//           { error: "Unauthorized - Invalid token" },
//           { status: 401 }
//         );
//       }
//     } else {
//       const session = await auth();
//       if (!session?.user?.organizationId) {
//         return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//       }
//     }

//     // Fetch the image from GCS
//     const response = await fetch(imageUrl, {
//       headers: {
//         "User-Agent": "KnowgenAI/2.0",
//       },
//     });

//     if (!response.ok) {
//       return NextResponse.json(
//         { error: `Failed to fetch image: ${response.status}` },
//         { status: response.status }
//       );
//     }

//     // Get the image data
//     const imageBuffer = await response.arrayBuffer();
//     const contentType = response.headers.get("content-type") || "image/png";

//     // Return the image with proper CORS headers
//     return new NextResponse(imageBuffer, {
//       status: 200,
//       headers: {
//         "Content-Type": contentType,
//         "Access-Control-Allow-Origin": "*",
//         "Access-Control-Allow-Methods": "GET",
//         "Access-Control-Allow-Headers": "Content-Type",
//         "Cache-Control": "public, max-age=31536000", // Cache for 1 year
//       },
//     });
//   } catch (error) {
//     console.error("Proxy image error:", error);
//     return NextResponse.json(
//       { error: "Failed to proxy image" },
//       { status: 500 }
//     );
//   }
// }



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Verify this is a GCS URL for security
    if (!imageUrl.includes("storage.googleapis.com")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // REMOVED ALL AUTHENTICATION - Allow all requests

    // Parse GCS URL
    const gcsInfo = parseGcsUrl(imageUrl);
    if (!gcsInfo) {
      return NextResponse.json({ error: "Invalid GCS URL format" }, { status: 400 });
    }

    try {
      // Download file from GCS using authenticated client
      const { buffer, contentType } = await downloadFile(gcsInfo.bucketName, gcsInfo.filePath);

      // Return the file with proper headers
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type, User-Agent, X-Internal-Key",
          "Cache-Control": "public, max-age=31536000",
          "Content-Length": buffer.length.toString(),
        },
      });
    } catch (downloadError) {
      console.error(`❌ Download error for ${gcsInfo.filePath}:`, downloadError);

      if (downloadError instanceof Error) {
        if (downloadError.message.includes('File not found') || downloadError.message.includes('404')) {
          return NextResponse.json({ error: "File not found" }, { status: 404 });
        }
        if (downloadError.message.includes('Access denied') || downloadError.message.includes('403')) {
          return NextResponse.json({ error: "Access denied to file" }, { status: 403 });
        }
        if (downloadError.message.includes('timeout')) {
          return NextResponse.json({ error: "Download timeout" }, { status: 408 });
        }
      }

      throw downloadError;
    }
  } catch (error) {
    console.error("❌ Proxy image error:", error);
    return NextResponse.json({
      error: "Failed to proxy file",
      details: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : String(error))
        : undefined
    }, { status: 500 });
  }
}