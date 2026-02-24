import { getAuthSession } from "@/utils/auth-utils-server";
import { NextRequest } from "next/server";
import { getFiles } from "@/utils/google-drive";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const session = await getAuthSession();

  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user logged in with Google
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
    const key = searchParams.get("key") as string;
    const source = searchParams.get("source") || "myDrive";
    const dataArr: any[] = await getFiles(key, source as string);

    return Response.json(dataArr);
  } catch (error) {
    console.error("Error listing files:", error);
    return Response.json({ error: "Failed to list files" }, { status: 500 });
  }
}
