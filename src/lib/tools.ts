import {
  createDynamicTableEncoding,
  decodeBase64Value,
  detectFieldsFromData,
  isMMYYYYFormat,
  isWithinTolerance,
  mmYyyyToYyyyMmDd,
  normalizeNPWP,
  normalizeText,
} from "@/utils/utils";
import { ToolboxClient } from "@toolbox-sdk/core";
import { z } from "zod";

// Add a reasoning step counter context
let reasoningStepCount = 0;
const MAX_REASONING_STEPS = 10;

// Add a function to reset reasoning counter
export function resetReasoningCounter() {
  reasoningStepCount = 0;
  console.log("Reasoning counter reset");
}

// Define reasoning tool with proper loop prevention
const reasoningTool = {
  addReasoningStep: {
    description:
      "Add a step to the reasoning process. Use this sparingly and always progress toward a final answer.",
    inputSchema: z.object({
      title: z.string().describe("The title of the reasoning step"),
      content: z
        .string()
        .describe(
          "The content of the reasoning step. WRITE OUT ALL OF YOUR WORK. Where relevant, prove things mathematically.",
        ),
      nextStep: z
        .enum(["continue", "finalAnswer"])
        .describe(
          "Whether to continue with another step or provide the final answer. Choose 'finalAnswer' after maximum 10 reasoning steps.",
        ),
    }),
    execute: async (params: any) => {
      reasoningStepCount++;
      console.log(
        `Reasoning step ${reasoningStepCount}/${MAX_REASONING_STEPS}`,
      );

      // Force final answer if we've reached the limit
      if (reasoningStepCount >= MAX_REASONING_STEPS) {
        console.log("Max reasoning steps reached, forcing final answer");
        return {
          ...params,
          nextStep: "finalAnswer",
          content:
            params.content +
            "\n\n[Proceeding to final answer to avoid excessive reasoning]",
        };
      }

      return params;
    },
  },
};

