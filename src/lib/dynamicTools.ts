import { z } from "zod";
import {
  GoogleCustomSearchClient,
  WeatherClient,
  WikipediaClient,
} from "@agentic/stdlib";
import { prisma } from "@/config/db";
import { BigQuery } from "@google-cloud/bigquery";
import { getAuthSession } from "@/utils/auth-utils-server";
import {
  calculateColumnAverages,
  calculateColumnSums,
  getFunctionDataFromDB,
  hashText,
  isSameKey,
  objectToKeyValueArray,
  removeNonArrayValues,
} from "@/utils/utils";
import {
  DataAuthRestApi,
  DataRequestRestApi,
} from "@/stores/knowledge-new/model";
import { resolveDynamicFunction } from "@/utils/dynamicFunction";
import JSONbig from "json-bigint";

export const dynamic = "force-dynamic";

/**
 * Interface representing a tool definition from the database
 */
interface DatabaseTool {
  id: string;
  name: string;
  description: string;
  parameters: Record<
    string,
    {
      type: string;
      description: string;
      required: boolean;
      enum?: string[];
    }
  >;
  executionCode: string;
}

/**
 * Creates a Zod schema from parameter definitions
 * @param parameters The parameter definitions from the database
 * @returns A Zod schema object
 */
function createParameterSchema(parameters: DatabaseTool["parameters"]) {
  const schemaObj: Record<string, any> = {};

  Object.entries(parameters).forEach(([paramName, paramConfig]) => {
    let paramSchema: z.ZodTypeAny;

    // Create the appropriate Zod type based on the parameter type
    switch (paramConfig.type) {
      case "string":
        paramSchema = z.string();
        break;
      case "number":
        paramSchema = z.number();
        break;
      case "boolean":
        paramSchema = z.boolean();
        break;
      case "enum":
        if (paramConfig.enum && paramConfig.enum.length > 0) {
          paramSchema = z.enum(paramConfig.enum as [string, ...string[]]);
        } else {
          paramSchema = z.string();
        }
        break;
      default:
        paramSchema = z.string();
    }

    // Add description
    if (paramConfig.description) {
      paramSchema = paramSchema.describe(paramConfig.description);
    }

    // Make optional if not required
    if (!paramConfig.required) {
      paramSchema = paramSchema.optional();
    }

    schemaObj[paramName] = paramSchema;
  });

  return z.object(schemaObj);
}

/**
 * Creates a safe execution function from a string of code
 * @param executionCode The code to execute as a string
 * @returns An async function that executes the code safely
 */
