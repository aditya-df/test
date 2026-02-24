import { auth } from "@/auth.config";
import { prisma } from "@/config/db";
import { storage } from "@/utils/storage";
import { NextRequest, NextResponse } from "next/server";

// Helper function to safely convert form data to proper null values
function getFormValue(form: FormData, key: string): string | null {
  const value = form.get(key) as string | null;
  if (
    !value ||
    value.trim() === "" ||
    value === "null" ||
    value === "undefined"
  ) {
    return null;
  }
  return value.trim();
}

export async function GET(req: NextRequest) {
  const session = await auth();

  const searchParams = req.nextUrl.searchParams;
  const limit = searchParams?.get("limit") ?? "1";
  const offset = searchParams?.get("offset") ?? "0";

  const email = session?.user.email;

  const organization = await prisma.user.findUnique({
    where: {
      email: email as string,
    },
    include: {
      organization: {
        include: {
          organization: true,
        },
      },
    },
  });
  const organizationId = organization?.organization[0]?.organizationId;

  const data = await prisma.credentials.findMany({
    skip: Number(offset),
    take: Number(limit),
    select: {
      id: true,
      name: true,
      description: true,
      credentialFile: true,
      wikipediaAPIKey: true,
      weatherAPIKey: true,
      googleAPIKey: true,
      googleCSID: true,
    },
    where: {
      organizationId: organizationId,
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  });
  const totals = await prisma.credentials.count({
    where: {
      organizationId: organizationId,
    },
  });

  return NextResponse.json({ data, totals });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user.email;

  const user = await prisma.user.findUnique({
    where: {
      email: email as string,
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

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const name = getFormValue(form, "name");
    const description = getFormValue(form, "description");

    // Get API key fields for non-file credentials using the helper function
    const wikipediaAPIKey = getFormValue(form, "wikipediaAPIKey");
    const weatherAPIKey = getFormValue(form, "weatherAPIKey");
    const googleAPIKey = getFormValue(form, "googleAPIKey");
    const googleCSID = getFormValue(form, "googleCSID");

    // Validate required name field
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Determine credential type based on which fields are provided
    const isFileBasedCredential = file && file.size > 0;
    const isWikipediaCredential = wikipediaAPIKey !== null;
    const isWeatherCredential = weatherAPIKey !== null;
    const isGoogleSearchCredential =
      googleAPIKey !== null && googleCSID !== null;

    let filename = null;

    // Handle file-based credentials (BigQuery)
    if (isFileBasedCredential) {
      // Validate file size (max 1MB for credential files)
      const MAX_FILE_SIZE = 1 * 1024 * 1024;
      if (file!.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Credential file size exceeds 1MB limit" },
          { status: 400 }
        );
      }

      // Validate file type (must be JSON)
      if (file!.type !== "application/json") {
        return NextResponse.json(
          { error: "Credential file must be JSON format" },
          { status: 400 }
        );
      }

      // Setup storage bucket for credentials
      const bucketName = `${process.env.BUCKET_PREFIX}knowgenai_credentials_${organizationId}`

      let exists = false;
      try {
        [exists] = await storage.bucket(bucketName).exists();
      } catch (error) {
        console.error(`Error checking bucket ${bucketName}:`, error);
        exists = false;
      }

      // Create bucket if it doesn't exist
      if (!exists) {
        try {
          await storage.createBucket(bucketName);
          const [bucketExists] = await storage.bucket(bucketName).exists();
          if (!bucketExists) {
            throw new Error("Bucket creation failed");
          }
        } catch (error) {
          console.error(`Failed to create bucket ${bucketName}:`, error);
          throw new Error("Failed to create storage bucket");
        }
      }

      // Create unique filename
      const timestamp = new Date().getTime();
      filename = `${timestamp}_${file!.name.replace(/\s+/g, "_")}`;

      // Upload file to storage
      const buffer = await file!.arrayBuffer();
      await storage.bucket(bucketName).file(filename).save(Buffer.from(buffer));
    }

    // Validate that at least one credential type is provided
    if (
      !isFileBasedCredential &&
      !isWikipediaCredential &&
      !isWeatherCredential &&
      !isGoogleSearchCredential
    ) {
      return NextResponse.json(
        { error: "Please provide credential information (file or API keys)" },
        { status: 400 }
      );
    }

    // Create credential record with appropriate fields
    const credentialData: any = {
      name: name,
      description: description || null, // Ensure empty description becomes null
      organizationId: organizationId,
      credentialFile: filename, // This will be null if no file was uploaded
      wikipediaAPIKey: wikipediaAPIKey,
      weatherAPIKey: weatherAPIKey,
      googleAPIKey: googleAPIKey,
      googleCSID: googleCSID,
    };

    console.log("Creating credential with data:", credentialData);

    const credential = await prisma.credentials.create({
      data: credentialData,
    });

    return NextResponse.json({
      data: credential,
      message: "Credential created successfully",
    });
  } catch (error) {
    console.error("Error creating credential:", error);
    return NextResponse.json(
      {
        error: "Failed to create credential",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
