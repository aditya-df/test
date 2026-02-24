"use server";

import { BigQuery } from "@google-cloud/bigquery";
import { storage } from "@/utils/storage";
import { prisma } from "@/config/db";
import { auth } from "@/auth.config";
import {
  DataAuthRestApi,
  DataHeaderRestApi,
  DataConfigRestApi,
} from "@/stores/knowledge-new/model";
import apiClient from "@/lib/apiClient";
import nextAuthToken from "@/lib/nextauth-token";

// Helper function to get bucket name for organization
function getBucketName(organizationId: string): string {
  return `${process.env.BUCKET_PREFIX}knowgenai_credentials_${organizationId}`;
}

// Helper function to fetch credential file from GCS
async function fetchCredentialFile(
  credentialId: string,
): Promise<string | null> {
  try {
    const user = await nextAuthToken.getUser();

    const organizationId = user?.organizationId;
    console.log({ organizationId });

    if (!organizationId) {
      throw new Error("Organization not found");
    }

    // Get credential record from database
    const credential = await prisma.credentials.findUnique({
      where: {
        id: credentialId,
        organizationId: organizationId, // Ensure user can only access their org's credentials
      },
      select: {
        credentialFile: true,
      },
    });

    if (!credential || !credential.credentialFile) {
      throw new Error("Credential file not found");
    }

    // Fetch file from Google Cloud Storage
    const bucketName = getBucketName(organizationId);
    const file = storage.bucket(bucketName).file(credential.credentialFile);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error("Credential file does not exist in storage");
    }

    // Download file content
    const [fileContent] = await file.download();
    return fileContent.toString("utf-8");
  } catch (error) {
    console.error("Error fetching credential file:", error);
    return null;
  }
}

// Helper function to provide better error messages for common BigQuery issues
function getBigQueryErrorMessage(error: any): string {
  const errorMessage = error.message || error.toString();

  if (errorMessage.includes("must be qualified with a dataset")) {
    return `BigQuery Error: Table names must include the dataset. Use format 'dataset.table' or 'project.dataset.table'. Example: 'my_dataset.departments' instead of just 'departments'.`;
  }

  if (errorMessage.includes("Not found: Table")) {
    return `BigQuery Error: Table not found. Please check that the table exists and you have the correct permissions.`;
  }

  if (errorMessage.includes("Access Denied")) {
    return `BigQuery Error: Access denied. Please check that your service account has the necessary permissions to access this dataset/table.`;
  }

  if (errorMessage.includes("Invalid project ID")) {
    return `BigQuery Error: Invalid project ID. Please check your service account credentials file.`;
  }

  if (errorMessage.includes("Syntax error")) {
    return `BigQuery Error: SQL syntax error. Please check your query syntax.`;
  }

  // Return the original error message if no specific handling is needed
  return `BigQuery Error: ${errorMessage}`;
}

// Timeout wrapper utility function
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out",
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

export async function testConnectionDatabase(
  databaseType: string | undefined,
  credentialsFile: File | null,
  credentialId?: string, // Add credentialId parameter for existing credentials
) {
  if (databaseType === "bigquery") {
    try {
      // Wrap the entire operation with a 30-second timeout
      return await withTimeout(
        (async () => {
          let credentials: string | null = null;

          // Handle both uploaded file and existing credential scenarios
          if (credentialId) {
            // Fetch credential file from GCS using credential ID
            credentials = await fetchCredentialFile(credentialId);
            if (!credentials) {
              throw new Error("Failed to fetch credential file from storage");
            }
          } else if (credentialsFile) {
            // Use uploaded file directly
            credentials = await credentialsFile.text();
          }

          if (!credentials) {
            throw new Error("No credentials provided");
          }

          const credentialsJson = JSON.parse(credentials);

          const bigquery = new BigQuery({
            projectId: credentialsJson.project_id,
            credentials: credentialsJson,
          });

          const response: Array<Record<string, any>> = [];

          const [datasets] = await bigquery.getDatasets();

          // Limit the number of datasets to process to avoid memory issues
          const MAX_DATASETS = 50;
          const datasetsToProcess = datasets.slice(0, MAX_DATASETS);

          for (const dataset of datasetsToProcess) {
            const datasetId = dataset.id as string;
            const location: any = dataset.location;
            const tablesArr: Array<{ table_id: string; schema: any }> = [];
            const [tables] = await bigquery.dataset(datasetId).getTables();

            // Limit the number of tables per dataset to avoid memory issues
            const MAX_TABLES_PER_DATASET = 100;
            const tablesToProcess = tables.slice(0, MAX_TABLES_PER_DATASET);

            for (const table of tablesToProcess) {
              const tableId = table.id as string;
              const [metadata] = await bigquery
                .dataset(datasetId)
                .table(tableId)
                .getMetadata();
              const schema = metadata.schema.fields;
              tablesArr.push({
                table_id: tableId,
                schema: schema,
              });
            }
            response.push({
              dataset_id: datasetId,
              tables: tablesArr,
              location: location,
            });
          }

          console.log(response);

          const message =
            datasets.length > MAX_DATASETS
              ? `Connection successful. Showing ${MAX_DATASETS} of ${datasets.length} datasets (limited for performance).`
              : `Query executed successfully. Returned ${datasets.length} datasets.`;

          return {
            success: true,
            length: datasets.length,
            message,
            data: response,
          };
        })(),
        120000, // 120 second timeout
        "Connection test timed out. Your BigQuery project may have too many datasets. Please try again or contact support.",
      );
    } catch (error) {
      console.error("BigQuery connection test error:", error);

      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes("timed out")) {
        return {
          success: false,
          error: error.message,
          isTimeout: true,
        };
      }

      return {
        success: false,
        error: getBigQueryErrorMessage(error),
      };
    }
  }

  return {
    success: false,
    error: "Unsupported database type",
  };
}

