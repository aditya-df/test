import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { experimental_generateImage as generateImage } from "ai";
import { uploadFile, ensureBucketExists } from "@/utils/storage-utils";
import { vertexAiImage } from "@/lib/vertex";

export async function POST(request: NextRequest) {
  try {
    // Check for internal API key first (for tool calls)
    const internalApiKey = request.headers.get("x-internal-api-key");
    const organizationIdFromHeader = request.headers.get("x-organization-id");

    let organizationId: string;

    if (
      internalApiKey === process.env.INTERNAL_API_KEY &&
      organizationIdFromHeader
    ) {
      // This is an internal tool call
      organizationId = organizationIdFromHeader;
      console.log("Internal tool call detected");
    } else {
      // This is a regular user request
      const session = await auth();
      if (!session?.user?.organizationId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      organizationId = session.user.organizationId;
    }

    const {
      prompt,
      aspect_ratio,
      negative_prompt,
      person_generation,
      safety_setting,
      add_watermark,
      include_base64 = false,
    } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Validate and set default for safety_setting
    const validSafetySettings = [
      "block_low_and_above",
      "block_medium_and_above",
      "block_only_high",
      "block_none",
    ];
    const finalSafetySetting = validSafetySettings.includes(safety_setting)
      ? safety_setting
      : "block_only_high";

    // Log if we had to use default
    if (safety_setting && !validSafetySettings.includes(safety_setting)) {
      console.log(
        `Invalid safety_setting received: ${safety_setting}, using default: ${finalSafetySetting}`
      );
    }

    console.log("Generating image with AI SDK + Imagen:", {
      prompt,
      aspect_ratio,
      safety_setting: finalSafetySetting,
    });

    // Use AI SDK to generate image with Gemini 2.5 Flash Image
    // Note: Type cast needed due to @ai-sdk/google-vertex returning v1 model spec
    const { image } = await generateImage({
      model: vertexAiImage.image("imagen-4.0-generate-001") as any,
      prompt: prompt,
      aspectRatio: aspect_ratio || "1:1",
      providerOptions: {
        vertex: {
          ...(negative_prompt && { negativePrompt: negative_prompt }),
          safetySetting: finalSafetySetting,
          personGeneration: person_generation || "allow_adult",
          addWatermark: add_watermark || false,
        },
      },
    });

    // Get base64 data and uint8Array from AI SDK response
    const base64Data = image.base64;
    const uint8Array = image.uint8Array;

    // Convert to blob for upload
    const imageBlob = new Blob([uint8Array], { type: "image/png" });

    // Create a file with timestamp
    const timestamp = Date.now();
    const fileName = `imagen-generated-${timestamp}.png`;
    const imageFile = new File([imageBlob], fileName, { type: "image/png" });

    // Upload to your storage
    const bucketName = `${process.env.BUCKET_PREFIX}knowgenai_${organizationId}_public`;
    await ensureBucketExists(bucketName);
    const uploadResult = await uploadFile(imageFile, bucketName);

    console.log("Image generated and uploaded successfully:", uploadResult.url);

    const response: any = {
      success: true,
      image_url: uploadResult.url,
      generation_id: `imagen-${timestamp}`,
      prompt: prompt,
      aspect_ratio: aspect_ratio,
      negative_prompt: negative_prompt,
      person_generation: person_generation,
      safety_setting: finalSafetySetting,
      add_watermark: add_watermark,
      model: "Gemini 2.5 Flash Image (via KnowgenAI)",
      timestamp: new Date().toISOString(),
    };

    // Only include base64 if explicitly requested
    if (include_base64) {
      response.image_base64 = base64Data;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}