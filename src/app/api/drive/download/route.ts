import { getAuthSession } from "@/utils/auth-utils-server";
import { downloadFiles } from "@/utils/google-drive";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const file = await req.json();
  const session = await getAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.provider !== "google") {
    return Response.json(
      {
        error: "Google authentication required",
        message: "Please sign in with Google to access Google Drive files",
        requiresGoogleAuth: true,
      },
      { status: 403 }
    );
  }

  try {
    console.log("Downloading file:", {
      name: file.name,
      mimeType: file.mimeType,
      id: file.id
    });

    const fileResponse = await downloadFiles(file);

    console.log("File response headers:", fileResponse.headers);

    const buffer = await new Promise((resolve, reject) => {
      const chunks: any = [];
      fileResponse.data.on("data", (chunk: any) => chunks.push(chunk));
      fileResponse.data.on("end", () => resolve(Buffer.concat(chunks)));
      fileResponse.data.on("error", (err: any) => {
        console.error("Stream error:", err);
        reject(err);
      });
    });

    const headers = new Headers();
    headers.set("Content-Type", fileResponse.headers["content-type"]);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${file.name}"`
    );

    return new NextResponse(buffer as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      file: {
        name: file.name,
        mimeType: file.mimeType,
        id: file.id
      }
    });
    return Response.json(
      {
        error: "Failed to download file",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}