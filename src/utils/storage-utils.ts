import { storage } from "@/utils/storage";

/**
 * Ensures the storage bucket exists, creates it if it doesn't
 */
export async function ensureBucketExists(bucketName: string): Promise<void> {
  let exists = false;
  try {
    [exists] = await storage.bucket(bucketName).exists();
  } catch (error) {
    console.error(`Error checking bucket ${bucketName}:`, error);
    exists = false;
  }

  if (!exists) {
    try {
      await storage.createBucket(bucketName);
      // await storage.bucket(bucketName).makePublic();
      
      const [bucketExists] = await storage.bucket(bucketName).exists();
      if (!bucketExists) {
        throw new Error('Bucket creation failed');
      }
    } catch (error) {
      console.error(`Failed to create bucket ${bucketName}:`, error);
      throw new Error('Failed to create storage bucket');
    }
  }
}

/**
 * Downloads a file from GCS
 */
export async function downloadFile(bucketName: string, filePath: string): Promise<{
  buffer: Buffer;
  contentType: string;
  metadata: any;
}> {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file metadata and content
    const [metadata] = await file.getMetadata();
    const [fileBuffer] = await file.download();

    return {
      buffer: fileBuffer,
      contentType: metadata.contentType || "application/octet-stream",
      metadata
    };
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}

/**
 * Checks if a file exists in GCS
 */
export async function fileExists(bucketName: string, filePath: string): Promise<boolean> {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error('File exists check error:', error);
    return false;
  }
}

/**
 * Parses a GCS URL to extract bucket and file path
 */
export function parseGcsUrl(url: string): { bucketName: string; filePath: string } | null {
  const gcsUrlMatch = url.match(/storage\.googleapis\.com\/([^\/]+)\/(.+)/);
  if (!gcsUrlMatch) {
    return null;
  }

  return {
    bucketName: gcsUrlMatch[1],
    filePath: decodeURIComponent(gcsUrlMatch[2])
  };
}

/**
 * Uploads a file to the specified bucket
 */
export async function uploadFile(file: File, bucketName: string) {
  try {
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const originalName = file.name;
    // More aggressive sanitization: replace hyphens and other special characters with underscores
    // Only allow alphanumeric characters, dots, and underscores
    const sanitizedFileName = originalName
      .replace(/[^a-zA-Z0-9.]/g, '_')
      .replace(/_+/g, '_');
    const filename = `uploads/${timestamp}-${sanitizedFileName}`;


    console.log('Starting upload process...');
    
    // Upload to Google Cloud Storage
    const buffer = await file.arrayBuffer();
    const gcs = storage.bucket(bucketName).file(filename);
    await gcs.save(Buffer.from(buffer));
    // await gcs.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
    console.log('Uploaded to GCS:', { filename, publicUrl });

    return {
      url: publicUrl,
      pathname: filename,
      contentType: file.type,
      name: file.name,
    };
  } catch (uploadError) {
    console.error('Detailed upload error:', {
      error: uploadError,
      message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
      stack: uploadError instanceof Error ? uploadError.stack : undefined
    });

    throw uploadError;
  }
}

/**
 * Gets the organization ID from token or direct orgId
 */
export async function getOrganizationId(token?: string, orgId?: string, prisma?: any): Promise<string> {
  if (token && prisma) {
    const org = await prisma.agent.findFirst({ 
      where: { token },
      include: {
        user: {
          include: {
            organization: true,
          },
        },
      },
    });
    return org?.user?.organization[0]?.organizationId || orgId || 'default';
  }
  return orgId || 'default';
}
