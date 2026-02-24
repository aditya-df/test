import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { getAuthSession } from "@/utils/auth-utils-server";

// Type for OAuth2 connection request body
interface OAuth2ConnectionRequest {
  configId: string;
  externalId?: string;
  accessToken: string;
  refreshToken?: string;
  access_expires_at?: Date;
  refresh_expires_at?: Date;
  binding_created_at?: Date;
  binding_expired_at?: Date;
  headerPrefix?: string;
}

// Validation function for OAuth2 connection
function validateOAuth2Connection(data: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !data.configId ||
    typeof data.configId !== "string" ||
    data.configId.trim().length === 0
  ) {
    errors.push("Config ID is required and must be a non-empty string");
  }

  if (
    !data.accessToken ||
    typeof data.accessToken !== "string" ||
    data.accessToken.trim().length === 0
  ) {
    errors.push("Access token is required and must be a non-empty string");
  }

  if (data.externalId && typeof data.externalId !== "string") {
    errors.push("External ID must be a string if provided");
  }

  if (data.refreshToken && typeof data.refreshToken !== "string") {
    errors.push("Refresh token must be a string if provided");
  }

  if (data.headerPrefix && typeof data.headerPrefix !== "string") {
    errors.push("Header prefix must be a string if provided");
  }

  if (
    data.access_expires_at &&
    !(data.access_expires_at instanceof Date) &&
    typeof data.access_expires_at !== "string"
  ) {
    errors.push("Access expires at must be a valid date if provided");
  }

  if (
    data.refresh_expires_at &&
    !(data.refresh_expires_at instanceof Date) &&
    typeof data.refresh_expires_at !== "string"
  ) {
    errors.push("Refresh expires at must be a valid date if provided");
  }

  if (
    data.binding_created_at &&
    !(data.binding_created_at instanceof Date) &&
    typeof data.binding_created_at !== "string"
  ) {
    errors.push("Binding created at must be a valid date if provided");
  }

  if (
    data.binding_expired_at &&
    !(data.binding_expired_at instanceof Date) &&
    typeof data.binding_expired_at !== "string"
  ) {
    errors.push("Binding expired at must be a valid date if provided");
  }

  return { isValid: errors.length === 0, errors };
}

