"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Download, AlertCircle, Loader2 } from "lucide-react";

interface DownloadMessageTablesProps {
  parts?: any[];
  isFinished?: boolean;
  isTyping?: boolean;
}

interface BigQueryToolInfo {
  toolId: string;
  sqlCommand: string;
  databaseZone?: string;
  toolName: string;
  queryType?: string;
}

export const DownloadMessageTables = ({
  parts,
  isFinished = true,
  isTyping,
}: DownloadMessageTablesProps) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string>("");

  const authFunctionName = [
    "get_pajakexpress_auth_token_4917",
    "get_x_token_auth_321",
  ];
  const restFunctionName = [
    "get_pph21_status_43720",
    "get_unification_withholding_slips_abc789",
    "get_vat_in_transactions_pajakexpress_1985",
  ];
  const mcpFunctionName = [
    "search-entry-by-account-no",
    "search-entry-for-ppn-vendor",
  ];

  const [pajakExpressMeta, setPajakExpressMeta] = useState<{
    totalBatch: number;
    limit: number;
    totalData: number;
  }>({
    totalBatch: 1,
    limit: 1000,
    totalData: 0,
  });

  console.log({ parts });
  const pajakExpressTools = useMemo(() => {
    if (!parts) return [];

    const tools: { args: any; toolName: string; type: string }[] = [];

    parts.forEach((part: any) => {
      // AI SDK 5.0 pattern: Tool parts are named tool-{toolName}
      if (
        part.type?.startsWith("tool-") &&
        part.state === "output-available" &&
        part.output &&
        part.type !== "tool-addReasoningStep"
      ) {
        const toolName = part.type.replace("tool-", "");
        let type: string | undefined;

        if (restFunctionName.includes(toolName)) {
          type = "rest";
        } else if (mcpFunctionName.includes(toolName)) {
          type = "mcp";
        } else if (authFunctionName.includes(toolName)) {
          type = "auth";
        } else if (toolName.includes("table_ppn_tool")) {
          type = "cust";
        }

        if (type) {
          tools.push({
            args: part.input, // In SDK 5.0, arguments are in 'input'
            toolName,
            type,
          });
        }
      }

      // Fallback for AI SDK 4.x pattern: Generic tool-invocation type
      if (
        part.type === "tool-invocation" &&
        part.toolInvocation?.state === "result" &&
        part.toolInvocation?.result &&
        part.toolInvocation.toolName !== "addReasoningStep"
      ) {
        const { toolName } = part.toolInvocation;
        let type: string | undefined;

        if (restFunctionName.includes(toolName)) {
          type = "rest";
        } else if (mcpFunctionName.includes(toolName)) {
          type = "mcp";
        } else if (authFunctionName.includes(toolName)) {
          type = "auth";
        } else if (toolName.includes("table_ppn_tool")) {
          type = "cust";
        }

        if (type) {
          tools.push({
            args: part.toolInvocation.args,
            toolName,
            type,
          });
        }
      }
    });

    // const hasAuth = tools.some((t) => t.type === "auth");
    const hasRest = tools.some((t) => t.type === "rest");
    // const hasMcp = tools.some((t) => t.type === "mcp");
    const hasMcp = true;

    if (hasRest && hasMcp) {
      return tools;
    }

    return [];
  }, [parts]);
  useEffect(() => {
    const isVAT = pajakExpressTools.find(
      (tool) => tool.toolName === "get_vat_in_transactions_pajakexpress_1985",
    );

    if (isVAT) {
      setPajakExpressMeta({
        ...pajakExpressMeta,
        limit: 200,
      });
    }
  }, [pajakExpressTools]);

  const downloadXLSXPajakExpress = useCallback(
    async (batch?: number) => {
      setIsDownloading(true);
      setDownloadError(null);
      setDownloadProgress("Initializing download...");
      const isHasVAT = pajakExpressTools.find(
        (tool) => tool.toolName === "get_vat_in_transactions_pajakexpress_1985",
      );

      try {
        // Fetch and add each table as a separate sheet
        const startTime = Date.now();

        setDownloadProgress(`Executing Function...`);

        // Call the API to execute the SQL with higher limit
        const response = await fetch("/api/execute-pajakexpress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tools: pajakExpressTools,
            batch,
            limit: isHasVAT ? 200 : pajakExpressMeta.limit,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to fetch data: ${errorData.error || response.statusText}`,
          );
        }

        const fetchTime = Date.now() - startTime;
        setDownloadProgress(
          `Processing... (fetched in ${(fetchTime / 2000).toFixed(1)}s)`,
        );

        const result = await response.json();
        if (result.meta) setPajakExpressMeta(result.meta);

        setDownloadProgress(`Converting data to Excel format...`);

        // Create a new workbook
        const wb = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(result?.data);
        XLSX.utils.book_append_sheet(wb, worksheet, "Sheet1");

        setDownloadProgress("Generating Excel file...");

        // Generate filename with timestamp
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .substring(0, 19);

        let type;
        if (
          pajakExpressTools.find(
            (tool) => tool.toolName === "get_pph21_status_43720",
          )
        ) {
          type = "pph21";
        } else if (
          pajakExpressTools.find(
            (tool) =>
              tool.toolName === "get_unification_withholding_slips_abc789",
          )
        ) {
          type = "pph23";
        } else if (
          pajakExpressTools.find(
            (tool) =>
              tool.toolName === "get_vat_in_transactions_pajakexpress_1985",
          )
        ) {
          type = "vat";
        }
        const filename = `pajak-express-${type}-${timestamp}.xlsx`;

        // Download the file
        XLSX.writeFile(wb, filename);

        setDownloadProgress(`✅ Downloaded data successfully`);
        setTimeout(() => {
          setDownloadProgress("");
        }, 3000);

        setIsDownloading(false);
      } catch (error) {
        console.error("❌ Error downloading data:", error);
        setDownloadError(
          error instanceof Error ? error.message : "Failed to download data",
        );
        setDownloadProgress("");
        setIsDownloading(false);
      }
    },
    [pajakExpressTools],
  );

  // Debug: Log tool parts to diagnose data availability after page refresh
  useEffect(() => {
    const toolParts =
      parts?.filter(
        (p) => p.type?.startsWith("tool-") || p.type === "tool-invocation",
      ) || [];
    console.log(
      "📊 DownloadMessageTables - Tool parts found:",
      toolParts.length,
    );

    toolParts.forEach((part, idx) => {
      if (part.type === "tool-invocation") {
        const inv = part.toolInvocation || {};
        const result = inv.result || {};
        console.log(`  [${idx}] tool-invocation: ${inv.toolName}`, {
          isBigQuery: part.isBigQuery || inv.isBigQuery,
          state: inv.state,
          hasResult: !!inv.result,
          resultKeys: inv.result ? Object.keys(inv.result) : [],
          hasOriginalSqlCommand: !!result.originalSqlCommand,
          originalSqlCommandPreview: result.originalSqlCommand
            ? result.originalSqlCommand.substring(0, 100)
            : "NOT FOUND",
          hasToolId: !!result.toolId,
          toolId: result.toolId,
          argsKeys: Object.keys(inv.args || {}),
          // Show full result structure for debugging
          resultSample: JSON.stringify(result).substring(0, 500),
        });
      } else {
        console.log(`  [${idx}] ${part.type}`, {
          isBigQuery: part.isBigQuery,
          state: part.state,
          hasOutput: !!part.output,
          outputKeys: part.output ? Object.keys(part.output) : [],
          hasInput: !!part.input,
          inputKeys: part.input ? Object.keys(part.input) : [],
        });
      }
    });
  }, [parts]);

  // console.log({ pajakExpressTools, bigQueryToolsCount: bigQueryTools.length });

  const bigQueryTools = useMemo(() => {
    if (!parts) return [];

    const tools: BigQueryToolInfo[] = [];

    parts.forEach((part: any) => {
      // AI SDK 5.0: Check for tool parts and access output directly
      if (
        part.type?.startsWith("tool-") &&
        part.type !== "tool-invocation" &&
        (part.state === "output-available" ||
          "output" in part ||
          "input" in part)
      ) {
        const rawResult = part.output || {};
        const result = rawResult.value || rawResult; // Handle {type: 'json', value: {...}} structure
        const input = part.input || {};
        const toolName = part.type.replace("tool-", "");

        // Also check nested data structure
        const rawResultData = result.data || {};
        const resultData = rawResultData.value || rawResultData;

        // Check if this is a BigQuery tool by flag or by looking for BigQuery-specific fields
        const isBigQuery =
          part.isBigQuery === true ||
          result.originalSqlCommand ||
          result.executedQuery ||
          input.sqlCommand ||
          result.toolId ||
          result.databaseZone !== undefined ||
          resultData.originalSqlCommand ||
          resultData.executedQuery ||
          toolName.toLowerCase().includes("bigquery") ||
          toolName.toLowerCase().includes("inventory") ||
          toolName.toLowerCase().includes("warehouse") ||
          toolName.toLowerCase().includes("research") ||
          toolName.toLowerCase().includes("knowledge") ||
          toolName.toLowerCase().includes("query") ||
          toolName.toLowerCase().includes("stock");

        if (isBigQuery) {
          // Robust field extraction - check all possible locations
          const sqlCommand =
            result.originalSqlCommand ||
            result.executedQuery ||
            result.sql_command ||
            result.sqlCommand ||
            result.query ||
            result.sql ||
            resultData.originalSqlCommand ||
            resultData.executedQuery ||
            resultData.sql_command ||
            resultData.sqlCommand ||
            resultData.query ||
            resultData.sql ||
            input.sqlCommand ||
            input.executedQuery ||
            input.sql_command ||
            input.query ||
            input.sql;

          const toolId =
            result.toolId ||
            resultData.toolId ||
            input.toolId ||
            result.id ||
            input.id ||
            "unknown";

          const databaseZone =
            result.databaseZone ||
            resultData.databaseZone ||
            input.databaseZone ||
            "asia-southeast2";

          // Debug logging
          console.log(`🔍 BigQuery tool detection (SDK 5.0): ${toolName}`, {
            isBigQueryFlag: part.isBigQuery,
            hasOutput: !!part.output,
            hasInput: !!part.input,
            resultKeys: Object.keys(result),
            resultDataKeys: Object.keys(resultData),
            inputKeys: Object.keys(input),
            foundSqlCommand: !!sqlCommand,
            sqlCommandPreview: sqlCommand
              ? sqlCommand.substring(0, 100) + "..."
              : "NOT FOUND",
          });

          tools.push({
            toolId: toolId,
            sqlCommand: sqlCommand || "",
            databaseZone: databaseZone,
            toolName: toolName,
            queryType:
              result?.metadata?.query_type ||
              resultData?.metadata?.query_type ||
              result?.query_type ||
              input?.query_type,
          });
        }
      }

      // Fallback for AI SDK 4.x / Legacy pattern: tool-invocation type
      if (part.type === "tool-invocation") {
        const invocation = part.toolInvocation || {};
        const rawResult = invocation.result || {};
        const result = rawResult.value || rawResult; // Handle {type: 'json', value: {...}} structure
        const args = invocation.args || {};
        const toolName = invocation.toolName || "";

        // Also check nested data structure
        const rawResultData = result.data || {};
        const resultData = rawResultData.value || rawResultData;

        // Detection: Check flag, result fields, or args fields
        const isBigQuery =
          part.isBigQuery === true ||
          invocation.isBigQuery === true ||
          result.originalSqlCommand ||
          result.executedQuery ||
          args.sqlCommand ||
          args.executedQuery ||
          resultData.originalSqlCommand ||
          resultData.executedQuery ||
          toolName.toLowerCase().includes("bigquery") ||
          toolName.toLowerCase().includes("inventory") ||
          toolName.toLowerCase().includes("warehouse") ||
          toolName.toLowerCase().includes("research") ||
          toolName.toLowerCase().includes("knowledge") ||
          toolName.toLowerCase().includes("query") ||
          toolName.toLowerCase().includes("stock");

        if (isBigQuery) {
          // Robust field extraction - check all possible locations
          // Priority: result > result.data > args
          const sqlCommand =
            result.originalSqlCommand ||
            result.executedQuery ||
            result.sql_command ||
            result.sqlCommand ||
            result.query ||
            result.sql ||
            resultData.originalSqlCommand ||
            resultData.executedQuery ||
            resultData.sql_command ||
            resultData.sqlCommand ||
            resultData.query ||
            resultData.sql ||
            args.sqlCommand ||
            args.executedQuery ||
            args.sql_command ||
            args.query ||
            args.sql;

          const toolId =
            result.toolId ||
            resultData.toolId ||
            args.toolId ||
            invocation.toolCallId ||
            result.id ||
            args.id;

          const databaseZone =
            result.databaseZone ||
            resultData.databaseZone ||
            args.databaseZone ||
            "asia-southeast2";

          // Debug logging to help diagnose missing sqlCommand
          console.log(`🔍 BigQuery tool detection: ${toolName}`, {
            isBigQueryFlag: part.isBigQuery || invocation.isBigQuery,
            hasResult: !!invocation.result,
            resultKeys: Object.keys(result),
            resultDataKeys: Object.keys(resultData),
            argsKeys: Object.keys(args),
            foundSqlCommand: !!sqlCommand,
            sqlCommandPreview: sqlCommand
              ? sqlCommand.substring(0, 100) + "..."
              : "NOT FOUND",
          });

          // Add tool if isBigQuery flag is explicitly true OR if we have sqlCommand
          if (
            part.isBigQuery === true ||
            invocation.isBigQuery === true ||
            sqlCommand
          ) {
            tools.push({
              toolId: toolId || invocation.toolCallId || "unknown",
              sqlCommand: sqlCommand || "",
              databaseZone: databaseZone,
              toolName: toolName || "BigQuery",
              queryType:
                result?.metadata?.query_type ||
                resultData?.metadata?.query_type ||
                args?.query_type ||
                result?.query_type,
            });
          }
        }
      }
    });

    // Summary log
    console.log(`📊 BigQuery tools summary: ${tools.length} tools found`, {
      toolsWithSql: tools.filter((t) => t.sqlCommand && t.sqlCommand.length > 0)
        .length,
      toolsWithoutSql: tools.filter(
        (t) => !t.sqlCommand || t.sqlCommand.length === 0,
      ).length,
      tools: tools.map((t) => ({
        name: t.toolName,
        hasSql: !!t.sqlCommand,
        sqlLen: t.sqlCommand?.length || 0,
      })),
    });

    return tools;
  }, [parts]);

  const downloadAllAsXLSX = useCallback(async () => {
    if (bigQueryTools.length === 0) {
      console.warn("No BigQuery tools found to download");
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);
    setDownloadProgress("Initializing download...");

    // Download row limit per table (balance between speed and data volume)
    // const DOWNLOAD_ROW_LIMIT = 2000;

    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      let totalRows = 0;

      // Filter tools that have valid sqlCommand for download
      const downloadableTools = bigQueryTools.filter(
        (tool) => tool.sqlCommand && tool.sqlCommand.trim().length > 0,
      );

      if (downloadableTools.length === 0) {
        // Log detailed info to help diagnose the issue
        console.error(
          "❌ No downloadable tools found. BigQuery tools detected but missing SQL commands:",
          bigQueryTools.map((t) => ({
            toolName: t.toolName,
            toolId: t.toolId,
            hasSqlCommand: !!t.sqlCommand,
            sqlCommandLength: t.sqlCommand?.length || 0,
          })),
        );
        throw new Error(
          "No tools with valid SQL commands found for download. " +
            "This may happen if the query result was not properly saved. " +
            "Please try running the query again. Check browser console for details.",
        );
      }

      // Fetch and add each table as a separate sheet
      for (let i = 0; i < downloadableTools.length; i++) {
        const tool = downloadableTools[i];
        const startTime = Date.now();

        setDownloadProgress(
          `Executing BigQuery ${i + 1}/${downloadableTools.length}...`,
        );
        console.log(
          `📊 Fetching data from tool ${i + 1}/${downloadableTools.length}...`,
        );

        // Replace LIMIT clause with higher limit for download
        // Original SQL has LIMIT for display (e.g., LIMIT 20)
        // For download, we use LIMIT 2000 for better performance while still getting much more data
        let downloadSqlCommand = tool.sqlCommand;

        if (/\s+LIMIT\s+\d+/i.test(downloadSqlCommand)) {
          // Replace existing LIMIT with higher limit
          downloadSqlCommand = downloadSqlCommand.replace(
            /\s+LIMIT\s+\d+\s*;?\s*$/i,
            ``,
          );
        } else {
          // Add LIMIT if not present
          downloadSqlCommand = downloadSqlCommand.replace(/;\s*$/, "");
          downloadSqlCommand = `${downloadSqlCommand}`;
        }

        console.log(`🔄 Updated LIMIT clause for download:`, {
          original: tool.sqlCommand.substring(tool.sqlCommand.length - 50),
          download: downloadSqlCommand.substring(
            downloadSqlCommand.length - 50,
          ),
        });

        // Call the API to execute the SQL with higher limit
        const response = await fetch("/api/execute-bigquery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sqlCommand: downloadSqlCommand,
            toolId: tool.toolId,
            databaseZone: tool.databaseZone,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Failed to fetch data from ${tool.toolName}: ${
              errorData.error || response.statusText
            }`,
          );
        }

        const fetchTime = Date.now() - startTime;
        setDownloadProgress(
          `Processing ${i + 1}/${bigQueryTools.length}... (fetched in ${(
            fetchTime / 2000
          ).toFixed(1)}s)`,
        );

        const result = await response.json();
        const rows = result.data.rows;

        console.log(`✅ Fetched ${rows.length} rows from ${tool.toolName}`, {
          executionTime: `${(result.data.executionTime / 2000).toFixed(2)}s`,
        });

        if (rows && rows.length > 0) {
          setDownloadProgress(
            `Converting ${rows.length} rows to Excel format...`,
          );

          // Extract headers from first row keys
          const headers = Object.keys(rows[0]);

          // Convert rows to array of arrays (optimized for large datasets)
          const dataRows = rows.map((row: any) =>
            headers.map((header) => {
              const value = row[header];

              // Handle null/undefined
              if (value === null || value === undefined) return "";

              // Handle objects with 'value' property (extract the actual value)
              if (
                typeof value === "object" &&
                value !== null &&
                "value" in value
              ) {
                return String(value.value);
              }

              // Handle other objects (stringify them as JSON)
              if (typeof value === "object") {
                return JSON.stringify(value);
              }

              // Handle primitives
              return String(value);
            }),
          );

          // Combine headers and data
          const tableData = [headers, ...dataRows];

          // Create a descriptive sheet name
          let sheetName = `Dataset_${i + 1}`;
          if (tool.queryType) {
            sheetName = `${tool.queryType}_${i + 1}`;
          }

          // Excel sheet names max 31 chars
          sheetName = sheetName.substring(0, 31);

          const ws = XLSX.utils.aoa_to_sheet(tableData);

          // Add metadata row with query information
          const metadataRow = tableData.length + 2;
          const limitInfo = rows.length
            ? `${rows.length} rows (all data)`
            : `${rows.length} rows (all data)`;
          const metadataText = `Source: ${
            tool.toolName
          } | Query: ${downloadSqlCommand.substring(0, 100)}${
            downloadSqlCommand.length > 100 ? "..." : ""
          } | ${limitInfo}`;
          ws[`A${metadataRow}`] = {
            t: "s",
            v: metadataText,
          };

          XLSX.utils.book_append_sheet(wb, ws, sheetName);
          totalRows += rows.length;
        }
      }

      setDownloadProgress("Generating Excel file...");

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .substring(0, 19);
      const filename = `dataset-${timestamp}.xlsx`;

      // Download the file
      XLSX.writeFile(wb, filename);

      console.log(
        `✅ Downloaded Excel file: ${filename} with ${totalRows} total rows`,
      );

      setDownloadProgress(`✅ Downloaded ${totalRows} rows successfully`);
      setTimeout(() => {
        setDownloadProgress("");
      }, 3000);

      setIsDownloading(false);
    } catch (error) {
      console.error("❌ Error downloading datasets:", error);
      setDownloadError(
        error instanceof Error ? error.message : "Failed to download datasets",
      );
      setDownloadProgress("");
      setIsDownloading(false);
    }
  }, [bigQueryTools]);

  // Calculate how many tools are downloadable (have valid SQL commands)
  const downloadableToolsCount = useMemo(() => {
    return bigQueryTools.filter(
      (tool) => tool.sqlCommand && tool.sqlCommand.trim().length > 0,
    ).length;
  }, [bigQueryTools]);

  // Don't render if no tools found or if streaming is not finished
  if (
    (bigQueryTools.length === 0 && pajakExpressTools.length === 0) ||
    !isFinished
  ) {
    return null;
  }

  return (
    <div className="w-full mt-3 mb-2">
      {downloadError && (
        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-red-800 dark:text-red-200">
            {downloadError}
          </span>
        </div>
      )}
      {downloadProgress && (
        <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md flex items-start gap-2 text-xs">
          <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
          <span className="text-blue-800 dark:text-blue-200">
            {downloadProgress}
          </span>
        </div>
      )}
      {bigQueryTools.length > 0 && (
        <button
          onClick={downloadAllAsXLSX}
          disabled={isDownloading}
          className={`
            w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700
            dark:hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium
            shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isTyping ? "hidden" : ""
            }`}
          title={
            downloadableToolsCount > 0
              ? "Download your query results in Excel format (available after query completes)"
              : "No downloadable query results available (SQL command not found)"
          }
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Downloading Query Results...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>
                Download Query Results (
                {downloadableToolsCount > 0
                  ? downloadableToolsCount
                  : bigQueryTools.length}{" "}
                {(downloadableToolsCount > 0
                  ? downloadableToolsCount
                  : bigQueryTools.length) === 1
                  ? "table"
                  : "tables"}
                )
              </span>
            </>
          )}
        </button>
      )}
      {pajakExpressTools.length > 0 && (
        <div className="w-full flex gap-x-2">
          {Array.from({ length: pajakExpressMeta?.totalBatch || 1 }).map(
            (_, index) => (
              <button
                key={index}
                onClick={() => downloadXLSXPajakExpress(index + 1)}
                disabled={isDownloading}
                className={`
            w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 dark:bg-green-700       
            dark:hover:bg-green-600 text-white px-3 py-2 rounded-md transition-colors text-sm font-medium        
            shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isTyping ? "hidden" : ""
            }`}
                title="Download 1000 data results in Excel format (available after query completes)"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Downloading Results...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      Download full Data{" "}
                      {pajakExpressMeta.totalBatch > 1
                        ? `${pajakExpressMeta.limit * index + 1} - ${
                            pajakExpressMeta.limit * (index + 1)
                          }`
                        : ""}
                    </span>
                  </>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
};
