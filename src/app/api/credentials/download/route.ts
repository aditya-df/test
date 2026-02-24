// SERVER SIDE - Create: src/app/api/credentials/download/route.ts

import { auth } from "@/auth.config";
import { storage } from "@/utils/storage";
import { prisma } from "@/config/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { gcsPath } = await req.json();

    if (!gcsPath) {
      return NextResponse.json(
        { success: false, error: "GCS path is required" },
        { status: 400 }
      );
    }

    // Validate that the user has access to this credential
    // Parse the GCS path to get bucket and file name
    // gcsPath format: gs://bucket-name/file-name
    const pathParts = gcsPath.replace("gs://", "").split("/");
    const bucketName = pathParts[0];
    console.log("bucketName", bucketName);
    const fileName = pathParts.slice(1).join("/");

    // Extract organization ID from bucket name
    const organizationIdMatch = bucketName.match(
      `${process.env.BUCKET_PREFIX}knowgenai_credentials_(.+)`
    );
    if (!organizationIdMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid bucket format" },
        { status: 400 }
      );
    }
    const organizationId = organizationIdMatch[1];

    // Verify user belongs to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organization: {
          include: {
            organization: true,
          },
        },
      },
    });

    const userOrganizationId = user?.organization[0]?.organizationId;
    if (userOrganizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Access denied to this credential" },
        { status: 403 }
      );
    }

    // Verify the credential exists in database
    const credential = await prisma.credentials.findFirst({
      where: {
        organizationId: organizationId,
        credentialFile: fileName,
      },
    });

    if (!credential) {
      return NextResponse.json(
        { success: false, error: "Credential not found" },
        { status: 404 }
      );
    }

    // Download file from Google Cloud Storage
    const file = storage.bucket(bucketName).file(fileName);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "File not found in storage" },
        { status: 404 }
      );
    }

    // Download file content
    const [fileContent] = await file.download();

    // Convert to base64
    const base64Content = fileContent.toString("base64");

    return NextResponse.json({
      success: true,
      fileContent: base64Content,
      fileName: fileName,
    });
  } catch (error) {
    console.error("Error downloading credential file:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to download file",
      },
      { status: 500 }
    );
  }
}