function createExecutionFunction(
  executionCode: string,
  credential_ids: any,
  tool: any,
  credential?: any,
) {
  return async (params: any) => {
    let env_vars = null;

    const mappedEnv = {
      google_search: {
        GOOGLE_API_KEY: "",
        GOOGLE_CSE_ID: "",
      },
      wikipedia: {
        WIKIPEDIA_API_KEY: "",
      },
      weather: {
        WEATHER_API_KEY: "",
      },
    };

    // let credential_id = null;

    // if (credential_ids.google_search) {
    //   credential_id = credential_ids.google_search;
    // } else if (credential_ids.wikipedia) {
    //   credential_id = credential_ids.wikipedia;
    // } else if (credential_ids.weather) {
    //   credential_id = credential_ids.weather;
    // }

    // const result = await fetch(
    //   `${process.env.NEXT_PUBLIC_BACKEND_API_URL}credentials/${credential_id}`
    // );
    // const credential = await result.json();

    // Map credential data into mappedEnv and merge into env_vars
    try {
      const credData = credential;

      if (tool.name === "Google Search") {
        mappedEnv.google_search.GOOGLE_API_KEY = credData?.googleAPIKey || "";
        mappedEnv.google_search.GOOGLE_CSE_ID = credData?.googleCSID || "";
        env_vars = {
          ...(env_vars || {}),
          ...mappedEnv.google_search,
        };
      } else if (tool.name === "Wikipedia") {
        mappedEnv.wikipedia.WIKIPEDIA_API_KEY = credData?.wikipediaAPIKey || "";
        env_vars = {
          ...(env_vars || {}),
          ...mappedEnv.wikipedia,
        };
      } else if (tool.name === "Weather") {
        mappedEnv.weather.WEATHER_API_KEY = credData?.weatherAPIKey || "";
        env_vars = {
          ...(env_vars || {}),
          ...mappedEnv.weather,
        };
      }
    } catch (e) {
      console.error("Failed to map credentials to env vars", e);
    }
    const dependencies = {
      weather: WeatherClient,
      googleSearch: GoogleCustomSearchClient,
      wikipedia: WikipediaClient,
    };

    try {
      // Create a safe execution context with access to params
      // This uses Function constructor which is safer than eval
      const executeFn = new Function(
        "params",
        "dependencies",
        "env_vars",
        "return (async () => { " + executionCode + " })()",
      );
      return await executeFn(params, dependencies, env_vars);
    } catch (error) {
      console.error("Error executing dynamic tool:", error);
      return {
        success: false,
        error: "Failed to execute tool",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  };
}
/**
 * Checks if a SQL query already contains a WHERE clause
 * @param sqlCommand The SQL command to check
 * @returns true if WHERE clause exists, false otherwise
 */
function hasWhereClause(sqlCommand: string) {
  const normalizedSql = sqlCommand.trim().toLowerCase();

  // Check for WHERE keyword (case insensitive)
  const whereIndex = normalizedSql.indexOf("where");

  if (whereIndex === -1) {
    return false;
  }

  // Ensure it's not part of another word (e.g., "somewhere")
  const beforeWhere = normalizedSql.substring(0, whereIndex);
  const afterWhere = normalizedSql.substring(whereIndex + 5);

  // Check if there's whitespace or special characters before and after "where"
  const beforeValid =
    beforeWhere === "" || /[\s;()]/.test(beforeWhere.slice(-1));
  const afterValid = afterWhere === "" || /[\s(]/.test(afterWhere.charAt(0));

  return beforeValid && afterValid;
}

/**
 * Builds a WHERE clause based on field-value pairs
 * @param conditionFields Array of field names
 * @param conditionValues Array of corresponding values
 * @param operator The comparison operator (default: '=')
 * @returns A properly formatted WHERE clause
 */
function buildWhereClause(
  conditionFields: string[],
  conditionValues: string[],
  operator = "=",
) {
  if (conditionFields.length === 0 || conditionValues.length === 0) {
    return "";
  }

  // Helper to format values
  const formatValue = (value: string) => {
    if (value.toLowerCase() === "null") return "NULL";
    if (!isNaN(Number(value)) && value !== "") return value;
    if (value.startsWith("'") && value.endsWith("'")) return value;
    return `'${value.replace(/'/g, "''")}'`;
  };

  // Special handling for BETWEEN operator with mixed conditions
  // Example: Material=HG-100 AND Plant=JKT AND Tanggal BETWEEN '2025-11-01' AND '2025-11-30'
  if (operator.toUpperCase() === "BETWEEN") {
    // Check if the last field is "Tanggal" and we have extra values for date range
    const fields = conditionFields.map((f) => f.trim());
    const lastFieldIndex = fields.length - 1;
    const lastField = fields[lastFieldIndex];

    // Check if last field is Tanggal (date field) and we have 2 extra values
    if (
      lastField === "Tanggal" &&
      conditionValues.length === fields.length + 1
    ) {
      // Build conditions for all fields except Tanggal using = operator
      const conditions: string[] = [];

      for (let i = 0; i < lastFieldIndex; i++) {
        const field = fields[i];
        const value = conditionValues[i].trim();

        if (value.toLowerCase() === "null") {
          conditions.push(`${field} IS NULL`);
        } else if (value.toLowerCase() === "not null") {
          conditions.push(`${field} IS NOT NULL`);
        } else if (!isNaN(Number(value)) && value !== "") {
          conditions.push(`${field} = ${value}`);
        } else if (
          value.toLowerCase() === "true" ||
          value.toLowerCase() === "false"
        ) {
          conditions.push(`${field} = ${value.toLowerCase()}`);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          conditions.push(`${field} = ${value}`);
        } else {
          conditions.push(`${field} = '${value.replace(/'/g, "''")}'`);
        }
      }

      // Add BETWEEN condition for Tanggal field
      const startDate = conditionValues[lastFieldIndex].trim();
      const endDate = conditionValues[lastFieldIndex + 1].trim();
      conditions.push(
        `${lastField} BETWEEN ${formatValue(startDate)} AND ${formatValue(
          endDate,
        )}`,
      );

      return conditions.join(" AND ");
    }

    // Original BETWEEN logic for simple case (1 field, 2 values)
    if (conditionFields.length === 1 && conditionValues.length === 2) {
      const field = conditionFields[0].trim();
      const startValue = conditionValues[0].trim();
      const endValue = conditionValues[1].trim();

      return `${field} BETWEEN ${formatValue(startValue)} AND ${formatValue(
        endValue,
      )}`;
    } else {
      throw new Error(
        "BETWEEN operator requires exactly 1 field and 2 values, or multiple fields where last field (Tanggal) uses BETWEEN with 2 values",
      );
    }
  }

  // Standard validation for non-BETWEEN operators
  if (conditionFields.length !== conditionValues.length) {
    throw new Error("Number of fields must match number of values");
  }

  const conditions = conditionFields.map((field: string, index: number) => {
    const value = conditionValues[index];
    const trimmedField = field.trim();
    const trimmedValue = value.trim();

    // Handle different data types and escape values appropriately
    if (trimmedValue.toLowerCase() === "null") {
      return `${trimmedField} IS NULL`;
    }

    if (trimmedValue.toLowerCase() === "not null") {
      return `${trimmedField} IS NOT NULL`;
    }

    // Check if value is a number
    if (!isNaN(Number(trimmedValue)) && trimmedValue !== "") {
      return `${trimmedField} ${operator} ${trimmedValue}`;
    }

    // Check if value is a boolean
    if (
      trimmedValue.toLowerCase() === "true" ||
      trimmedValue.toLowerCase() === "false"
    ) {
      return `${trimmedField} ${operator} ${trimmedValue.toLowerCase()}`;
    }

    // Handle string values with proper escaping
    if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) {
      // Value is already quoted
      return `${trimmedField} ${operator} ${trimmedValue}`;
    }

    // Quote string values
    return `${trimmedField} ${operator} '${trimmedValue.replace(/'/g, "''")}'`;
  });

  return conditions.join(" AND ");
}

/**
 * Builds a WHERE clause for comparison queries with date filtering
 * @param comparisonPeriods Comma-separated periods like "August 2025, July 2025" or "2025-08, 2025-07"
 * @returns WHERE clause string for filtering by specified months
 */
function buildComparisonWhereClause(comparisonPeriods: string): string {
  const periods = comparisonPeriods
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p);

  if (periods.length === 0) {
    return "";
  }

  const monthConditions: string[] = [];

  for (const period of periods) {
    // Try to parse different formats
    let year: number | null = null;
    let month: number | null = null;

    // Format: "August 2025", "Juli 2025", etc.
    const monthYearMatch = period.match(/(\w+)\s+(\d{4})/i);
    if (monthYearMatch) {
      const monthName = monthYearMatch[1].toLowerCase();
      year = parseInt(monthYearMatch[2]);

      // Map month names to numbers (English and Indonesian)
      const monthMap: { [key: string]: number } = {
        january: 1,
        januari: 1,
        february: 2,
        februari: 2,
        march: 3,
        maret: 3,
        april: 4,
        may: 5,
        mei: 5,
        june: 6,
        juni: 6,
        july: 7,
        juli: 7,
        august: 8,
        agustus: 8,
        september: 9,
        october: 10,
        oktober: 10,
        november: 11,
        december: 12,
        desember: 12,
      };

      month = monthMap[monthName];
    }

    // Format: "2025-08", "2025-07", etc.
    const yearMonthMatch = period.match(/(\d{4})-(\d{1,2})/);
    if (yearMonthMatch) {
      year = parseInt(yearMonthMatch[1]);
      month = parseInt(yearMonthMatch[2]);
    }

    if (year && month) {
      // Create condition for this specific month and year
      // Handle string date columns by casting to TIMESTAMP first
      monthConditions.push(
        `(EXTRACT(YEAR FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = ${year} AND EXTRACT(MONTH FROM CAST(waktu_pesanan_dibuat AS TIMESTAMP)) = ${month})`,
      );
    }
  }

  if (monthConditions.length === 0) {
    return "";
  }

  // Join conditions with OR since we want data from any of the specified periods
  return `(${monthConditions.join(" OR ")})`;
}

/**
 * Builds a complete SQL query with WHERE clause
 * @param baseSql The base SQL command
 * @param whereClause The WHERE clause to add
 * @returns The complete SQL query
 */
function buildSqlWithWhere(baseSql: string, whereClause?: string) {
  if (!whereClause) {
    return baseSql;
  }

  // Remove trailing semicolon before processing
  const normalizedSql = baseSql.trim().replace(/;$/, "");

  // Check if the condition already exists to avoid duplicates
  if (normalizedSql.toLowerCase().includes(whereClause.toLowerCase())) {
    console.log(
      "Condition already exists in SQL, skipping duplicate:",
      whereClause,
    );
    return normalizedSql;
  }

  if (hasWhereClause(normalizedSql)) {
    // If WHERE already exists, we need to find where the WHERE conditions end
    // and insert the new condition before GROUP BY or other clauses
    const whereIndex = normalizedSql.toLowerCase().indexOf("where");
    const beforeWhere = normalizedSql.substring(0, whereIndex + 5); // Include "WHERE"
    const afterWhere = normalizedSql.substring(whereIndex + 5);

    // Find the next major clause (GROUP BY, ORDER BY, HAVING, etc.)
    const nextClauseIndex = findNextClauseIndex(afterWhere);

    if (nextClauseIndex !== -1) {
      const existingConditions = afterWhere
        .substring(0, nextClauseIndex)
        .trim();
      const remainingClause = afterWhere.substring(nextClauseIndex);

      if (existingConditions) {
        return `${beforeWhere} ${existingConditions} AND ${whereClause} ${remainingClause}`;
      } else {
        return `${beforeWhere} ${whereClause} ${remainingClause}`;
      }
    } else {
      // No next clause found, just append to existing WHERE
      if (afterWhere.trim()) {
        return `${beforeWhere} ${afterWhere.trim()} AND ${whereClause}`;
      } else {
        return `${beforeWhere} ${whereClause}`;
      }
    }
  } else {
    // Add WHERE clause before GROUP BY if it exists
    const groupByIndex = normalizedSql.toLowerCase().indexOf("group by");

    if (groupByIndex !== -1) {
      const beforeGroupBy = normalizedSql.substring(0, groupByIndex);
      const afterGroupBy = normalizedSql.substring(groupByIndex);
      return `${beforeGroupBy.trim()} WHERE ${whereClause} ${afterGroupBy}`;
    } else {
      // Add WHERE clause at the end
      return `${normalizedSql} WHERE ${whereClause}`;
    }
  }
}

/**
 * Finds the index of the next major SQL clause after WHERE
 * @param afterWhere The part of SQL after WHERE keyword
 * @returns Index of next clause or -1 if not found
 */
function findNextClauseIndex(afterWhere: string) {
  const lowerAfterWhere = afterWhere.toLowerCase();
  const clauses = ["group by", "order by", "having", "limit", "offset"];

  let minIndex = -1;
  for (const clause of clauses) {
    const index = lowerAfterWhere.indexOf(clause);
    if (index !== -1 && (minIndex === -1 || index < minIndex)) {
      minIndex = index;
    }
  }

  return minIndex;
}

function databaseBigQuery(
  tool: any,
  authContext?: { userId?: string; bearerToken?: string },
) {
  const systemPrompt = `
  ${tool.description}

  PARAMETER HANDLING RULES:

  Optional Parameters:
  - Parameters marked as "optional" can be filled with empty string if not needed
  - Don't ask the user to provide optional parameters - infer them from the query
  - EXCEPTION: select_columns should be populated for ANY query involving aggregation (sum/average)

  Mandatory Parameters (REQUIRED for ALL queries):
  - condition_fields: ALWAYS extract the field names used in WHERE conditions from the user query
    Examples: "Warehouse_Number", "Material", "Plant", "SLoc", "Posting_Date"
  - condition_values: ALWAYS extract the values to filter by from the user query
    Examples: "PKB", "04717-02000", "P301", "2024-08"
  - conditional_operator: ALWAYS determine the comparison operator from the user query
    Default: "=" (equals) for exact matches
    Use "LIKE" for partial/pattern matches
    Use ">", "<", ">=", "<=" for numeric/date comparisons
    Use "IN" for multiple values
    Examples:
      * "stock at warehouse PKB" → operator = "="
      * "products containing 'AM'" → operator = "LIKE"
      * "sales after January 2025" → operator = ">="
      * "warehouses PKB or P301" → operator = "IN"
      * 
  
  **TEMPORAL KEYWORDS - MUST ALWAYS DETECT AND ADD DATE FILTER:**
    Indonesian: "hari ini"(today),"kemarin"(yesterday),"minggu ini"(this week),"bulan ini"(this month),"tahun
  ini"(this year),"minggu lalu"(last week),"bulan lalu"(last month),"7 hari terakhir"(last 7 days),"30 hari
  terakhir"(last 30 days)
    English: "today","yesterday","this week","this month","this year","last week","last month","last 7 days","last 30
  days"

    RULES: If ANY temporal keyword detected→MUST add ",Tanggal" to condition_fields→MUST add calculated date/range to
  condition_values→MUST include "Tanggal" in select_columns for aggregation→Date format: YYYY-MM-DD

    **FOR SINGLE DATE KEYWORDS (today, yesterday, specific date):**
    - Use conditional_operator: "="
    - condition_values format: single date "YYYY-MM-DD"
    Examples:
      "stock PN HG-100 plant JKT hari ini"→condition_fields:"Material,Plant,Tanggal",
      condition_values:"HG-100,JKT,2025-11-20"(today's date), conditional_operator:"="
      "stock PN HG-100 plant JKT kemarin"→condition_fields:"Material,Plant,Tanggal",
      condition_values:"HG-100,JKT,2025-11-19"(yesterday's date), conditional_operator:"="

    **FOR RANGE KEYWORDS (this month, this week, this year, last month, last 7 days, etc.):**
    - Use conditional_operator: "BETWEEN"
    - condition_values format: start_date,end_date (comma-separated, TWO values for the date range)
    - condition_fields: only ONE field "Tanggal" for the BETWEEN operation
    Examples:
      "stock PN HG-100 plant JKT bulan ini"→condition_fields:"Material,Plant,Tanggal",
      condition_values:"HG-100,JKT,2025-11-01,2025-11-30"(month start and end), conditional_operator:"BETWEEN"
      "stock PN HG-100 plant JKT minggu ini"→condition_fields:"Material,Plant,Tanggal",
      condition_values:"HG-100,JKT,2025-11-17,2025-11-23"(week start and end), conditional_operator:"BETWEEN"
      "stock PN HG-100 plant JKT tahun ini"→condition_fields:"Material,Plant,Tanggal",
      condition_values:"HG-100,JKT,2025-01-01,2025-12-31"(year start and end), conditional_operator:"BETWEEN"
      "stock PN HG-100 plant JKT 7 hari terakhir"→condition_fields:"Material,Plant,Tanggal",
      condition_values:"HG-100,JKT,2025-11-13,2025-11-20"(7 days ago to today), conditional_operator:"BETWEEN"

    **DATE CALCULATION RULES (assume today is 2025-11-20):**
    - "hari ini"/"today" → 2025-11-20
    - "kemarin"/"yesterday" → 2025-11-19
    - "bulan ini"/"this month" → 2025-11-01,2025-11-30 (first day to last day of current month)
    - "bulan lalu"/"last month" → 2025-10-01,2025-10-31 (first day to last day of previous month)
    - "minggu ini"/"this week" → 2025-11-17,2025-11-23 (Monday to Sunday of current week)
    - "minggu lalu"/"last week" → 2025-11-10,2025-11-16 (Monday to Sunday of previous week)
    - "tahun ini"/"this year" → 2025-01-01,2025-12-31 (Jan 1 to Dec 31 of current year)
    - "7 hari terakhir"/"last 7 days" → 2025-11-13,2025-11-20 (7 days ago to today, inclusive)
    - "30 hari terakhir"/"last 30 days" → 2025-10-21,2025-11-20 (30 days ago to today, inclusive)

    CRITICAL:
    - System previously FAILED to detect "hari ini" and "bulan ini" - this caused errors or inconsistent results
    - MUST detect ALL temporal keywords and choose correct operator (= for single date, BETWEEN for ranges)
    - NEVER use LIKE operator on DATE columns - this causes SQL errors
    - For BETWEEN: provide exactly TWO date values in condition_values for the Tanggal field


  IMPORTANT: If the user's query does NOT provide enough information to extract the mandatory parameters (condition_fields, condition_values, conditional_operator), DO NOT execute the query. Instead, ask the user to provide a more specific question with clear filter criteria.

  if the user ask for zakat calculation (sum/total), then answer from the metadata result if not from the rows result

  When providing sum/total calculations, ALWAYS include:
  - The calculated sum/total value from metadata
  - The total number of records used in the calculation (rowCount)
  - Brief explanation that the sum was calculated from all matching records
  - Example format: "The total is [value] calculated from [rowCount] records"

  if the user ask for average calculation, then answer from the metadata result if not from the rows result
  
  When providing average calculations, ALWAYS include:
  - The calculated average value from metadata
  - The total number of records used in the calculation (rowCount)
  - Brief explanation that the average was calculated from the total sum divided by number of records
  - Example format: "The average is [value] calculated from [rowCount] records"

  For e-commerce analytics queries:
  - For trends analysis: Use time-based grouping and limit to recent data
  - For top products: Use ORDER BY with LIMIT for rankings
  - For product rankings: Focus on key metrics like sales quantity, revenue
  - Always prioritize the most relevant data to avoid token limits

  For warehouse/inventory queries:
  - For stock totals: Use SUM aggregation with GROUP BY on Material
  - For inventory by location: List materials grouped by Material with SUM(Qty) at specific warehouse/plant
  - For location lookup: List storage locations (SLoc) grouped by SLoc with SUM(Qty) for specific material
  - Common columns: Material (product number), Qty (quantity), Warehouse_Number, Plant, SLoc (storage location)
  - Always use aggregation (SUM) when grouping to get total quantities

  CRITICAL: select_columns parameter usage rules:

  **ALWAYS populate select_columns when:**
  1. column_to_be_summed is provided → Include: grouping columns + summed columns
  2. column_to_be_averaged is provided → Include: grouping columns + averaged columns
  3. query_type is 'stock_summary', 'summary', 'ranking', or 'top_products' → Include relevant grouping and aggregation columns

  **Format for select_columns:**
  - Comma-separated list of column names
  - Include ALL columns needed for grouping (typically from condition_fields)
  - Include ALL columns to be aggregated (from column_to_be_summed/column_to_be_averaged)

  **When to leave select_columns empty:**
  - Only for simple SELECT * queries without aggregation
  - query_type is 'detail' with no sum/average requirements
  - User explicitly wants all columns without any grouping/aggregation

  **Sorting (sort_order and order_by_column parameters):**

  **sort_order parameter:**
  - Use "DESC" (descending) for: highest, largest, most, terbesar, terbanyak, tertinggi, top, best, maksimal, paling banyak
  - Use "ASC" (ascending) for: lowest, smallest, least, terkecil, tersedikit, terendah, bottom, worst, minimal, paling sedikit
  - Default fallback: "DESC" if not specified or unclear
  - Examples:
    * "produk terlaris" → sort_order: "DESC" (highest sales)
    * "stock terkecil" → sort_order: "ASC" (lowest stock)
    * "total penjualan tertinggi" → sort_order: "DESC" (highest total)
    * "harga termurah" → sort_order: "ASC" (cheapest/lowest price)

  **order_by_column parameter (IMPORTANT for date/time sorting):**
  - Use this when user explicitly asks to sort by a specific column (especially dates)
  - If NOT specified, results will be sorted by the aggregation column (e.g., total_Qty, avg_Price)
  - CRITICAL: When user asks to sort by date/time, you MUST set order_by_column to the date column name
  - Common use cases:
    * "urutkan berdasarkan tanggal" (sort by date) → order_by_column: "Tanggal", sort_order: "DESC"
    * "tanggal terbaru" (newest date) → order_by_column: "Tanggal", sort_order: "DESC"
    * "tanggal terlama" (oldest date) → order_by_column: "Tanggal", sort_order: "ASC"
    * "sort by date" → order_by_column: "Tanggal", sort_order: "DESC"
    * "order by material code" → order_by_column: "Material", sort_order: "ASC"
  - Leave empty if user wants results sorted by the aggregated value (quantity, total, average, etc.)

  **Example for user query: "Berapa jumlah stock untuk PN 08101-06207 pada seluruh plant JKT?"**
  - query_type: "stock_summary"
  - condition_fields: "Material,Plant"
  - condition_values: "08101-06207,JKT"
  - conditional_operator: "="
  - column_to_be_summed: "Qty"
  - select_columns: "Material,Plant,Qty" ← MUST be populated!
  - sort_order: "DESC" (default, no specific ordering requested)
  - This ensures SQL generates: SELECT SUM(Qty) as total_Qty, Material, Plant ... GROUP BY Material, Plant ORDER BY total_Qty DESC

  IMPORTANT: Automatically detect and set the correct query_type based on user intent:
  
  PRIORITY ORDER: Check for specific keywords first, then fall back to general patterns.
  
  **query_type: 'top_products'** - Use when user asks for (HIGHEST PRIORITY):
  - "produk terlaris" (best-selling products)
  - "produk terbaik" (best products)
  - "produk populer" (popular products)
  - "top products", "best sellers", "most sold", "highest selling"
  - Any query specifically asking for the highest performing products by sales/quantity
  - Keywords: "terlaris", "terbaik", "populer", "top", "best", "most sold"
  
  **query_type: 'ranking'** - Use when user asks for (HIGH PRIORITY):
  - "peringkat produk" (product rankings)
  - "ranking produk" (product ranking)
  - "urutan produk" (product order)
  - "daftar produk berdasarkan" (product list based on)
  - "product ranking", "product leaderboard", "ranked list"
  - Any query specifically asking for ordered/ranked lists of products
  - Keywords: "peringkat", "ranking", "urutan", "daftar berdasarkan", "leaderboard"
  
  **query_type: 'trend'** - Use when user asks for (MEDIUM PRIORITY):
  - "tren penjualan" (sales trends)
  - "perkembangan penjualan" (sales development)
  - "analisis waktu" (time analysis)
  - "sales trends", "time series", "over time"
  - Any query involving time-based analysis
  - Keywords: "tren", "perkembangan", "waktu", "trend", "over time", "time series"
  
  **query_type: 'comparison'** - Use when user asks for (MEDIUM-HIGH PRIORITY):
  - "bandingkan penjualan" (compare sales)
  - "perbandingan antara" (comparison between)
  - "compare sales between", "sales comparison"
  - "bandingkan bulan" (compare months)
  - "versus", "vs", "dibandingkan dengan" (compared to)
  - Any query involving comparison between two time periods, products, or categories
  - Keywords: "bandingkan", "perbandingan", "compare", "comparison", "versus", "vs", "dibandingkan"
  
  **query_type: 'summary'** - Use when user asks for (LOW PRIORITY):
  - "ringkasan" (summary)
  - "total per kategori" (total per category)
  - "grup berdasarkan" (group by)
  - "summary", "aggregate", "group by"
  - General aggregation queries WITHOUT specific product ranking/top product intent
  - Keywords: "ringkasan", "total per", "grup", "summary", "aggregate"

  **query_type: 'inventory_by_location'** - Use when user asks for (MEDIUM PRIORITY):
  - "stock apa saja pada warehouse/plant/sloc X" (what stock is at location X)
  - "terdapat stock apa saja di" (what stock is available at)
  - "produk/material apa saja di warehouse/plant" (what products/materials at location)
  - "what inventory is at", "stock at warehouse", "materials in plant"
  - Queries asking for list of materials/products at a specific location
  - Keywords: "stock apa saja", "terdapat", "di warehouse", "di plant", "what inventory", "materials at"

  **query_type: 'location_by_material'** - Use when user asks for (MEDIUM PRIORITY):
  - "stock/material X ada di mana" (where is material X located)
  - "terdapat pada sloc/warehouse/plant mana" (at which sloc/warehouse/plant)
  - "dimana saja stock/material X" (where is stock/material X)
  - "where is material", "which locations have", "find storage locations"
  - Queries asking for locations where a specific material is stored
  - Keywords: "ada di mana", "pada sloc mana", "terdapat pada", "where is", "which locations", "storage locations"

  **query_type: 'stock_summary'** - Use when user asks for (MEDIUM PRIORITY):
  - "berapa jumlah stock" (how much stock)
  - "total stock untuk material X di plant Y" (total stock for material X at plant Y)
  - "jumlah stock untuk PN" (stock quantity for PN)
  - "total quantity for material at plant"
  - Queries asking for stock totals with specific material and location filters
  - Keywords: "berapa jumlah", "total stock", "jumlah stock", "stock quantity", "total untuk"
  - **REQUIRED**: ALWAYS set column_to_be_summed="Qty" and populate select_columns with grouping columns + "Qty"

  **query_type: 'detail'** - Use for (LOWEST PRIORITY):
  - Simple data retrieval without specific analytics intent
  - Raw data requests
  - Default fallback when no other patterns match

  CRITICAL RULE: If a query contains keywords for 'top_products' OR 'ranking' (like "terlaris" or "peringkat"), ALWAYS prioritize those over 'summary' even if aggregation is involved.
  
`;

  console.log("systemPrompt", systemPrompt);
  return {
    [tool.functionName]: {
      description: systemPrompt,
      inputSchema: z.object({
        condition_fields: z
          .string()
          .describe(
            "REQUIRED: Column names for WHERE clause conditions, comma-separated if multiple. Extract from user query. Examples: 'Warehouse_Number', 'Material,Plant', 'Posting_Date', 'SLoc'. Common fields: Warehouse_Number, Material, Plant, SLoc, Posting_Date, Qty, Material_Description.",
          ),
        condition_values: z
          .string()
          .describe(
            "REQUIRED: Values to filter by in WHERE clause, comma-separated if multiple (must match order of condition_fields). Extract from user query. Examples: 'PKB', '04717-02000,P301', '2024-08', 'A1-01'. For LIKE operator, use patterns like '%AM%'. For IN operator, use 'PKB,P301,P302'.",
          ),
        conditional_operator: z
          .string()
          .describe(
            "REQUIRED: SQL comparison operator for WHERE clause. Choose based on query intent: '=' (exact match - default), 'LIKE' (pattern/partial match, use with %wildcards%), '>' or '<' or '>=' or '<=' (numeric/date comparison), 'IN' (multiple values). Examples: 'warehouse PKB' uses '=', 'products containing AM' uses 'LIKE', 'after Jan 2025' uses '>=', 'warehouses PKB or P301' uses 'IN'.",
          ),
        column_to_be_summed: z
          .string()
          .describe(
            "the column to be summed. if the column more than one, then separated by commas",
          )
          .optional()
          .default(""),
        column_to_be_averaged: z
          .string()
          .describe(
            "the column to be averaged. if the column more than one, then separated by commas",
          )
          .optional()
          .default(""),
        query_type: z
          .string()
          .describe(
            "Type of query: 'product_list_by_plant', 'trend', 'top_products', 'ranking', 'comparison', 'summary', 'detail', 'inventory_by_location', 'location_by_material', 'stock_summary'. Helps optimize result size.",
          )
          .optional()
          .default("detail"),
        limit_rows: z
          .number()
          .describe(
            "Maximum number of rows to return. Auto-adjusted based on query_type if not specified.",
          )
          .optional(),
        select_columns: z
          .string()
          .describe(
            "REQUIRED for aggregation queries. Comma-separated column names to SELECT. MUST include: (1) grouping columns from condition_fields, (2) columns to aggregate from column_to_be_summed/column_to_be_averaged. Examples: 'Material,Plant,Qty' for stock grouped by Material+Plant summing Qty. Leave empty ONLY for simple SELECT * queries without aggregation.",
          )
          .optional()
          .default(""),
        comparison_periods: z
          .string()
          .describe(
            "For comparison queries: specify time periods to compare (e.g., 'August 2025, July 2025' or '2025-08, 2025-07'). Used to filter data for specific months/periods.",
          )
          .optional()
          .default(""),
        sort_order: z
          .enum(["ASC", "DESC"])
          .describe(
            "Sort direction for ORDER BY clause when aggregating. Use 'DESC' for highest/largest/most (terbesar, terbanyak, tertinggi), 'ASC' for lowest/smallest/least (terkecil, tersedikit, terendah). Default: 'DESC'.",
          )
          .optional()
          .default("DESC"),
        order_by_column: z
          .string()
          .describe(
            "Optional: Specify which column to use for ORDER BY. If not provided, defaults to the aggregation column (e.g., total_Qty). Use this when user wants to sort by a specific column like 'Tanggal' (date) instead of the aggregated value. Examples: 'Tanggal' for date sorting, 'Material' for material code sorting. IMPORTANT: When user asks to sort by date/time (e.g., 'urutkan berdasarkan tanggal', 'sort by date'), set this to 'Tanggal' or the appropriate date column name.",
          )
          .optional()
          .default(""),
      }),
      execute: async (params: {
        condition_fields: string;
        condition_values: string;
        conditional_operator: string;
        column_to_be_summed: string | null;
        column_to_be_averaged: string | null;
        query_type: string | null;
        limit_rows: number | null;
        select_columns: string | null;
        comparison_periods: string | null;
        sort_order: "ASC" | "DESC" | null;
        order_by_column: string | null;
      }) => {
        console.log("used tool", tool);
        console.log("Executing BigQuery tool");

        console.log("condition_fields", params.condition_fields);
        console.log("condition_values", params.condition_values);
        console.log("conditional_operator", params.conditional_operator);
        console.log("column_to_be_summed", params.column_to_be_summed);
        console.log("column_to_be_averaged", params.column_to_be_averaged);
        console.log("query_type", params.query_type);
        console.log("comparison_periods", params.comparison_periods);
        console.log("limit_rows", params.limit_rows);
        console.log("select_columns", params.select_columns);
        console.log("sort_order", params.sort_order);

        const metadata: Record<string, number | string> = {};

        // Intelligent row limiting based on query type
        const getOptimalRowLimit = (
          queryType: string,
          customLimit?: number | null,
        ): number => {
          if (customLimit && customLimit > 0)
            return Math.min(customLimit, 2000);

          switch (queryType) {
            case "product_list_by_plant":
              return 20; // Product lists may need more rows
            case "trend":
              return 200; // Trends usually need fewer data points
            case "comparison":
              return 100; // Comparisons need data from multiple periods
            case "top_products":
            case "ranking":
              return 25; // Rankings typically show top N items
            case "summary":
              return 10; // Summary queries need minimal rows
            case "inventory_by_location":
              return 20; // List of materials at a location may need more rows
            case "location_by_material":
              return 20; // List of locations for a material typically smaller
            case "stock_summary":
              return 20; // Stock summary aggregations need minimal rows
            case "detail":
            default:
              return 100; // Reduced from 200 to manage token limits better
          }
        };

        // Column selection optimization
        const optimizeColumnSelection = (
          originalSql: string,
          selectColumns?: string | null,
          queryType?: string | null,
          columnsToBeSummed?: string | null,
          columnsToBeAveraged?: string | null,
          conditionFields?: string | null,
          sortOrder?: "ASC" | "DESC" | null,
        ): string => {
          // Validate that requested columns exist in SQL
          const validateColumns = (cols: string) => {
            if (!cols || cols.trim() === "") return true;

            const requestedCols = cols
              .split(",")
              .map((c: string) => c.trim().toLowerCase());
            const sqlLower = originalSql.toLowerCase();

            // If it's SELECT *, all columns are available
            if (sqlLower.includes("select *")) return true;

            // Check if requested columns appear in the original SQL
            return requestedCols.every((col: string) => {
              // Remove aggregation functions to get base column name
              const baseCol = col
                .replace(/^(sum|avg|count|max|min)\(|\).*$/gi, "")
                .trim();
              return (
                sqlLower.includes(baseCol) || sqlLower.includes("select *")
              );
            });
          };

          // Helper function to add GROUP BY clause
          const addGroupByClause = (sql: string, groupByColumns: string) => {
            if (!sql.toLowerCase().includes("group by") && groupByColumns) {
              const cleanSql = sql.replace(/;/g, "").trim();
              const groupByClause = ` GROUP BY ${groupByColumns}`;
              const lowerSql = cleanSql.toLowerCase();
              const orderByIndex = lowerSql.indexOf("order by");
              const limitIndex = lowerSql.indexOf("limit");

              let insertIndex = cleanSql.length;
              if (orderByIndex !== -1)
                insertIndex = Math.min(insertIndex, orderByIndex);
              if (limitIndex !== -1)
                insertIndex = Math.min(insertIndex, limitIndex);

              return (
                cleanSql.slice(0, insertIndex) +
                groupByClause +
                cleanSql.slice(insertIndex)
              );
            }
            return sql;
          };

          // Check if this is an e-commerce tool (skip auto-optimization for warehouse data)
          const isEcommerceTool =
            originalSql.toLowerCase().includes("larissa") ||
            originalSql.toLowerCase().includes("shopee") ||
            originalSql.toLowerCase().includes("sales") ||
            originalSql.toLowerCase().includes("orders");

          // If no specific columns provided and not e-commerce, return original
          if (!selectColumns || selectColumns.trim() === "") {
            if (!isEcommerceTool) {
              console.log(
                "  [Auto-optimization SKIPPED for non-e-commerce dataset]",
              );
              return originalSql;
            }
            // E-commerce auto-optimization would go here...
            return originalSql;
          }

          // Validate user-specified columns exist in the schema
          if (!validateColumns(selectColumns)) {
            console.log("  [Column validation FAILED - using original SQL]");
            return originalSql;
          }

          // Use user-specified columns
          let processedColumns = selectColumns
            .split(",")
            .map((col) => col.trim());
          let needsGroupBy = false;
          let groupByColumns: any[] = [];
          const aggregatedColumns: string[] = [];

          // Extract non-aggregated columns for potential GROUP BY
          const selectColumnsList = selectColumns
            .split(",")
            .map((col) => col.trim());
          const groupByCandidates = selectColumnsList.filter(
            (col) =>
              !col.toLowerCase().includes("sum(") &&
              !col.toLowerCase().includes("avg(") &&
              !col.toLowerCase().includes("count(") &&
              !col.toLowerCase().includes("min(") &&
              !col.toLowerCase().includes("max("),
          );
          groupByColumns = groupByCandidates.map((col) => {
            const idx = col.toLowerCase().lastIndexOf(" as ");
            return idx !== -1 ? col.slice(0, idx).trim() : col;
          });

          // Add columns to be summed if specified and valid
          if (columnsToBeSummed && validateColumns(columnsToBeSummed)) {
            const sumColsArr = columnsToBeSummed
              .split(",")
              .map((col) => col.trim())
              .filter(Boolean);

            // Remove summed columns from processedColumns and groupByColumns
            sumColsArr.forEach((col) => {
              processedColumns = processedColumns.filter(
                (c) => c.toLowerCase() !== col.toLowerCase(),
              );
              groupByColumns = groupByColumns.filter(
                (c) => c.toLowerCase() !== col.toLowerCase(),
              );
              aggregatedColumns.push(col);
            });

            const sumColumns = sumColsArr
              .map((col) => `SUM(${col}) as total_${col}`)
              .join(", ");
            processedColumns.unshift(sumColumns);
            needsGroupBy = true;
          } else if (columnsToBeSummed && !validateColumns(columnsToBeSummed)) {
            console.log(
              "  [Column validation FAILED for summed columns - skipping aggregation]",
            );
          }

          // Add columns to be averaged if specified and valid
          if (columnsToBeAveraged && validateColumns(columnsToBeAveraged)) {
            const avgColsArr = columnsToBeAveraged
              .split(",")
              .map((col) => col.trim())
              .filter(Boolean);

            // Remove averaged columns from processedColumns and groupByColumns
            avgColsArr.forEach((col) => {
              processedColumns = processedColumns.filter(
                (c) => c.toLowerCase() !== col.toLowerCase(),
              );
              groupByColumns = groupByColumns.filter(
                (c) => c.toLowerCase() !== col.toLowerCase(),
              );
              aggregatedColumns.push(col);
            });

            const avgColumns = avgColsArr
              .map((col) => `AVG(${col}) as avg_${col}`)
              .join(", ");
            processedColumns.unshift(avgColumns);
            needsGroupBy = true;
          } else if (
            columnsToBeAveraged &&
            !validateColumns(columnsToBeAveraged)
          ) {
            console.log(
              "  [Column validation FAILED for averaged columns - skipping aggregation]",
            );
          }

          let modifiedSql = originalSql.replace(
            /SELECT\s+\*/i,
            `SELECT ${processedColumns.join(", ")}`,
          );

          // Handle conditionFields (add IS NOT NULL filter if no comparison)
          if (conditionFields && conditionFields.trim() !== "") {
            const fields = conditionFields
              .split(",")
              .map((f) => f.trim())
              .filter(Boolean);
            const whereConditions = fields
              .map((field) => `${field} IS NOT NULL`)
              .join(" AND ");
            if (whereConditions) {
              if (!modifiedSql.toLowerCase().includes("where")) {
                modifiedSql += ` WHERE ${whereConditions}`;
              } else {
                modifiedSql += ` AND ${whereConditions}`;
              }
            }
          }

          // Add GROUP BY if we have aggregations
          if (needsGroupBy && groupByColumns.length > 0) {
            modifiedSql = addGroupByClause(
              modifiedSql,
              groupByColumns.join(", "),
            );
          }

          // Add ORDER BY for all aggregated columns (applies to all query types)
          if (!modifiedSql.toLowerCase().includes("order by")) {
            let orderByColumn = null;

            // Priority 0: Use explicitly specified order_by_column parameter
            if (
              params.order_by_column &&
              params.order_by_column.trim() !== ""
            ) {
              orderByColumn = params.order_by_column.trim();
            }
            // Priority 1: Use explicitly specified aggregation columns
            else if (columnsToBeSummed) {
              const firstSummedCol = columnsToBeSummed.split(",")[0].trim();
              orderByColumn = `total_${firstSummedCol}`;
            } else if (columnsToBeAveraged) {
              const firstAvgCol = columnsToBeAveraged.split(",")[0].trim();
              orderByColumn = `avg_${firstAvgCol}`;
            } else {
              // Priority 2: Auto-detect aggregated columns in the SELECT clause
              const selectMatch = modifiedSql.match(/SELECT\s+(.*?)\s+FROM/i);
              if (selectMatch) {
                const selectClause = selectMatch[1];

                // Look for SUM(...) as alias or SUM(...) patterns
                const sumMatch = selectClause.match(
                  /SUM\([^)]+\)\s+as\s+(\w+)/i,
                );
                if (sumMatch) {
                  orderByColumn = sumMatch[1];
                } else {
                  // Look for AVG(...) as alias
                  const avgMatch = selectClause.match(
                    /AVG\([^)]+\)\s+as\s+(\w+)/i,
                  );
                  if (avgMatch) {
                    orderByColumn = avgMatch[1];
                  } else {
                    // Look for COUNT(...) as alias
                    const countMatch = selectClause.match(
                      /COUNT\([^)]+\)\s+as\s+(\w+)/i,
                    );
                    if (countMatch) {
                      orderByColumn = countMatch[1];
                    }
                  }
                }
              }
            }

            // Add ORDER BY if we found an aggregation column
            if (orderByColumn) {
              // Use provided sort order, fallback to DESC
              const direction =
                sortOrder && sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
              modifiedSql += ` ORDER BY ${orderByColumn} ${direction}`;
            }
          }
          return modifiedSql;
        };

        const rowLimit = getOptimalRowLimit(
          params.query_type || "detail",
          params.limit_rows,
        );

        let userId = authContext?.userId || "";
        let bearerToken = authContext?.bearerToken || "";
        if (!userId || !bearerToken) {
          const session = await getAuthSession();
          userId = userId || session?.user?.id || "";
          bearerToken = bearerToken || session?.user?.backendToken || "";
        }
        try {
          const credentials = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL_V2}/document/get-creds/${tool.id}`,
            {
              method: "GET",
              headers: {
                "User-id": userId || "",
                Authorization: `Bearer ${bearerToken}`,
              },
            },
          );
          const result = await credentials.json();

          const bigquery = new BigQuery({
            projectId: result.project_id,
            credentials: result,
          });

          // Start with column optimization
          let finalSqlCommand = optimizeColumnSelection(
            tool.sqlCommand,
            params.select_columns,
            params.query_type,
            params.column_to_be_summed,
            params.column_to_be_averaged,
            params.condition_fields,
            params.sort_order,
          );

          // Build dynamic WHERE clause if conditions are provided
          if (params.condition_fields) {
            const fields = params.condition_fields
              .split(",")
              .map((f) => f.trim())
              .filter((f) => f);

            if (fields.length > 0) {
              try {
                let whereClause = "";

                // If values are provided, use them to build the WHERE clause
                if (
                  params.condition_values &&
                  params.condition_values.trim() !== ""
                ) {
                  const values = params.condition_values
                    .split(",")
                    .map((v) => v.trim())
                    .filter((v) => v);
                  const operator = params.conditional_operator || "=";

                  if (values.length > 0) {
                    whereClause = buildWhereClause(fields, values, operator);
                  }
                } else {
                  // If no values provided, filter for NOT NULL on these fields
                  whereClause = fields
                    .map((field) => `${field} IS NOT NULL`)
                    .join(" AND ");
                }

                if (whereClause) {
                  finalSqlCommand = buildSqlWithWhere(
                    finalSqlCommand,
                    whereClause,
                  );
                  console.log("Original SQL:", tool.sqlCommand);
                  console.log("WHERE clause:", whereClause);
                  console.log("Modified SQL with WHERE:", finalSqlCommand);
                }
              } catch (error) {
                console.error("Error building WHERE clause:", error);
                // Fall back to original SQL if WHERE building fails
              }
            }
          }

          // Handle comparison periods for comparison queries
          if (params.query_type === "comparison" && params.comparison_periods) {
            try {
              const comparisonWhereClause = buildComparisonWhereClause(
                params.comparison_periods,
              );
              if (comparisonWhereClause) {
                finalSqlCommand = buildSqlWithWhere(
                  finalSqlCommand,
                  comparisonWhereClause,
                );
                console.log("Comparison WHERE clause:", comparisonWhereClause);
                console.log(
                  "Modified SQL with comparison filter:",
                  finalSqlCommand,
                );
              }
            } catch (error) {
              console.error("Error building comparison WHERE clause:", error);
              // Fall back to original SQL if comparison WHERE building fails
            }
          }

          // Add filter to exclude zero and negative stock values for Qty column
          // Check if query involves Qty column (common in stock/inventory queries)
          if (finalSqlCommand.toLowerCase().includes("qty")) {
            const qtyFilterClause = "Qty > 0";
            finalSqlCommand = buildSqlWithWhere(
              finalSqlCommand,
              qtyFilterClause,
            );
            console.log(
              "Added Qty > 0 filter to exclude zero and negative values",
            );
          }

          // Add intelligent LIMIT clause if not already present
          if (!finalSqlCommand.toLowerCase().includes("limit")) {
            // Remove trailing semicolon if present before adding LIMIT
            finalSqlCommand = finalSqlCommand.replace(/;\s*$/, "");
            finalSqlCommand = `${finalSqlCommand} LIMIT ${rowLimit}`;
          } else {
            // Update existing LIMIT if it's too high
            finalSqlCommand = finalSqlCommand.replace(
              /LIMIT\s+\d+/i,
              `LIMIT ${rowLimit}`,
            );
          }

          console.log("finalSqlCommand", finalSqlCommand);

          const options = {
            query: finalSqlCommand,
            location: tool.databaseZone,
            timeoutMs: 60000, // 60 second timeout
          };

          console.log("Starting BigQuery execution...");
          let rows;
          try {
            [rows] = await bigquery.query(options);
          } catch (queryError: any) {
            // If column not found error, try with original SQL
            if (
              queryError.message &&
              queryError.message.includes("Unrecognized name")
            ) {
              console.log("Column not found, retrying with original SQL...");
              const retryOptions = {
                query: tool.sqlCommand,
                location: tool.databaseZone,
                timeoutMs: 60000,
              };
              [rows] = await bigquery.query(retryOptions);
            } else {
              throw queryError;
            }
          }

          console.log("Finish BigQuery execution");
          console.log("Count of rows", rows.length);

          // Only calculate sums/averages in post-processing if we didn't already aggregate in SQL
          const wasAggregatedInSql =
            params.select_columns && params.select_columns.trim() !== "";

          // Use the generic column summation function
          if (params.column_to_be_summed && !wasAggregatedInSql) {
            const columnSums = calculateColumnSums(
              rows,
              params.column_to_be_summed,
            );
            Object.assign(metadata, columnSums);
          } else if (params.column_to_be_summed && wasAggregatedInSql) {
            // If SQL already aggregated, extract the pre-computed sums from the result
            const columns = params.column_to_be_summed
              .split(",")
              .map((col) => col.trim())
              .filter(Boolean);

            columns.forEach((col) => {
              const aggregatedColName = `total_${col}`;
              if (rows.length > 0 && rows[0][aggregatedColName] !== undefined) {
                // For aggregated queries, the total is the sum of all rows' total_X values
                metadata[col] = rows.reduce(
                  (sum, row) => sum + (parseFloat(row[aggregatedColName]) || 0),
                  0,
                );
              }
            });
          }

          // Use the generic column averaging function
          if (params.column_to_be_averaged && !wasAggregatedInSql) {
            const columnAverages = calculateColumnAverages(
              rows,
              params.column_to_be_averaged,
            );
            Object.assign(metadata, columnAverages);

            metadata.total_records_for_average = rows.length;
            metadata.calculation_note =
              "Average calculated from total sum divided by number of records";
          } else if (params.column_to_be_averaged && wasAggregatedInSql) {
            // If SQL already aggregated, extract the pre-computed averages from the result
            const columns = params.column_to_be_averaged
              .split(",")
              .map((col) => col.trim())
              .filter(Boolean);

            columns.forEach((col) => {
              const aggregatedColName = `avg_${col}`;
              if (rows.length > 0 && rows[0][aggregatedColName] !== undefined) {
                // For aggregated queries, calculate the weighted average
                const totalAvg = rows.reduce(
                  (sum, row) => sum + (parseFloat(row[aggregatedColName]) || 0),
                  0,
                );
                metadata[`avg_${col}`] = totalAvg / rows.length;
              }
            });

            metadata.total_records_for_average = rows.length;
            metadata.calculation_note =
              "Average calculated from SQL aggregation results";
          }

          // Add query optimization metadata
          metadata.query_type = params.query_type || "detail";
          metadata.applied_row_limit = rowLimit;
          metadata.column_optimization = params.select_columns
            ? "custom"
            : params.query_type !== "detail"
              ? "auto"
              : "none";
          metadata.optimization_note = `Results optimized for ${
            params.query_type || "detail"
          } query type`;

          console.log("metadata", metadata);

          // Apply the intelligent row limit (additional safety check)
          const returnedRows =
            rows.length > rowLimit ? rows.slice(0, rowLimit) : rows;

          return {
            success: true,
            data: {
              rows: returnedRows,
              metadata: metadata,
            },
            rowCount: rows.length,
            returnedRowCount: returnedRows.length,
            executedQuery: finalSqlCommand,
            originalSqlCommand: finalSqlCommand, // For downloading data based on user's prompt (not the base template)
            toolId: tool.id, // For downloading (to fetch credentials)
            databaseZone: tool.databaseZone, // For downloading (database location)
            message: `Query executed successfully. Returned ${
              returnedRows.length
            } of ${rows.length} total rows (optimized for ${
              params.query_type || "detail"
            } query).`,
          };
        } catch (error: unknown) {
          console.error("BigQuery execution error:", error);
          return {
            success: false,
            error: "Failed to execute tool",
            details: error instanceof Error ? error.message : String(error),
          };
        }
      },
    },
  };
}

function commonDatabase(databaseType: string, tool: any) {
  return {
    [tool.functionName]: {
      description: tool.description,
      inputSchema: z.object({}),
    },
  };
}

async function handleBuiltInTool(tool: any) {
  const zod_parameters = tool.parameters["zod_parameters"];
  let credential_id = null;
  const credential_ids = tool.parameters["built-in"].credential_ids;

  if (credential_ids.google_search) {
    credential_id = credential_ids.google_search;
  } else if (credential_ids.wikipedia) {
    credential_id = credential_ids.wikipedia;
  } else if (credential_ids.weather) {
    credential_id = credential_ids.weather;
  }
  const credential = await prisma.credentials.findUnique({
    where: { id: credential_id },
  });
  return {
    [tool.functionName]: {
      description: tool.description,
      inputSchema: createParameterSchema(zod_parameters),
      execute: createExecutionFunction(
        tool.executionCode,
        tool.parameters["built-in"].credential_ids,
        tool,
        credential,
      ),
    },
  };
}

function handleEmbeddingTool(
  tool: any,
  authContext?: { bearerToken?: string },
) {
  // Extract key information from the tool to make description more dynamic
  const toolName = tool.name || tool.functionName || "this tool";
  const baseDescription =
    tool.description || "This tool searches embedded documents and data.";

  // Create dynamic usage instructions based on the tool's purpose
  const enhancedDescription = `${baseDescription}
    WHEN TO USE THIS TOOL:
    - When users ask questions related to the data domain covered by this tool
    - When users request specific information, data analysis, or details
    - When users need to search through documents or datasets
    - When the query matches the tool's described purpose and scope

    ALWAYS use this tool when:
    - Users ask for specific data, metrics, or information within this tool's domain
    - Users request analysis, trends, or insights from the available data
    - Users need to retrieve specific documents, records, or content
    - The query requires searching through embedded knowledge or databases

    Use the user's original query terms for the most accurate search results.`;

  return {
    [tool.functionName]: {
      description: enhancedDescription,
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            `The user's search query to find relevant information from ${toolName} database/documents`,
          ),
      }),
      execute: async (params: any) => {
        console.log(
          `🔍 Executing ${tool.functionName} with query: ${params.query}`,
        );

        let bearerToken = authContext?.bearerToken;
        if (!bearerToken) {
          const session = await getAuthSession();
          bearerToken = session?.user.backendToken;
        }

        // Explicitly guard against missing/invalid bearer token to avoid 401 from backend
        if (!bearerToken) {
          const errMsg =
            "Missing backend bearer token for semantic search. Ensure the session token was exchanged via /user/login-session and NEXT_PUBLIC_AUTH_SERVICE_URL is correctly configured.";
          console.error(errMsg);
          throw new Error(errMsg);
        }

        try {
          const encodedQuery = encodeURIComponent(params.query ?? "");
          const url = `${process.env.NEXT_PUBLIC_API_URL_V2}/document/semantic-search/${tool.id}?query=${encodedQuery}`;
          const response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${bearerToken}`,
            },
          });

          // Handle specific error cases with better messages
          if (!response.ok) {
            const errorBody = await response.json().catch(() => null);

            if (response.status === 503) {
              // Knowledge base is still syncing
              console.warn(
                `⏳ Tool ${tool.functionName} knowledge base is syncing: ${errorBody?.response_message || "Please wait"}`,
              );
              return {
                error: "Knowledge base is still syncing",
                details:
                  errorBody?.response_message ||
                  `The knowledge base for "${tool.name}" is currently being processed. Please wait for the sync to complete.`,
              };
            }

            if (response.status === 404) {
              return {
                error: "Tool not found",
                details:
                  "The requested knowledge base tool could not be found.",
              };
            }

            throw new Error(
              errorBody?.response_message ||
                `HTTP error! status: ${response.status}`,
            );
          }

          const result = await response.json();

          console.log(
            `📊 ${tool.functionName} returned ${
              result.data?.length || 0
            } results`,
          );

          return (
            result.data?.map((item: { content: string; urlFile?: string }) => ({
              content: item.content,
              ...(item.urlFile && { urlFile: item.urlFile }),
            })) || []
          );
        } catch (error) {
          console.error(`❌ Error executing ${tool.functionName}:`, error);
          return {
            error: "Failed to search the knowledge base",
            details: error instanceof Error ? error.message : "Unknown error",
          };
        }
      },
    },
  };
}

function handleDatabaseTool(
  tool: any,
  authContext?: { userId?: string; bearerToken?: string },
) {
  switch (tool.databaseType) {
    case "bigquery":
      return databaseBigQuery(tool, authContext);
    default:
      return commonDatabase(tool.databaseType, tool);
  }
}

function handleRestApiTool(tool: any) {
  const url = tool.requestUrl;
  const requestMethod = tool.requestMethod;
  const parametersRestAPI = tool.parameters["rest-api"];
  const headerRestAPI = parametersRestAPI.headers;
  const queryParamsRestAPI = parametersRestAPI.queryParams;
  const authRestAPI: DataAuthRestApi = parametersRestAPI.auth;
  const requestBodyTemplate =
    parametersRestAPI.request_body != "" &&
    parametersRestAPI.request_body != undefined &&
    parametersRestAPI.request_body != null
      ? parametersRestAPI.request_body
      : null;
  const functionName = tool.functionName;

  return {
    [tool.functionName]: {
      description:
        "Return the raw, unmodified numeric or string values exactly as they appear in the source. Do not round, add to, subtract from, or otherwise alter the value. Present the data exactly as stored. " +
        tool.description,
      inputSchema: z.object({
        fields: z
          .string()
          .describe(
            "Optional keys inferred from user chat; do not prompt users to provide them.the fields for sending to request. fields are separated by semicolon. field name must be all lowercase.",
          )
          .optional()
          .default(""),
        value: z
          .string()
          .describe(
            "Optional values aligned with 'fields'; do not prompt users to provide them.the value for sending to request. multiple values are separated by semicolon also must be in the same order as the fields.",
          )
          .optional()
          .default(""),
      }),
      execute: async (params: { fields: string; value: string }) => {
        try {
          const userFieldInput = params.fields.split(";").map((key, i) => ({
            key,
            value: params.value.split(";")[i],
          }));
          console.log({ userFieldInput });

          let requestUrl = url;

          // Convert headerRestAPI array to object if needed
          let requestHeaders: any = {};
          if (Array.isArray(headerRestAPI)) {
            // Only include enabled headers
            headerRestAPI.forEach((h: any) => {
              if (h.is_enabled && h.key && h.value) {
                requestHeaders[h.key] = h.value;
              }
            });
          } else if (
            typeof headerRestAPI === "object" &&
            headerRestAPI !== null
          ) {
            requestHeaders = { ...headerRestAPI };
          }

          // change value of requestUrl based on user input
          const lookup = Object.fromEntries(
            userFieldInput.map(({ key, value }) => [key, value]),
          );
          // change [key] with value from userFieldInput
          requestUrl = requestUrl.replace(
            /\[([^\]]+)\]/g,
            (_: any, key: any) => lookup[key] ?? `[${key}]`,
          );

          // change value of header based on user input
          userFieldInput.forEach(({ key, value }) => {
            Object.keys(requestHeaders).forEach((headerKey) => {
              if (isSameKey(headerKey.trim(), key.trim())) {
                requestHeaders[headerKey] = value;
              }
            });
          });

          // change value of query params based on user input
          if (Array.isArray(queryParamsRestAPI)) {
            queryParamsRestAPI.map((param: DataRequestRestApi) => {
              userFieldInput.map((userParam) => {
                if (param.key?.trim() === userParam.key?.trim()) {
                  param.value = userParam.value.trim();
                }
              });
            });
          }

          const bearerTokenValue =
            authRestAPI.bearer_token ||
            userFieldInput.find((item) => item.key === "bearer_token")?.value ||
            "";

          if (authRestAPI.type === "bearer") {
            requestHeaders.Authorization = `Bearer ${bearerTokenValue}`;
          } else if (authRestAPI.type === "apikey") {
            if (authRestAPI.key_location === "header") {
              requestHeaders[authRestAPI.key_name || ""] = authRestAPI.api_key;
            } else if (authRestAPI.key_location === "query") {
              const urlObj = new URL(url);
              urlObj.searchParams.set(
                authRestAPI.key_name || "",
                authRestAPI.api_key || "",
              );
              requestUrl = urlObj.toString();
            }
          } else if (authRestAPI.type === "basic") {
            requestHeaders.Authorization = `Basic ${authRestAPI.username}:${authRestAPI.password}`;
          } else if (authRestAPI.type === "oauth2") {
            const response = await fetch(
              `${
                process.env.NEXT_PUBLIC_BACKEND_API_URL
              }/oauth/connection?id=${authRestAPI.connection_id!}`,
            );

            const oauth2Connection = await response.json();
            const oauth2Config = oauth2Connection.config;
            const queryParams = {
              ...(oauth2Config?.state && {
                state: JSON.stringify(oauth2Config.state),
              }),
              ...(oauth2Config?.scope && { scope: oauth2Config.scope }),
            };

            const isAccessTokenExpired =
              new Date(oauth2Connection.access_expires_at).getTime() <
              Date.now();

            if (isAccessTokenExpired) {
              console.log("expiredd access token");
              let finalUrl = oauth2Config.refreshUrl;

              let method = "GET";
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
                "User-Agent": "KnowGen-OAuth-Client/1.0",
                Accept:
                  "application/json, application/x-www-form-urlencoded, text/plain",
              };

              const refreshQueryParams = new URLSearchParams();

              const bodyParams = {};

              if (url.includes("tiktok")) {
                refreshQueryParams.append(
                  "refresh_token",
                  oauth2Connection.refreshToken,
                );
              } else if (url.includes("shopee")) {
                const timestamp = Math.floor(Date.now() / 1000);

                const partnerId = oauth2Config.authRequest?.find(
                  (param: any) => param?.key === "partner_id",
                )?.value as string;

                const clientSecret = oauth2Config.tokenRequest?.find(
                  (param: any) => param?.key === "partner_key",
                )?.value;

                const finalUrl = oauth2Config.refreshUrl;
                const apiPath = new URL(finalUrl).pathname;

                // Create the signing string: partner_id + api_path + timestamp
                const signingString = `${partnerId}${apiPath}${timestamp}`;
                const signature = await hashText(
                  signingString,
                  clientSecret || "",
                );

                refreshQueryParams.append("timestamp", String(timestamp));
                refreshQueryParams.append("sign", signature);

                Object.assign(bodyParams, {
                  refresh_token: oauth2Connection.refreshToken,
                });
                Object.assign(bodyParams, { partner_id: parseInt(partnerId) });
                Object.assign(bodyParams, {
                  shop_id: parseInt(oauth2Connection.externalId),
                });

                method = "POST";
              }

              oauth2Config.refreshRequest.forEach((param: any) => {
                if (param?.value) {
                  switch (param.send_in) {
                    case "inHeader":
                      headers[param.key] = param.value;
                      break;
                    case "inQuery":
                      refreshQueryParams.append(param?.key, param?.value);
                      break;
                    case "inBody":
                      Object.assign(bodyParams, { [param.key]: param.value });
                      break;

                    default:
                      break;
                  }
                }
              });

              if (refreshQueryParams.toString()) {
                finalUrl +=
                  (finalUrl.includes("?") ? "&" : "?") +
                  refreshQueryParams.toString();
              }

              const configuration: any = {
                method,
                headers,
              };
              if (method === "POST") {
                configuration.body = JSON.stringify(bodyParams);
              }
              const response = await fetch(finalUrl, configuration);
              const responseData = await response.json();

              // update data on database
              let respAccessToken,
                respAccessTokenExp,
                respRefreshToken,
                respRefreshTokenExp;
              if (url.includes("tiktok")) {
                respAccessToken = responseData.data.access_token;
                respAccessTokenExp = responseData.data.access_token_expire_in;
                respRefreshToken = responseData.data.refresh_token;
                respRefreshTokenExp = responseData.data.refresh_token_expire_in;
              } else if (url.includes("shopee")) {
                respAccessToken = responseData.access_token;
                respAccessTokenExp = responseData.expire_in;
                respRefreshToken = responseData.refresh_token;
                respRefreshTokenExp =
                  responseData.refresh_token_expire_in || null;
              } else {
                respAccessToken = responseData.access_token;
                respAccessTokenExp = responseData.access_token_expire_in;
                respRefreshToken = responseData.refresh_token;
                respRefreshTokenExp = responseData.refresh_token_expire_in;
              }

              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { config: _config, ...dataConnection } = oauth2Connection;

              const accessExpireAt = new Date(
                respAccessTokenExp * 1000 < Date.now()
                  ? Date.now() + respAccessTokenExp * 1000
                  : respAccessTokenExp * 1000,
              ).toISOString();
              const refreshExpireAt = new Date(
                respRefreshTokenExp * 1000 < Date.now()
                  ? Date.now() + respRefreshTokenExp * 1000
                  : respRefreshTokenExp * 1000,
              ).toISOString();

              await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/oauth/connection?id=${oauth2Connection.id}`,
                {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    ...dataConnection,
                    accessToken: respAccessToken,
                    refreshToken: respRefreshToken,
                    access_expires_at: accessExpireAt,
                    refresh_expires_at: respRefreshTokenExp && refreshExpireAt,
                  }),
                },
              );

              oauth2Connection.accessToken = respAccessToken;
              oauth2Connection.refreshToken = respRefreshToken;
            }

            if (url.includes("tiktok")) {
              requestHeaders = {
                ...requestHeaders,
                "x-tts-access-token": oauth2Connection?.accessToken || "",
              };
            } else {
              let authorization = `${oauth2Connection?.accessToken}`;
              if (oauth2Connection?.headerPrefix) {
                authorization = `${oauth2Connection?.headerPrefix} ${authorization}`;
              }
              requestHeaders.Authorization = authorization;

              Object.assign(queryParams, {
                access_token: oauth2Connection?.accessToken,
              });
            }

            const requestOption = {
              qs: {
                ...queryParams,
                ...Object.assign(
                  {},
                  ...queryParamsRestAPI.map((param: DataRequestRestApi) => ({
                    [param.key as string]: param.value,
                  })),
                ),
              },
              body: requestBodyTemplate,
              headers: requestHeaders,
              uri: requestUrl,
            };

            /**
             * solving dynamic function:
             * using resolveDynamicFunction to resolve get value of
             * the parameter name (ex: app_secret) then passing to
             * suitable function (ex: generateSignTiktok)
             */
            for (const param of queryParamsRestAPI) {
              if (
                !param.value?.toString().toLowerCase().includes("generatesign")
              ) {
                param.value = await resolveDynamicFunction(
                  param.value || "",
                  requestOption,
                  {
                    ...removeNonArrayValues(oauth2Config),
                    oauthConnection: objectToKeyValueArray(oauth2Connection),
                  },
                );
              }
            }

            // run generate sign function after all parameter resolved
            for (const param of queryParamsRestAPI) {
              if (
                param.value?.toString().toLowerCase().includes("generatesign")
              ) {
                param.value = await resolveDynamicFunction(
                  param.value || "",
                  {
                    ...requestOption,
                    qs: {
                      ...requestOption.qs,
                      ...Object.assign(
                        {},
                        ...queryParamsRestAPI.map(
                          (param: DataRequestRestApi) => ({
                            [param.key as string]: param.value,
                          }),
                        ),
                      ),
                    },
                  },
                  {
                    ...removeNonArrayValues(oauth2Config),
                    oauthConnection: objectToKeyValueArray(oauth2Connection),
                  },
                );
              }
            }

            const urlParams = new URLSearchParams();

            // Add queryParams to URLSearchParams
            Object.entries(queryParams).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                urlParams.append(key, String(value));
              }
            });

            let finalUrl = requestUrl;
            if (urlParams.toString()) {
              finalUrl +=
                (finalUrl.includes("?") ? "&" : "?") + urlParams.toString();
            }

            requestUrl = finalUrl;
          }

          // Prepare request body with template replacement
          let finalRequestBody: any = null;
          if (
            !["GET", "DELETE"].includes(requestMethod.toUpperCase()) &&
            requestBodyTemplate
          ) {
            // Parse fields and values
            // const fieldNames = params.fields?.split(",").map((f) => f.trim());
            const values = params.value?.split(";").map((v) => v.trim());

            // Replace $1, $2, ... in the template with user-supplied values
            let replacedBody = requestBodyTemplate;
            for (let i = 0; i < values.length; i++) {
              // Replace all occurrences of $<i+1> with values[i]
              const regex = new RegExp(`\\$${i + 1}`, "g");
              replacedBody = replacedBody.replace(regex, values[i]);
            }

            // Try to parse as JSON, fallback to string if not valid JSON
            try {
              finalRequestBody = JSON.parse(replacedBody);
            } catch (e) {
              console.log(e);
              finalRequestBody = replacedBody;
            }
          }

          const fetchOptions: any = {
            method: requestMethod,
            headers: requestHeaders,
          };

          /**
           * Prepares and attaches the request body to the fetch options for non-GET/DELETE HTTP methods.
           * If the body is a plain object (not FormData), it is JSON-stringified and the Content-Type
           * header is set to application/json when not already present.
           */
          if (
            !["GET", "DELETE"].includes(requestMethod.toUpperCase()) &&
            finalRequestBody
          ) {
            // If body is an object, stringify it and set content-type if not set
            if (
              typeof finalRequestBody === "object" &&
              !(finalRequestBody instanceof FormData)
            ) {
              if (!requestHeaders["Content-Type"]) {
                requestHeaders["Content-Type"] = "application/json";
              }
              fetchOptions.body = JSON.stringify(finalRequestBody);
            } else {
              fetchOptions.body = finalRequestBody;
            }
          }

          const urlObj = new URL(requestUrl);

          // Append query parameters to the request URL when provided as an array of key-value pairs
          if (Array.isArray(queryParamsRestAPI)) {
            queryParamsRestAPI.forEach((p) => {
              if (p.key && Boolean(p.value)) {
                urlObj.searchParams.set(p.key, String(p.value));
              }
            });
          }

          const response = await fetch(urlObj.toString(), { ...fetchOptions });

          // Cek tipe header response dan kembalikan sesuai tipe
          const contentType = response.headers.get("content-type") || "";
          let result: any;

          if (contentType.includes("application/json")) {
            const textResult = await response.text();
            result = JSONbig({ storeAsString: true }).parse(textResult);
          } else if (contentType.includes("text/html")) {
            result = {
              html: await response.text(),
            };
          } else if (
            contentType.includes("text/") ||
            contentType.includes("application/xml") ||
            contentType.includes("application/xhtml+xml")
          ) {
            result = await response.text();
          } else if (
            contentType.includes("application/pdf") ||
            contentType.includes("application/msword") ||
            contentType.includes(
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ) ||
            contentType.includes("application/vnd.ms-excel") ||
            contentType.includes(
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ) ||
            contentType.includes("application/vnd.ms-powerpoint") ||
            contentType.includes(
              "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ) ||
            contentType.includes("application/octet-stream")
          ) {
            // Untuk dokumen, kembalikan sebagai blob dan info filename jika ada
            let blob = null;
            try {
              if (response.bodyUsed) {
                // Body sudah pernah dibaca, tidak bisa ambil blob lagi
                console.warn(
                  "Response body already used before calling .blob()",
                );
              } else {
                blob = await response.blob();
              }
            } catch (e) {
              console.error("Failed to get blob from response:", e);
            }
            if (!blob) {
              // Coba fallback ke arrayBuffer jika blob gagal
              try {
                const buffer = await response.arrayBuffer();
                blob = new Blob([buffer], { type: contentType });
              } catch (e) {
                console.error("Failed to fallback to arrayBuffer for blob:", e);
              }
            }

            if (blob != null) {
              result = {
                type: "document",
                documentType: contentType,
                fileUrl: url,
              };
            }
          } else {
            // Fallback: coba text
            result = await response.text();
          }

          console.log({
            fetchOptions,
            url: urlObj.toString(),
            result,
          });

          let toolName = "get_x_token_auth_321";
          if (functionName === "get_x_token_auth_321") {
            toolName = "get_pph21_status_43720";
          }
          const session = await getAuthSession();
          const { id, type_id, name, function_name } =
            await getFunctionDataFromDB(session, toolName);

          return {
            success: true,
            status: response.statusText,
            code: response.status,
            data: result,
          };
        } catch (error) {
          console.error("Error executing dynamic tool:", error);
          return {
            success: false,
            error: "Failed to execute tool",
            details: error instanceof Error ? error.message : String(error),
          };
        }
      },
    },
  };
}