export async function testQueryBigquery(
  database_type: string,
  sql_command: string,
  database_zone: string,
  credentialsFile: File | null,
) {
  if (database_type === "bigquery") {
    try {
      // Wrap the entire query execution with a 60-second timeout (queries can take longer than connections)
      return await withTimeout(
        (async () => {
          let credentials: string | null = null;

          // Handle both uploaded file and existing credential scenarios
          if (credentialsFile) {
            // Use uploaded file directly
            credentials = await credentialsFile.text();
          }

          if (!credentials) {
            throw new Error("No credentials provided");
          }

          const credentialsJson = JSON.parse(credentials);

          const bigquery = new BigQuery({
            projectId: credentialsJson.project_id,
            credentials: credentialsJson,
          });

          // Add LIMIT clause to prevent memory issues from large result sets
          let limitedQuery = sql_command.trim();

          // Check if query already has a LIMIT clause (case insensitive)
          const hasLimit = /\bLIMIT\s+\d+/i.test(limitedQuery);

          if (!hasLimit) {
            // Remove trailing semicolon if present
            limitedQuery = limitedQuery.replace(/;+$/, "");
            // Add LIMIT to prevent excessive memory usage
            limitedQuery = `${limitedQuery} LIMIT 1000`;
          }

          // Test with COUNT query first for validation
          const queryCount = limitedQuery.replace(
            /SELECT\s+\*/i,
            "SELECT COUNT(*)",
          );

          const [countResultRaw] = await bigquery.query({
            query: queryCount,
            location: database_zone,
            maxResults: 1,
          });

          // Then test the actual query with limited results
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [queryResult] = await bigquery.query({
            query: limitedQuery,
            location: database_zone,
            maxResults: 100, // Limit to 100 rows for testing
          });

          // Normalize and coerce the count result to a number
          let rowCount = 0;
          if (countResultRaw && countResultRaw[0]) {
            const firstRow = countResultRaw[0] as Record<string, any>;
            const firstValue = Object.values(firstRow)[0];
            rowCount = Number(firstValue) || 0;
          }

          return {
            success: true,
            message:
              rowCount > 1000
                ? `Query validated successfully. Found ${rowCount} total rows (limited to 1000 for testing).`
                : `Query executed successfully. Returned ${rowCount} rows.`,
            rowCount,
          };
        })(),
        60000, // 60 second timeout for queries
        "Query execution timed out. Your query may be too complex or returning too many results. Please simplify your query or add a LIMIT clause.",
      );
    } catch (error) {
      console.error("BigQuery query test error:", error);

      // Check if it's a timeout error
      if (error instanceof Error && error.message.includes("timed out")) {
        return {
          success: false,
          error: error.message,
          isTimeout: true,
        };
      }

      return {
        success: false,
        error: getBigQueryErrorMessage(error),
      };
    }
  } else {
    return {
      success: false,
      error: "Unsupported database type",
    };
  }
}

export async function testApiConfiguration(
  url: string,
  method: string,
  headers: DataHeaderRestApi[],
  auth: DataAuthRestApi,
  config: DataConfigRestApi,
  body: string | null,
) {
  try {
    const requestHeaders: any = {
      ...headers,
    };
    let requestUrl = url;
    if (auth.type === "bearer") {
      requestHeaders.Authorization = `Bearer ${auth.bearer_token}`;
    } else if (auth.type === "apikey") {
      if (auth.key_location === "header") {
        requestHeaders[auth.key_name || ""] = auth.api_key;
      } else if (auth.key_location === "query") {
        // must compatible if the request url has default query parameter
        const urlObj = new URL(url);
        urlObj.searchParams.set(auth.key_name || "", auth.api_key || "");
        requestUrl = urlObj.toString();
      }
    } else if (auth.type === "basic") {
      requestHeaders.Authorization = `Basic ${auth.username}:${auth.password}`;
    } else if (auth.type === "oauth2") {
      // run function
    }

    const fetchOptions: any = {
      method: method,
      headers: requestHeaders,
    };
    if (
      !["GET", "DELETE"].includes(method.toUpperCase()) &&
      body !== null &&
      body !== undefined
    ) {
      fetchOptions.body = body;
    }
    const response = await fetch(requestUrl, fetchOptions);

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    return {
      success: false,
      error: error,
    };
  }
}