// IMPROVED: Chart generation tool with enhanced validation
const chartTool = {
  render_chart: {
    description:
      "Displays a Vega-Lite visualization based on the provided specification.",
    inputSchema: z.object({
      json_graph: z
        .string()
        .describe(
          "JSON STRING representation of the Vega-Lite specification. Must be a string, not a JSON object.",
        ),
      title: z
        .string()
        .describe("The title of the chart to display")
        .optional(),
      description: z
        .string()
        .describe("A brief description of what the chart shows")
        .optional(),
    }),
    execute: async (params: any) => {
      try {
        // Parse the JSON string to get the Vega-Lite specification
        const spec = JSON.parse(params.json_graph);

        // Enhanced spec validation
        if (
          !spec.mark &&
          !spec.layer &&
          !spec.concat &&
          !spec.facet &&
          !spec.repeat
        ) {
          throw new Error(
            "Invalid Vega-Lite specification: missing mark or composition",
          );
        }

        // Handle table mark conversion with dynamic field detection
        if (spec.mark === "table") {
          const fields = detectFieldsFromData(spec.data);

          if (fields.length === 0) {
            throw new Error("No data fields detected for table conversion");
          }

          // Convert to horizontal bar chart
          spec.mark = {
            type: "bar",
            color: "#4c78a8",
          };

          // Remove invalid transform if present
          if (spec.transform) {
            delete spec.transform;
          }

          // Create dynamic encoding based on detected fields
          spec.encoding = createDynamicTableEncoding(fields);

          // Adjust dimensions based on data size
          spec.width = 500;
          spec.height = Math.max(
            200,
            fields.length > 2 ? fields.length * 30 : 200,
          );
        }

        // Add title and description if provided and not already in spec
        spec.title ??= params.title;
        spec.description ??= params.description;

        // Ensure the spec has the correct schema
        spec.$schema =
          spec.$schema || "https://vega.github.io/schema/vega-lite/v6.json";

        // Add default width and height if not specified
        spec.width ??= 400;
        spec.height ??= 300;

        // Return enhanced result
        const result = {
          success: true,
          vegaLiteSpec: spec,
          title: params.title ?? spec.title,
          description: params.description ?? spec.description,
          chartType: spec.mark?.type || "composite",
        };

        // Convert any potential Sets to Arrays
        return JSON.parse(JSON.stringify(result));
      } catch (error) {
        console.error("Error processing chart specification:", error);
        return {
          success: false,
          error: "Failed to process chart specification",
          suggestion: "Please check your JSON format and Vega-Lite syntax",
          details: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
};

/**
 * CRITICAL FIX: Check if this is the first message in conversation
 * @param messages Chat history from database
 * @returns boolean indicating if this is the first assistant response
 */
function isFirstAssistantMessage(messages: any[]): boolean {
  if (!messages || messages.length === 0) return true;

  // CRITICAL FIX: Count actual assistant responses
  const assistantMessages = messages.filter((msg) => msg.role === "assistant");

  console.log(`Found ${assistantMessages.length} assistant messages`);
  return assistantMessages.length === 0;
}

/**
 * Get tools based on configuration
 * @param isReasoningEnabled Whether reasoning tools should be included
 * @param modelId The model ID being used
 * @param enableCharts Whether chart generation tools should be included
 * @param dbTools Optional dynamic tools loaded from database
 * @param organizationId Organization ID to inject into tools
 * @param conversationHistory Chat history to determine context
 * @returns Object containing all tools to be used
 */
export function getTools(
  isReasoningEnabled: boolean = false,
  modelId: string = "",
  enableCharts: boolean = true,
  dbTools: any = {},
  organizationId?: string,
  conversationHistory?: any[],
  imageGenerationEnabled: boolean = true,
) {
  // Check if model supports reasoning
  const supportsReasoning = isReasoningEnabled && modelId.includes("gemini");

  // CRITICAL FIX: Determine conversation context
  const isFirstMessage = isFirstAssistantMessage(conversationHistory || []);

  // IMPROVED: Create image generation tool with better parameter validation
  const imageGenerationToolWithOrg = {
    generate_image: {
      description:
        "Generate images using Google Imagen 4.0 Fast Generate, please prompt using english language. Do not include image URLs in text responses.",
      inputSchema: z.object({
        prompt: z
          .string()
          .describe("Detailed description of the image to generate"),
        aspect_ratio: z
          .enum(["1:1", "9:16", "16:9", "3:4", "4:3"])
          .describe("Aspect ratio for the generated image")
          .optional()
          .default("1:1"),
        person_generation: z
          .enum(["allow_adult", "allow_all"])
          .describe("Whether to allow person generation in images")
          .optional()
          .default("allow_adult"),
        safety_setting: z
          .enum(["block_some", "block_most"])
          .describe("Safety filter level for image generation")
          .optional()
          .default("block_some"),
      }),
      execute: async (params: any) => {
        try {
          const headers: HeadersInit = {
            "Content-Type": "application/json",
            "x-internal-api-key": process.env.INTERNAL_API_KEY!,
          };

          if (organizationId) {
            headers["x-organization-id"] = organizationId;
          }

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL_LOCAL}generate-image`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                prompt: params.prompt,
                aspect_ratio: params.aspect_ratio || "1:1",
                negative_prompt: params.negative_prompt,
                person_generation: params.person_generation || "allow_adult",
                safety_setting: params.safety_setting || "block_some",
                add_watermark: params.add_watermark,
                include_base64: params.include_base64 ?? false,
              }),
            },
          );

          const result = await response.json();

          if (!result.success) {
            return {
              success: false,
              error: result.error || "Image generation failed",
              suggestion: "Try rephrasing your prompt or adjusting parameters",
              details: result.details,
            };
          }

          // CRITICAL FIX: Store context for response formatting
          return {
            success: true,
            image_url: result.image_url,
            generation_id: result.generation_id,
            model: result.model,
            prompt: result.prompt,
            timestamp: result.timestamp,
            // Add metadata for response handling
            context: {
              isFirstMessage,
              hideUrlInResponse: true, // Don't show URL in text
            },
          };
        } catch (error) {
          console.error("Image generation tool error:", error);

          return {
            success: false,
            error: "Failed to generate image",
            suggestion: "Please try again with a different prompt",
            details: error instanceof Error ? error.message : String(error),
            type: "image_generation_error",
          };
        }
      },
    },
  };

  const scrapeDataTool = {
    scrape_store_data: {
      description:
        "Retrieve store and product data via the web-scraper API for Tokopedia. Use this both for product queries and store info questions (e.g., opening/join date on Tokopedia). For store info, omit 'keyword' and provide 'platform' and 'shop_name'; the tool returns 'data.store_info.join_date' when available. For product queries, set 'keyword' (e.g., 'chair') and 'query' (e.g., 'termahal' for highest price). Example store query: 'when did ikea open on Tokopedia?'. Example product query: 'can you fetch the most expensive chair data from ikeaindonesia on Tokopedia?'.",
      inputSchema: z.object({
        keyword: z
          .string()
          .describe("Product keyword from the prompt (example: 'chair')")
          .optional(),
        query: z
          .enum(["terlaris", "termurah", "termahal", "terbaru"])
          .describe(
            "Sorting method: choose 'termahal' for highest price, 'termurah' for lowest price, 'terlaris', or 'terbaru'. Default 'terlaris'.",
          )
          .optional()
          .default("terlaris"),
        platform: z
          .enum(["tokopedia"])
          .describe(
            "Platform to scrape products from: 'tokopedia'. Default 'tokopedia'.",
          )
          .optional()
          .default("tokopedia"),
        shop_name: z
          .string()
          .describe("Shop name (example: 'ikeaindonesia')")
          .optional()
          .default("ikeaindonesia"),
      }),
      execute: async (params: any) => {
        try {
          // Only run the product scraping call without fetching the page HTML
          let query = "sort=8";
          switch (params.query) {
            case "terlaris":
              query = "sort=8";
              break;
            case "termurah":
              query = "sort=9";
              break;
            case "termahal":
              query = "sort=10";
              break;
            case "terbaru":
              query = "sort=2";
              break;
          }

          const apiV2 = process.env.NEXT_PUBLIC_API_URL_V2;
          const product = await fetch(`${apiV2}/web-scraper/scrape`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shop_urls: [
                `https://www.${
                  params.platform
                }.com/${params.shop_name.toLowerCase()}`,
              ],
              keyword: params.keyword,
              query,
              platform: params.platform,
            }),
          });

          const productJson = await product.json();

          const productContentType =
            product.headers.get("content-type") || "application/json";

          return {
            success: true,
            content_type: productContentType,
            data: productJson,
          };
        } catch (error) {
          console.error("scrape_store_data error:", error);
          return {
            success: false,
            error: "Failed to scrape products",
            details: error instanceof Error ? error.message : String(error),
            type: "web_scraper_error",
          };
        }
      },
    },
  };
  // {"Amount":"4665409.19000000000000000000","Nama_Vendor":"HOME CENTER INDONESIA RETAIL, PT.","nama":"","nominal":4665409.19,"NPWP":"53.106.582.9-086.000","Nomor_Faktur":"","GLE_DOC":"DPPPI-C000-2601-0002"}
  const tablePPnTool = {
    table_ppn_tool: {
      description: "filter and join data pajak express with data navision",
      inputSchema: z.object({
        dataPajakExpress: z
          .array(
            z.object({
              tglpemotongan: z.string().nullish(),
              noBupot: z.string().nullish(),
              pphDipotong: z.string().nullish(),
              totalppn: z.string().nullish(),
              namatokopenjual: z.string().nullish(),
              npwppenjual: z.string().nullish(),
              nama: z.string().nullish(),
              nomorfaktur: z.string().nullish(),
            }),
          )
          .describe("data pajak express"),
        periode: z.string().optional(),
      }),
      execute: async (params: any) => {
        try {
          const dataPajakExpress = params.dataPajakExpress;
          // load tool from MCP server
          const obj: Record<string, any> = {};
          try {
            const client = new ToolboxClient("http://36.91.92.17:5000");
            const toolboxTools = await client.loadToolset("my-toolset");

            toolboxTools.forEach((toolboxTool: any) => {
              obj[toolboxTool.toolName] = {
                description: toolboxTool.getDescription(),
                parameters: toolboxTool.getParamSchema(),
                execute: toolboxTool,
              };
            });
          } catch (err) {
            console.error("Error loading toolbox tools:", err);
          }

          console.log({ dataPajakExpress });
          const resultMCP = await Promise.all(
            [
              {
                args: {
                  periode: params.periode,
                  vendor_name: dataPajakExpress
                    .map((item: any) => item.namatokopenjual || item.nama || "")
                    .filter(Boolean)
                    .join(","),
                },
                toolName: "search-entry-for-ppn-vendor",
              },
            ].map(async (tool: any) => {
              const args = tool.args;

              if (params.periode && isMMYYYYFormat(params.periode)) {
                args.periode = mmYyyyToYyyyMmDd(params.periode);
              }
              console.log({ args });

              if (obj[tool.toolName]) {
                const responseMCP = await obj[tool.toolName].execute(args);
                return decodeBase64Value(JSON.parse(responseMCP));
              }
              return undefined;
            }),
          );
          const dataMCP = resultMCP
            .filter((item) => item !== undefined)
            .map((obj) => Object.values(obj))
            .flat()
            .map((item: any) => ({
              vendorName: item["Nama Vendor"] || "",
              amount: item.Amount || "",
              docNo: item["GLE DOC"] || "",
              npwp: item["NPWP"] || "",
              noFaktur: item["Nomor Faktur"] || "",
              normalizedNpwp: normalizeNPWP("0" + (item["NPWP"] || "")),
            }));

          // console.log({ dataMCP });
          // console.log({ pajak: params.dataPajakExpress });
          const joined = dataPajakExpress.map((rest: any) => {
            let matchDataNAV = null,
              filteredNAVData; // filteredData has data only if tools is VAT

            const targetName = normalizeText(rest.namatokopenjual);
            filteredNAVData = dataMCP.filter((mcp: any) => {
              return normalizeText(mcp.vendorName).includes(targetName);
            });

            matchDataNAV = filteredNAVData.find((mcp: any) =>
              isWithinTolerance(parseInt(mcp.amount), parseInt(rest.totalppn)),
            );

            if (!matchDataNAV && filteredNAVData.length > 0) {
              matchDataNAV = filteredNAVData[0];
            }

            let matchStatus;
            const pphDipotong = rest?.pphDipotong || rest?.totalppn;

            if (!matchDataNAV) {
              matchStatus = "Missing GL";
            } else {
              const pphValue = parseInt(pphDipotong);
              const amountValue = Math.abs(parseInt(matchDataNAV.amount));
              const isSameAmount = isWithinTolerance(pphValue, amountValue);

              if (
                isSameAmount &&
                normalizeNPWP(matchDataNAV.noFaktur)?.includes(rest.nomorfaktur)
              ) {
                matchStatus = "Match";
                const sameAmountNAVData =
                  filteredNAVData?.filter((mcp: any) =>
                    isWithinTolerance(mcp.amount, pphValue),
                  ) || [];

                if (sameAmountNAVData?.length > 1) {
                  matchStatus =
                    "Match (" +
                    sameAmountNAVData.filter((mcp: any) =>
                      isWithinTolerance(mcp.amount, pphValue),
                    ).length +
                    " records with the same amount value)";
                }
              } else {
                matchStatus = "Mismatch";
                matchDataNAV = null;

                if (filteredNAVData && filteredNAVData?.length > 0) {
                  matchStatus =
                    "Mismatch (" + filteredNAVData?.length + " data found)";
                }
              }
            }

            return {
              "Tanggal potong": rest?.tglpemotongan || rest?.tanggalfaktur,
              "No Bupot": rest.noBupot,
              "Nama Vendor": rest?.namatokopenjual || rest?.nama || "",
              "Pajak dipotong PajakExpress": pphDipotong,
              "Amount Navision": matchDataNAV ? matchDataNAV.amount : null,
              "Document No Navision": matchDataNAV ? matchDataNAV.docNo : null,
              status: matchStatus,
              nomorfaktur: rest.nomorfaktur,
              noFaktur: matchDataNAV?.noFaktur,
            };
          });

          console.log({ joined });

          return joined;
          // return {
          //   success: true,
          //   data: joined,
          // };
        } catch (error) {
          console.error("scrape_store_data error:", error);
          return {
            success: false,
            error: "Failed to scrape products",
            details: error instanceof Error ? error.message : String(error),
            type: "web_scraper_error",
          };
        }
      },
    },
  };

  // Base tools
  let tools = {
    ...scrapeDataTool,
    ...tablePPnTool,
  };

  // Add image generation tool if enabled
  if (imageGenerationEnabled) {
    tools = {
      ...tools,
      ...imageGenerationToolWithOrg,
    };
  }

  // Add reasoning tool if supported
  if (supportsReasoning) {
    tools = {
      ...tools,
      ...reasoningTool,
    };
  }

  // Add chart generation tool if enabled
  if (enableCharts) {
    tools = {
      ...tools,
      ...chartTool,
    };
  }

  tools = {
    ...tools,
    ...dbTools,
  };

  return tools;
}

/**
 * IMPROVED: Get system message for the AI with context awareness
 * @param isReasoningEnabled Whether reasoning is enabled (default: false)
 * @param enableCharts Whether chart generation is enabled (default: true)
 * @param extraSystemMessage Additional system instructions
 * @param conversationHistory Chat history to determine context
 * @param agentName Name of the agent (for first message only)
 * @returns System message string
 */
export function getSystemMessage(
  isReasoningEnabled: boolean = false,
  enableCharts: boolean = true,
  extraSystemMessage: string[] = [],
  conversationHistory?: any[],
  agentName?: string,
  imageGenerationEnabled: boolean = true,
): string {
  // CRITICAL FIX: Determine if this is the first message
  // const isFirstMessage = isFirstAssistantMessage(conversationHistory || []);

  // Add extra system messages if provided
  const extraSystemMessageString =
    extraSystemMessage.length > 0
      ? `
    ${extraSystemMessage.join("\n")}
  `
      : "";

  const imageGenerationInstructions = imageGenerationEnabled
    ? `
    - Image generation tool (generate_image) using Google Imagen 4.0 Fast Generate
      * Use "allow_adult" or "allow_all" for person_generation parameter
      * Use "block_some" or "block_most" for safety_setting
      * Popular aspect ratios: "1:1" (square), "16:9" (landscape), "9:16" (portrait)
      * IMPORTANT: Never include image URLs in your text responses
  `
    : "";

  const toolingStep = `${imageGenerationInstructions}
    ${extraSystemMessageString}
  `;

  // CRITICAL FIX: Agent introduction logic
  // const agentIntroduction = isFirstMessage && agentName
  // ? `${agentName} di sini. `
  // : "";

  const currentDate = new Date();
  const indonesianDate = new Date(
    currentDate.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
  );
  const formattedTime = indonesianDate.toLocaleTimeString("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Base message without reasoning (default)
  let baseMessage = `You are an assistant that provides clear, concise answers.
        You can use the following tools to help you answer questions and solve problems:
        ${toolingStep}

        Current date is "${indonesianDate}" and time "${formattedTime}"
        
        Follow these guidelines exactly:
        - CRITICAL: Only introduce yourself (with "${agentName}") in the FIRST message of a conversation and user asking who you are. Otherwise, do not introduce yourself.
        - Do not repeat the user's exact words in your response
        - Do not repeat your own exact words from previous responses unless specifically asked
        - Do not repeat self-introduction after the first message
        - Answer every question mathematically where possible
        - Keep your responses concise and focused
        - For financial data queries, provide insightful analysis with the data, not just raw results
        - For flight-related queries, use the flight booking tools to help users search and book flights
        ${
          imageGenerationEnabled
            ? `- For image generation requests:
            * Use the generate_image tool with user prompt converted to English first
            * Use appropriate aspect ratios
            * NEVER include image URLs in your text responses - the tool handles image display
            * Only mention that the image has been generated`
            : ""
        }
        - Please answer using the same language as the user prompt
        `;

  // Add reasoning-specific instructions if enabled
  if (isReasoningEnabled) {
    baseMessage = `You are an assistant that explains your reasoning step by step.
        For each step, provide a title that describes what you're doing in that step, along with the content. Decide if you need another step or if you're ready to give the final answer.
  
        You can use the following tools to help you answer questions and solve problems:
        ${toolingStep}

        Current date is "${indonesianDate}" and time "${formattedTime}"
        
        Follow these guidelines exactly:
        - CRITICAL: Only introduce yourself (with "${agentName}") in the FIRST message of a conversation and user asking who you are. Otherwise, do not introduce yourself.
        - Do not repeat the user's exact words in your response
        - Do not repeat your own exact words from previous responses unless specifically asked
        - Do not repeat self-introduction after the first message
        - Answer every question mathematically where possible
        - USE NO MORE THAN 3 REASONING STEPS for simple questions
        - Keep your reasoning concise and focused
        - For data-related queries, first check tools you have available
        ${
          imageGenerationEnabled
            ? `- For image generation requests:
            * Use the generate_image tool with user prompt converted to English first
            * Use appropriate aspect ratios
            * NEVER include image URLs in your text responses - the tool handles image display
            * Only mention that the image has been generated`
            : ""
        }
        - When you have enough information, provide the final answer
        - Please answer using the same language as the user prompt
        - Call addReasoningStep tools for each step of your REASONING PROCESS
        - if reasoningStepCount exceeds ${MAX_REASONING_STEPS}, you must provide the final answer in the chat in the main content not in the addReasoningStep tools
        - Main content/message is only for final answers
        `;
  }

  // Add chart and image generation instructions
  if (enableCharts) {
    baseMessage += `
      
      When chart or data visualization would be helpful:
      - Use the render_chart tool to create visual representations of data
      - Provide a complete Vega-Lite specification as a JSON string
      - Include appropriate titles and labels for all charts
      - Validate your JSON before submitting
      
      ${
        imageGenerationEnabled
          ? `For image generation requests using Google Imagen:
      - Use descriptive and detailed prompts for better results
      - Choose appropriate aspect ratios (1:1 for square, 16:9 for landscape, 9:16 for portrait, etc.)`
          : ""
      }
      ${
        imageGenerationEnabled
          ? `- Use appropriate safety settings: block_some (default) or block_most for safer content
      - Person generation: allow_adult (default) or allow_all for broader generation
      - NEVER include image URLs in your text responses - let the tool handle image display
      - Only confirm that the image has been generated successfully`
          : ""
      }`;
  }

  return baseMessage;
}