// Export SQL utility functions for external use
export { hasWhereClause, buildWhereClause, buildSqlWithWhere };

/**
 * Creates AI tools from database tool definitions
 * @param databaseTools Array of tool definitions from the database
 * @returns Object containing all dynamically created tools
 */
export async function createToolsFromDatabase(
  functionTools: any,
  authContext?: { userId?: string; bearerToken?: string },
) {
  let tools: Record<string, any> = {};
  const extraSystemInstructions: string[] = [];
  const partials = await Promise.all(
    functionTools.map(async (tool: any) => {
      switch (tool.type.valueString) {
        case "BUILT-IN": {
          const builtIn = await handleBuiltInTool(tool);
          return { tools: builtIn, instructions: [] as string[] };
        }
        case "EMBEDDING": {
          const embedding = handleEmbeddingTool(tool, authContext);
          const instructions = tool.systemInstruction
            ? [tool.systemInstruction]
            : [];
          return { tools: embedding, instructions };
        }
        case "DATABASE": {
          const database = handleDatabaseTool(tool, authContext);
          return { tools: database, instructions: [] as string[] };
        }
        case "REST API": {
          const restApi = handleRestApiTool(tool);
          return { tools: restApi, instructions: [] as string[] };
        }
        default:
          return { tools: {}, instructions: [] as string[] };
      }
    }),
  );

  for (const part of partials) {
    if (part.instructions.length) {
      extraSystemInstructions.push(...part.instructions);
    }
    tools = { ...tools, ...part.tools };
  }

  // console.log("Created tools from database:", tools);
  return {
    tools: tools,
    extraSystemInstructions: extraSystemInstructions,
  };
}

