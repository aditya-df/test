import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";

// Type for OAuth2 configuration request body
interface OAuth2ConfigRequest {
  name: string;
  grantType: string;
  callbackUrl: string;
  authUrl: string;
  accessTokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  state?: string;
  clientAuth: string;
  authRequest?: any[] | null; // JSON array for dynamic parameters or null
  tokenRequest?: any[] | null; // JSON array for dynamic parameters or null
  refreshUrl?: string;
  refreshRequest?: any[] | null; // JSON array for dynamic parameters or null
}

// Validation function for OAuth2 configuration
function validateOAuth2Config(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !data.name ||
    typeof data.name !== "string" ||
    data.name.trim().length === 0
  ) {
    errors.push("Name is required and must be a non-empty string");
  }

  if (!data.grantType || typeof data.grantType !== "string") {
    errors.push("Grant type is required and must be a string");
  }

  if (!data.callbackUrl || typeof data.callbackUrl !== "string") {
    errors.push("Callback URL is required and must be a string");
  } else {
    try {
      new URL(data.callbackUrl);
    } catch {
      errors.push("Callback URL must be a valid URL");
    }
  }

  if (!data.authUrl || typeof data.authUrl !== "string") {
    errors.push("Auth URL is required and must be a string");
  } else {
    try {
      new URL(data.authUrl);
    } catch {
      errors.push("Auth URL must be a valid URL");
    }
  }

  if (!data.accessTokenUrl || typeof data.accessTokenUrl !== "string") {
    errors.push("Access token URL is required and must be a string");
  } else {
    try {
      new URL(data.accessTokenUrl);
    } catch {
      errors.push("Access token URL must be a valid URL");
    }
  }

  if (!data.clientAuth || typeof data.clientAuth !== "string") {
    errors.push("Client auth method is required and must be a string");
  }

  if (data.scope && typeof data.scope !== "string") {
    errors.push("Scope must be a string if provided");
  }

  return { isValid: errors.length === 0, errors };
}

// GET - Fetch all OAuth2 configurations
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("id");

    if (configId) {
      // Fetch specific configuration
      const config = await prisma.oauth2Config.findUnique({
        where: {
          id: configId,
        },
        select: {
          id: true,
          name: true,
          grantType: true,
          callbackUrl: true,
          authUrl: true,
          accessTokenUrl: true,
          clientId: true,
          clientSecret: true,
          scope: true,
          clientAuth: true,
          connections: {
            select: {
              id: true,
              externalId: true,
              binding_created_at: true,
              binding_expired_at: true,
            },
          },
        },
      });

      if (!config) {
        return NextResponse.json(
          { error: "OAuth2 configuration not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(config);
    } else {
      // Fetch all configurations
      const configs = await prisma.oauth2Config.findMany({
        include: {
          connections: {
            select: {
              id: true,
              externalId: true,
              binding_created_at: true,
              binding_expired_at: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(configs);
    }
  } catch (error) {
    console.error("Error fetching OAuth2 configurations:", error);
    return NextResponse.json(
      { error: "Failed to fetch OAuth2 configurations" },
      { status: 500 }
    );
  }
}

// POST - Create new OAuth2 configuration
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate the request body
    const validation = validateOAuth2Config(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const {
      name,
      grantType,
      callbackUrl,
      authUrl,
      accessTokenUrl,
      clientId,
      clientSecret,
      scope,
      clientAuth,
      authRequest,
      tokenRequest,
      refreshUrl,
      refreshRequest,
    }: OAuth2ConfigRequest = body;
    console.log({ body });
    console.log({ authRequest });

    // Create new OAuth2 configuration
    const config = await prisma.oauth2Config.create({
      data: {
        name: name.trim(),
        grantType,
        callbackUrl,
        authUrl,
        accessTokenUrl,
        clientId,
        clientSecret,
        scope: scope || null,
        clientAuth,
        refreshUrl: refreshUrl || null,
        authRequest: (authRequest ?? null) as
          | { [key: string]: null }
          | Record<string, any>
          | undefined,
        tokenRequest: (tokenRequest ?? null) as
          | { [key: string]: null }
          | Record<string, any>
          | undefined,
        refreshRequest: (refreshRequest ?? null) as
          | { [key: string]: null }
          | Record<string, any>
          | undefined,
      },
    });

    return NextResponse.json({ data: config }, { status: 201 });
  } catch (error) {
    console.error("Error creating OAuth2 configuration:", error);
    return NextResponse.json(
      { error: "Failed to create OAuth2 configuration" },
      { status: 500 }
    );
  }
}

// PUT - Update existing OAuth2 configuration
export async function PUT(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("id");

    if (!configId) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate the request body
    const validation = validateOAuth2Config(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const {
      name,
      grantType,
      callbackUrl,
      authUrl,
      accessTokenUrl,
      clientId,
      clientSecret,
      scope,
      clientAuth,
    }: OAuth2ConfigRequest = body;

    // Check if configuration exists
    const existingConfig = await prisma.oauth2Config.findUnique({
      where: {
        id: configId,
      },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "OAuth2 configuration not found" },
        { status: 404 }
      );
    }

    // Check if another configuration with same name exists (excluding current one)
    const duplicateConfig = await prisma.oauth2Config.findFirst({
      where: {
        name: name.trim(),
        id: {
          not: configId,
        },
      },
    });

    if (duplicateConfig) {
      return NextResponse.json(
        { error: "OAuth2 configuration with this name already exists" },
        { status: 409 }
      );
    }

    // Update OAuth2 configuration
    const updatedConfig = await prisma.oauth2Config.update({
      where: {
        id: configId,
      },
      data: {
        name: name.trim(),
        grantType,
        callbackUrl,
        authUrl,
        accessTokenUrl,
        clientId,
        clientSecret,
        scope: scope || null,
        clientAuth,
        updatedAt: new Date(),
      },
      include: {
        connections: {
          select: {
            id: true,
            externalId: true,
            binding_created_at: true,
            binding_expired_at: true,
          },
        },
      },
    });

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("Error updating OAuth2 configuration:", error);
    return NextResponse.json(
      { error: "Failed to update OAuth2 configuration" },
      { status: 500 }
    );
  }
}

// DELETE - Remove OAuth2 configuration
export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const configId = searchParams.get("id");

    if (!configId) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    // Check if configuration exists
    const existingConfig = await prisma.oauth2Config.findUnique({
      where: {
        id: configId,
      },
      include: {
        connections: true,
      },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { error: "OAuth2 configuration not found" },
        { status: 404 }
      );
    }

    // Check if there are active connections
    const activeConnections = existingConfig.connections.filter(
      (conn) =>
        conn.binding_created_at !== null &&
        conn.binding_expired_at !== null &&
        conn.binding_expired_at > new Date()
    );

    if (activeConnections.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete OAuth2 configuration with active connections",
          activeConnections: activeConnections.length,
        },
        { status: 409 }
      );
    }

    // Delete OAuth2 configuration (connections will be cascade deleted)
    await prisma.oauth2Config.delete({
      where: {
        id: configId,
      },
    });

    return NextResponse.json(
      { message: "OAuth2 configuration deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting OAuth2 configuration:", error);
    return NextResponse.json(
      { error: "Failed to delete OAuth2 configuration" },
      { status: 500 }
    );
  }
}