// GET - Fetch OAuth2 connections
export async function GET(req: NextRequest) {
  // const session = await getAuthSession();
  // if (!session?.user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("id");
    const configId = searchParams.get("configId");

    if (connectionId) {
      // Fetch specific connection
      const connection = await prisma.oauth2Connection.findUnique({
        where: {
          id: connectionId,
        },
        include: {
          config: {
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
              state: true,
              refreshUrl: true,
              authRequest: true,
              tokenRequest: true,
              refreshRequest: true,
            },
          },
        },
      });

      if (!connection) {
        return NextResponse.json(
          { error: "OAuth2 connection not found" },
          { status: 404 }
        );
      }

      console.log(connection);
      return NextResponse.json(connection);
    } else if (configId) {
      // Fetch connections for a specific config
      const connections = await prisma.oauth2Connection.findMany({
        where: {
          configId: configId,
        },
        include: {
          config: {
            select: {
              id: true,
              name: true,
              grantType: true,
              callbackUrl: true,
              authUrl: true,
              accessTokenUrl: true,
              clientId: true,
              scope: true,
              clientAuth: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json(connections);
    } else {
      // Fetch all connections
      const connections = await prisma.oauth2Connection.findMany({
        include: {
          config: {
            select: {
              id: true,
              name: true,
              grantType: true,
              callbackUrl: true,
              authUrl: true,
              accessTokenUrl: true,
              clientId: true,
              scope: true,
              clientAuth: true,
              clientSecret: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({ data: connections });
    }
  } catch (error) {
    console.error("Error fetching OAuth2 connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch OAuth2 connections" },
      { status: 500 }
    );
  }
}

// POST - Create new OAuth2 connection
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validate the request body
    const validation = validateOAuth2Connection(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const {
      configId,
      externalId,
      accessToken,
      refreshToken,
      access_expires_at,
      refresh_expires_at,
      binding_created_at,
      binding_expired_at,
      headerPrefix,
    }: OAuth2ConnectionRequest = body;

    // Verify that the config exists
    const config = await prisma.oauth2Config.findUnique({
      where: { id: configId },
    });

    if (!config) {
      return NextResponse.json(
        { error: "OAuth2 configuration not found" },
        { status: 404 }
      );
    }

    // Create new OAuth2 connection
    const connection = await prisma.oauth2Connection.create({
      data: {
        configId,
        externalId: externalId || null,
        accessToken,
        refreshToken: refreshToken || null,
        access_expires_at: access_expires_at
          ? new Date(access_expires_at)
          : null,
        refresh_expires_at: refresh_expires_at
          ? new Date(refresh_expires_at)
          : null,
        binding_created_at: binding_created_at
          ? new Date(binding_created_at)
          : null,
        binding_expired_at: binding_expired_at
          ? new Date(binding_expired_at)
          : null,
        headerPrefix: headerPrefix || null,
      },
      include: {
        config: {
          select: {
            id: true,
            name: true,
            grantType: true,
            callbackUrl: true,
            authUrl: true,
            accessTokenUrl: true,
            clientId: true,
            scope: true,
            clientAuth: true,
          },
        },
      },
    });

    return NextResponse.json({ data: connection }, { status: 201 });
  } catch (error) {
    console.error("Error creating OAuth2 connection:", error);
    return NextResponse.json(
      { error: "Failed to create OAuth2 connection" },
      { status: 500 }
    );
  }
}

// PUT - Update existing OAuth2 connection
export async function PUT(req: NextRequest) {
  // const session = await getAuthSession();
  // if (!session?.user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("id");

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate the request body
    const validation = validateOAuth2Connection(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const {
      configId,
      externalId,
      accessToken,
      refreshToken,
      access_expires_at,
      refresh_expires_at,
      binding_created_at,
      binding_expired_at,
      headerPrefix,
    }: OAuth2ConnectionRequest = body;
    console.log({ body });

    // Check if connection exists
    const existingConnection = await prisma.oauth2Connection.findUnique({
      where: {
        id: connectionId,
      },
    });

    if (!existingConnection) {
      return NextResponse.json(
        { error: "OAuth2 connection not found" },
        { status: 404 }
      );
    }

    // Verify that the config exists if configId is being updated
    if (configId !== existingConnection.configId) {
      const config = await prisma.oauth2Config.findUnique({
        where: { id: configId },
      });

      if (!config) {
        return NextResponse.json(
          { error: "OAuth2 configuration not found" },
          { status: 404 }
        );
      }
    }

    // Update OAuth2 connection
    const updatedConnection = await prisma.oauth2Connection.update({
      where: {
        id: connectionId,
      },
      data: {
        configId,
        externalId: externalId || null,
        accessToken,
        refreshToken: refreshToken || null,
        access_expires_at: access_expires_at
          ? new Date(access_expires_at)
          : null,
        refresh_expires_at: refresh_expires_at
          ? new Date(refresh_expires_at)
          : null,
        binding_created_at: binding_created_at
          ? new Date(binding_created_at)
          : null,
        binding_expired_at: binding_expired_at
          ? new Date(binding_expired_at)
          : null,
        headerPrefix: headerPrefix || null,
        updatedAt: new Date(),
      },
      include: {
        config: {
          select: {
            id: true,
            name: true,
            grantType: true,
            callbackUrl: true,
            authUrl: true,
            accessTokenUrl: true,
            clientId: true,
            scope: true,
            clientAuth: true,
          },
        },
      },
    });

    console.log({ updatedConnection });
    return NextResponse.json(updatedConnection);
  } catch (error) {
    console.error("Error updating OAuth2 connection:", error);
    return NextResponse.json(
      { error: "Failed to update OAuth2 connection" },
      { status: 500 }
    );
  }
}

// DELETE - Remove OAuth2 connection
export async function DELETE(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get("id");

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    // Check if connection exists
    const existingConnection = await prisma.oauth2Connection.findUnique({
      where: {
        id: connectionId,
      },
      include: {
        config: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingConnection) {
      return NextResponse.json(
        { error: "OAuth2 connection not found" },
        { status: 404 }
      );
    }

    // Check if connection is still active (optional business logic)
    const isActive =
      existingConnection.binding_created_at !== null &&
      existingConnection.binding_expired_at !== null &&
      existingConnection.binding_expired_at > new Date();

    // Delete OAuth2 connection
    await prisma.oauth2Connection.delete({
      where: {
        id: connectionId,
      },
    });

    return NextResponse.json(
      {
        message: "OAuth2 connection deleted successfully",
        deletedConnection: {
          id: existingConnection.id,
          configName: existingConnection.config.name,
          wasActive: isActive,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting OAuth2 connection:", error);
    return NextResponse.json(
      { error: "Failed to delete OAuth2 connection" },
      { status: 500 }
    );
  }
}