/**
 * Fetches tool definitions from the database and creates tools
 * @param dbClient The database client to use for fetching tools
 * @returns Object containing all tools created from database definitions
 */
export async function loadToolsFromDatabase(
  agentId: string,
  authContext?: { userId?: string; bearerToken?: string },
) {
  try {
    console.log("Loading tools from database for agent", agentId);
    // Replace this with your actual database query
    const databaseTools = await prisma?.functionTool.findMany({
      where: {
        ToolsOnAgent: {
          some: {
            agentId: agentId,
          },
        },
      },
      include: {
        type: true,
      },
    });
    console.log("databaseTools", databaseTools);

    return await createToolsFromDatabase(databaseTools, authContext);
  } catch (error) {
    console.error("Failed to load tools from database:", error);
    return {};
  }
}

/**
 * Get all tools including both static and dynamic database tools
 * @param dbClient The database client to use
 * @param isReasoningEnabled Whether reasoning tools should be included
 * @param modelId The model ID being used
 * @param enableCharts Whether chart generation tools should be included
 * @returns Object containing all tools to be used
 */
export async function getAllTools(
  agentId: string = "",
  authContext?: { userId?: string; bearerToken?: string },
) {
  // Get static tools from the original implementation
  // const staticTools = getTools(isReasoningEnabled, modelId, enableCharts);

  // Get dynamic tools from database
  const dynamicTools: any = await loadToolsFromDatabase(agentId, authContext);

  // Merge static and dynamic tools
  return {
    // ...staticTools,
    tools: dynamicTools.tools,
    extraSystemInstructions: dynamicTools.extraSystemInstructions,
  };
}
