import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Define parameter configuration
  const paramConfig = {
    auth_url: { required: true },
    client_id: { required: true },
    redirect_uri: { required: true },
    response_type: { required: false, default: "code" },
    scope: { required: false },
    state: { required: false },
  } as const;

  // Extract and validate parameters
  const params: Record<string, string> = {};
  const missingRequired: string[] = [];

  for (const [key, config] of Object.entries(paramConfig)) {
    const value = searchParams.get(key);
    if (!value && config.required) {
      missingRequired.push(key);
    } else {
      params[key] = value || ("default" in config ? config.default : "");
    }
  }

  if (missingRequired.length > 0) {
    return NextResponse.json(
      { error: `Missing required parameters: ${missingRequired.join(", ")}` },
      { status: 400 }
    );
  }

  // Build authorization URL
  const authUrl = new URL(params.auth_url);

  // Set parameters (excluding auth_url which is the base URL)
  Object.entries(params)
    .filter(([key, value]) => key !== "auth_url" && value)
    .forEach(([key, value]) => authUrl.searchParams.set(key, value));

  const response = NextResponse.redirect(authUrl.toString(), { status: 302 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}
