import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";
import { ensureBucketExists, getOrganizationId, uploadFile } from "@/utils/storage-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB


const FileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size should be less than 10MB",
    })
    .refine(
      (file) =>
        [
          // Image formats
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/bmp",
          "image/tiff",
          "image/svg+xml",
          
          // Video formats
          "video/mp4",
          
          // Document formats
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
          "text/plain",
          "text/csv",
          "text/html",
          
          // For compatibility with some systems that might misidentify file types
          "application/octet-stream"
        ].includes(file.type),
      {
        message: "File type not supported. Please upload an image, video (mp4), PDF, or common document format.",
      },
    ),
});



// export async function POST(request: Request) {
//   if (!BLOB_READ_WRITE_TOKEN) {
//     console.error('BLOB_READ_WRITE_TOKEN is not configured');
//     return NextResponse.json(
//       { error: "Server configuration error: Missing BLOB_READ_WRITE_TOKEN" },
//       { status: 500 }
//     );
//   }
//   console.log(`BLOB_READ_WRITE_TOKEN: ${BLOB_READ_WRITE_TOKEN}`);

//   const session = await getAuthSession();
//   const formData = await request.formData();
//   const file = formData.get("file") as File;
//   const token = formData.get("token") as string;
//   const orgId = formData.get("orgId") as string;

//   console.log(`token: ${token} orgId: ${orgId}`);

//   if (!session && !token && !orgId) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   if (request.body === null) {
//     return new Response("Request body is empty", { status: 400 });
//   }

//   try {


//     let org  ;
   
//     if(token){
//       org = await prisma.agent.findFirst({ where: { token: token },
//         include: {
//           user: {
//             include: {
//               organization: true,
//             },
//           },
//         },
//       })
//     }

//     const organizationId = org?.user?.organization[0]?.organizationId || orgId;
//     const bucketName = `knowgenai_${organizationId}_public`

//     let exists = false
//     try {
//       [exists] = await storage.bucket(bucketName).exists()
//     } catch (error) {
//       console.error(`Error checking bucket ${bucketName}:`, error)
//       exists = false
//     }

//      // Create bucket if it doesn't exist
//      if (!exists) {
//       try {
//         await storage.createBucket(bucketName)
//         await storage.bucket(bucketName).makePublic()
        
//         const [bucketExists] = await storage.bucket(bucketName).exists()
//         if (!bucketExists) {
//           throw new Error('Bucket creation failed')
//         }
//       } catch (error) {
//         console.error(`Failed to create bucket ${bucketName}:`, error)
//         throw new Error('Failed to create storage bucket')
//       }
//     }
    
//     if (!file) {
//       return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
//     }



//     console.log('FormData contents:', Object.fromEntries(formData.entries()));
//     console.log('File details:', {
//       name: file.name,
//       size: file.size,
//       type: file.type
//     });

//     if (!file) {
//       return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
//     }

//     if (file.size > MAX_FILE_SIZE) {
//       return NextResponse.json({
//         error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
//       }, { status: 400 });
//     }

//     const validatedFile = FileSchema.safeParse({ file });
//     console.log(validatedFile);

//     if (!validatedFile.success) {
//       const errorMessage = validatedFile.error.errors
//         .map((error) => error.message)
//         .join(", ");

//       return NextResponse.json({ error: errorMessage }, { status: 400 });
//     }

//     // Generate a unique filename
//     const timestamp = new Date().getTime();
//     const originalName = file.name;
//     const extension = originalName.split('.').pop();
//     const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
//     const filename = `uploads/${timestamp}-${sanitizedFileName}`;

//     console.log(filename + "." + extension + "." + file.type);

//     try {
//       console.log('Starting upload process...');

//         const buffer = await file.arrayBuffer()

//         const gcs = storage.bucket(bucketName).file(filename);
//         await gcs.save(Buffer.from(buffer));
//         await gcs.makePublic();
        
//         const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
        
//         console.log('Uploaded to GCS:', { filename, publicUrl });


//       return NextResponse.json({
//          url: publicUrl,
//          pathname: filename,
//         contentType: file.type,
//         name: file.name,
//       });
//     } catch (uploadError) {
//       console.error('Detailed upload error:', {
//         error: uploadError,
//         message: uploadError instanceof Error ? uploadError.message : 'Unknown error',
//         stack: uploadError instanceof Error ? uploadError.stack : undefined
//       });

//       return NextResponse.json({
//         error: "Upload failed",
//         details: process.env.NODE_ENV === 'development'
//           ? (uploadError instanceof Error ? uploadError.message : String(uploadError))
//           : 'Internal server error'
//       }, { status: 500 });
//     }
//   } catch (error) {
//     console.error('Request processing error:', error);
//     return NextResponse.json({
//       error: "Failed to process request",
//       details: process.env.NODE_ENV === 'development'
//         ? (error instanceof Error ? error.message : String(error))
//         : 'Internal server error'
//     }, { status: 500 });
//   }
// }


/**
 * Handles file upload requests
 */
export async function POST(request: Request) {
  try {
    // Validate environment configuration
    // if (!process.env.BLOB_READ_WRITE_TOKEN) {
    //   console.error('BLOB_READ_WRITE_TOKEN is not configured');
    //   return NextResponse.json(
    //     { error: "Server configuration error: Missing BLOB_READ_WRITE_TOKEN" },
    //     { status: 500 }
    //   );
    // }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const token = formData.get("token") as string;
    let orgId = formData.get("orgId") as string;

    // Authenticate request
    const session = await getAuthSession();
    orgId = session?.user.organizationId || orgId;
    if (!session && !token && !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!request.body) {
      return NextResponse.json({ error: "Request body is empty" }, { status: 400 });
    }

    // Get organization ID
    const organizationId = await getOrganizationId(token, orgId, prisma);
    const bucketName = `${process.env.BUCKET_PREFIX}knowgenai_${organizationId}_public`;

    // Ensure bucket exists
    console.log("Ensuring bucket exists:", bucketName);
    await ensureBucketExists(bucketName);

    // Validate file
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });
    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Upload file to storage
    const uploadResult = await uploadFile(file, bucketName);
    return NextResponse.json(uploadResult);

  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({
      error: "Failed to process request",
      details: process.env.NODE_ENV === 'development'
        ? (error instanceof Error ? error.message : String(error))
        : 'Internal server error'
    }, { status: 500 });
  }
}
