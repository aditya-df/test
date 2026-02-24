import { auth } from "@/auth.config";
import { prisma } from "@/config/db";
import { storage } from "@/utils/storage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  params: { params: Promise<{ id: string }> }
) {
  const { id } = await params.params;

  try {
    const credential = await prisma.credentials.findUnique({
      where: { id },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: credential,
      message: "Credential retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving credential:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve credential",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  params: { params: Promise<{ id: string }> }
) {
  const { id } = await params.params;
  const session = await auth();

  if (!session?.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find user's organization
    const user = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
      include: {
        organization: {
          include: {
            organization: true,
          },
        },
      },
    });

    const organizationId = user?.organization[0]?.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Find existing credential
    const existingCredential = await prisma.credentials.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!existingCredential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = form.get("name") as string;
    const description = form.get("description") as string;
    const googleAPIKey = form.get("googleAPIKey") as string;
    const googleCSID = form.get("googleCSID") as string;
    const weatherAPIKey = form.get("weatherAPIKey") as string;
    const wikipediaAPIKey = form.get("wikipediaAPIKey") as string;

    // Setup update data
    const updateData: any = {
      name,
      description,
      googleAPIKey: googleAPIKey != "null" ? googleAPIKey : null,
      googleCSID: googleCSID != "null" ? googleCSID : null,
      weatherAPIKey: weatherAPIKey != "null" ? weatherAPIKey : null,
      wikipediaAPIKey: wikipediaAPIKey != "null" ? wikipediaAPIKey : null,
    };

    // Handle file upload if provided
    if (file) {
      // Validate file
      const MAX_FILE_SIZE = 1 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Credential file size exceeds 1MB limit" },
          { status: 400 }
        );
      }

      if (file.type !== "application/json") {
        return NextResponse.json(
          { error: "Credential file must be JSON format" },
          { status: 400 }
        );
      }

      // Setup storage bucket
      const bucketName = `${process.env.BUCKET_PREFIX}knowgenai_credentials_${organizationId}`;

      try {
        // Check if bucket exists
        let [exists] = await storage.bucket(bucketName).exists();

        // Create bucket if it doesn't exist
        if (!exists) {
          await storage.createBucket(bucketName);
          [exists] = await storage.bucket(bucketName).exists();
          if (!exists) throw new Error("Failed to create storage bucket");
        }

        // Create new filename and upload file
        const timestamp = new Date().getTime();
        const newFilename = `${timestamp}_${file.name.replace(/\s+/g, "_")}`;
        const buffer = await file.arrayBuffer();
        await storage
          .bucket(bucketName)
          .file(newFilename)
          .save(Buffer.from(buffer));

        // Delete old file if it exists
        if (existingCredential.credentialFile) {
          try {
            await storage
              .bucket(bucketName)
              .file(existingCredential.credentialFile)
              .delete();
          } catch (error) {
            console.error("Error deleting old credential file:", error);
            // Continue with update even if old file deletion fails
          }
        }

        updateData.credentialFile = newFilename;
      } catch (error) {
        console.error("Error handling file upload:", error);
        return NextResponse.json(
          { error: "Failed to process file upload" },
          { status: 500 }
        );
      }
    }

    // Update credential record
    const updatedCredential = await prisma.credentials.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      data: updatedCredential,
      message: "Credential updated successfully",
    });
  } catch (error) {
    console.error("Error updating credential:", error);
    return NextResponse.json(
      {
        error: "Failed to update credential",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  params: { params: Promise<{ id: string }> }
) {
  const { id } = await params.params;

  try {
    const credential = await prisma.credentials.findUnique({
      where: { id },
    });

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    const datasource = await prisma.datasource.findMany({
      where: {
        credential: id,
        sourceType: "big-query",
      },
    });

    if (datasource.length > 0) {
      const datasourceNames = datasource.map((ds) => ds.name).join(", ");
      return NextResponse.json(
        {
          error: "Credential cannot be deleted",
          details: `This credential is currently being used by the following datasources: ${datasourceNames}`,
        },
        { status: 400 }
      );
    }

    const deleteCredential = await prisma.credentials.delete({
      where: { id },
    });

    return NextResponse.json({
      data: deleteCredential,
      message: "Credential removed successfully",
    });
  } catch (error) {
    console.error("Error retrieving credential:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve credential",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
