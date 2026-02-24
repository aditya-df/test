"use client";

// Define interfaces for chart data structures
interface ChartConfig {
  type: string;
  title: string;
  xAxisKey: string | null;
  yAxisKey: string | null;
}

interface ChartData {
  data: Record<string, unknown>[];
  chartConfig: ChartConfig;
  analysis?: string;
}

/**
 * Enhanced utility for parsing and normalizing chart data from API responses
 */
export const parseChartData = (content: unknown): ChartData | null => {
  if (!content) {
    return null;
  }

  // If content is already an object (not a string), process it directly
  if (typeof content !== "string") {
    return normalizeChartData(content);
  }

  try {
    // First attempt: direct JSON parse
    try {
      const parsed = JSON.parse(content);
      return normalizeChartData(parsed);
    } catch (e) {
      // Initial parse failed, try cleaning the string
      console.error("Initial JSON parse failed:", e);
    }

    // Second attempt: clean the string and try again
    let cleanContent = content
      .replace(/^["'`]|["'`]$/g, "") // Remove outer quotes
      .replace(/\\n/g, "") // Remove newline escapes
      .replace(/\\\\/g, "\\") // Fix double escapes
      .replace(/\\"/g, '"') // Fix escaped quotes
      .replace(/"{/g, "{") // Fix quotes around objects
      .replace(/}"/g, "}") // Fix quotes around objects
      .trim();

    // Try to find valid JSON within the string
    const jsonStartIndex = cleanContent.indexOf("{");
    const jsonEndIndex = cleanContent.lastIndexOf("}") + 1;

    if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex) {
      cleanContent = cleanContent.substring(jsonStartIndex, jsonEndIndex);
    }

    // Try parsing the cleaned content
    const parsedData = JSON.parse(cleanContent);
    return normalizeChartData(parsedData);
  } catch (error) {
    console.error("Failed to parse chart data:", error);
    return null;
  }
};

/**
 * Normalize chart data structure to ensure consistency
 */
export const normalizeChartData = (chartData: unknown): ChartData | null => {
  // Handle direct data array
  if (Array.isArray(chartData)) {
    // If it's just an array of data points, infer the chart config
    return {
      data: chartData,
      chartConfig: inferChartConfig(chartData),
      analysis: "",
    };
  }

  // Handle nested data structure
  if (chartData && typeof chartData === "object") {
    const chartDataObj = chartData as Record<string, unknown>;
    let data = chartDataObj.data || [];

    // Handle case where data is a stringified JSON
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error("Failed to parse data string:", e);
        // Keep as is if parsing fails
      }
    }

    // Normalize data to array
    data = Array.isArray(data) ? data : [data];

    // Clean values to ensure proper number formatting
    const cleanedData = (data as Record<string, unknown>[]).map(
      (item: Record<string, unknown>) => {
        const cleanedItem: Record<string, unknown> = {};
        Object.keys(item).forEach((key) => {
          const value = item[key];
          cleanedItem[key] =
            typeof value === "string" && !isNaN(Number(value))
              ? Number(value)
              : value;
        });
        return cleanedItem;
      },
    );

    // Get or infer chart configuration
    const chartConfig = chartDataObj.chartConfig
      ? normalizeChartConfig(
          chartDataObj.chartConfig as Record<string, unknown>,
          cleanedData,
        )
      : inferChartConfig(cleanedData);

    // Check for null or empty data
    if (!cleanedData || cleanedData.length === 0) {
      console.error("No data available for chart");
      return null;
    }

    return {
      data: cleanedData,
      chartConfig,
      analysis:
        typeof chartDataObj.analysis === "string" ? chartDataObj.analysis : "",
    };
  }

  return null;
};

/**
 * Normalize chart configuration object, filling in missing values
 */
const normalizeChartConfig = (
  config: Record<string, unknown>,
  data: Record<string, unknown>[],
): ChartConfig => {
  if (!config) return inferChartConfig(data);

  const type = normalizeChartType((config.type as string) || "bar");

  // If xAxisKey or yAxisKey are missing, try to infer them from data
  let xAxisKey = config.xAxisKey as string | null;
  let yAxisKey = config.yAxisKey as string | null;

  // For pie charts, x/y axis might be null (uses labels/data directly)
  if (type === "pie" && !xAxisKey) {
    const inferredConfig = inferChartConfig(data);
    xAxisKey = inferredConfig.xAxisKey;
  }

  if (!yAxisKey && data.length > 0) {
    const inferredConfig = inferChartConfig(data);
    yAxisKey = inferredConfig.yAxisKey;
  }

  return {
    type,
    title: (config.title as string) || "Data Visualization",
    xAxisKey: xAxisKey || null,
    yAxisKey: yAxisKey || null,
  };
};

/**
 * Normalize chart type string
 */
const normalizeChartType = (type: string): string => {
  if (!type) return "bar";
  const lowerType = type.toLowerCase();
  if (lowerType.includes("bar")) return "bar";
  if (lowerType.includes("line")) return "line";
  if (lowerType.includes("pie")) return "pie";
  return "bar"; // Default to bar chart
};

/**
 * Infer chart configuration from data
 */
const inferChartConfig = (data: Record<string, unknown>[]): ChartConfig => {
  if (!data || !data.length) {
    return {
      type: "bar",
      title: "Data Visualization",
      xAxisKey: null,
      yAxisKey: null,
    };
  }

  // Find a suitable x-axis key (prefer date fields, then string fields)
  const keys = Object.keys(data[0]);
  let xAxisKey = keys.find(
    (key) =>
      key.toLowerCase().includes("date") ||
      key.toLowerCase().includes("time") ||
      key.toLowerCase().includes("month") ||
      key.toLowerCase().includes("year"),
  );

  if (!xAxisKey) {
    xAxisKey = keys.find(
      (key) =>
        typeof data[0][key] === "string" &&
        !key.toLowerCase().includes("analysis") &&
        !key.toLowerCase().includes("description"),
    );
  }

  // Find a suitable y-axis key (prefer numeric fields with financial keywords)
  let yAxisKey = keys.find(
    (key) =>
      typeof data[0][key] === "number" &&
      (key.toLowerCase().includes("revenue") ||
        key.toLowerCase().includes("sales") ||
        key.toLowerCase().includes("profit") ||
        key.toLowerCase().includes("income") ||
        key.toLowerCase().includes("amount") ||
        key.toLowerCase().includes("value") ||
        key.toLowerCase().includes("total")),
  );

  if (!yAxisKey) {
    yAxisKey = keys.find(
      (key) =>
        typeof data[0][key] === "number" &&
        key !== "id" &&
        !key.toLowerCase().includes("index"),
    );
  }

  // Determine chart type
  // Use line chart for date-based data, pie for categorical single value, bar otherwise
  const type =
    xAxisKey &&
    (xAxisKey.toLowerCase().includes("date") ||
      xAxisKey.toLowerCase().includes("time") ||
      xAxisKey.toLowerCase().includes("month") ||
      xAxisKey.toLowerCase().includes("year"))
      ? "line"
      : keys.length <= 2
        ? "pie"
        : "bar";

  // Generate a title
  const title =
    yAxisKey && xAxisKey
      ? `${formatFieldName(yAxisKey)} by ${formatFieldName(xAxisKey)}`
      : "Data Visualization";

  return {
    type,
    title,
    xAxisKey: xAxisKey || null,
    yAxisKey: yAxisKey || null,
  };
};

// Format field name for display (e.g., "total_revenue" -> "Total Revenue")
const formatFieldName = (field: string): string => {
  if (!field) return "Value";
  return field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// Create a named export object
export const ChartParser = {
  parseChartData,
  normalizeChartData,
};

// Export as default
export default ChartParser;
