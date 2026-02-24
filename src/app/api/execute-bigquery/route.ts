// src/app/api/execute-bigquery/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { BigQuery } from "@google-cloud/bigquery";

export const dynamic = "force-dynamic";

/**
 * POST /api/execute-bigquery
 * Executes a BigQuery SQL command with the provided credentials
 *
 * Request body:
 * - sqlCommand: The SQL query to execute
 * - toolId: The tool ID to fetch credentials for
 * - databaseZone: The BigQuery dataset zone (e.g., 'asia-southeast2')
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sqlCommand, toolId, databaseZone } = await request.json();

    // Validate required parameters
    if (!sqlCommand || !toolId) {
      return NextResponse.json(
        { error: "Missing required parameters: sqlCommand and toolId" },
        { status: 400 }
      );
    }

    console.log("📥 BigQuery execution request:", {
      userId: session.user.id,
      toolId,
      sqlCommand: sqlCommand, // Log truncated SQL
      databaseZone: databaseZone || "default",
    });

    // Fetch credentials from backend API (same way as dynamicTools.ts)
    const credentialsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V2}/document/get-creds/${toolId}`,
      {
        method: "GET",
        headers: {
          "User-id": session.user.id,
          Authorization: `Bearer ${session.user.backendToken}`,
        },
      }
    );

    if (!credentialsResponse.ok) {
      console.error("Failed to fetch credentials:", credentialsResponse.status);
      return NextResponse.json(
        { error: "Failed to fetch credentials from backend" },
        { status: 500 }
      );
    }

    const bigqueryCredentials = await credentialsResponse.json();

    if (!bigqueryCredentials || !bigqueryCredentials.project_id) {
      console.error("Invalid credentials format:", bigqueryCredentials);
      return NextResponse.json(
        { error: "Invalid credential data format" },
        { status: 400 }
      );
    }

    // Initialize BigQuery client (same pattern as dynamicTools.ts)
    const bigquery = new BigQuery({
      projectId: bigqueryCredentials.project_id,
      credentials: bigqueryCredentials,
    });

    console.log("🚀 Executing BigQuery...");
    const startTime = Date.now();

    // Execute the original query without row limits
    // The query is already tailored to the user's prompt
    const finalQuery = sqlCommand.replace(/;\s*$/, "");

    const options = {
      query: finalQuery,
      location: databaseZone || undefined,
      timeoutMs: 300000, // 5 minute timeout for large datasets
    };

    // Execute the query
    const [rows] = await bigquery.query(options);

    const executionTime = Date.now() - startTime;
    console.log(`✅ BigQuery execution completed in ${executionTime}ms, rows: ${rows.length}`);

    return NextResponse.json({
      success: true,
      data: {
        rows,
        rowCount: rows.length,
        executionTime,
        isLimited: false,
        maxRows: undefined,
      },
      executedQuery: finalQuery,
    });
  } catch (error) {
    console.error("❌ Error executing BigQuery:", error);

    return NextResponse.json(
      {
        error: "Failed to execute BigQuery",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
