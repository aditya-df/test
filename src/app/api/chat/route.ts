// src/app/api/chat/route.ts
import { modelID, myProvider } from "@/lib/models";
import {
  UIMessage,
  smoothStream,
  streamText,
  stepCountIs,
  convertToModelMessages,
} from "ai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth.config";
import { prisma } from "@/config/db";
import { Prisma } from "@prisma/client";
import { getTools, getSystemMessage, resetReasoningCounter } from "@/lib/tools";
import * as XLSX from "xlsx";
import { loadToolsFromDatabase } from "@/lib/dynamicTools";
import { msToSeconds, SERVER_TIMEOUT } from "@/lib/timeout-config";
import { generateSimpleTopicFromMessages } from "@/utils/utils";
import { RedisChatService, type RedisChatData } from "@/lib/redis-chat-service";
import {
  AuditAction,
  logChatAction,
  updateChatAuditLog,
} from "@/lib/audit-log";
import { ToolboxClient } from "@toolbox-sdk/core";

export const dynamic = "force-dynamic";

// Get Redis configuration from environment
const USING_REDIS = process.env.USING_REDIS === "true";

import { getCachedAgentSystemInstructions } from "@/lib/cached-functions";

// AI SDK 5.0: Helper function to normalize messages to use 'parts' format instead of 'content'
function normalizeMessagesToParts(messages: any[]): any[] {
  return messages.map((message) => {
    // Already has parts
    if (message.parts && Array.isArray(message.parts)) {
      const { content: _, ...messageWithoutContent } = message;
      return { ...messageWithoutContent, parts: message.parts };
    }

    // Has content (v4 style or string content)
    if (message.content !== undefined) {
      let parts: any[] = [];
      if (typeof message.content === "string") {
        parts = [{ type: "text", text: message.content }];
      } else if (Array.isArray(message.content)) {
        parts = message.content.map((item: any) => {
          if (typeof item === 'string') return { type: 'text', text: item };
          if (item.type === 'tool-invocation') return item;
          if (item.type === 'text') return item;
          // Preserve all properties
          return { ...item, type: item.type || 'text' };
        });
      }
      const { content: _, ...messageWithoutContent } = message;
      return { ...messageWithoutContent, parts };
    }

    // Fallback for role: "tool" messages that might have result/toolCallId property directly
    if (message.role === 'tool') {
      return {
        ...message,
        parts: [{
          type: 'tool-result',
          toolCallId: (message as any).toolCallId || (message as any).toolInvocation?.toolCallId,
          toolName: (message as any).toolName || (message as any).toolInvocation?.toolName,
          result: (message as any).result || (message as any).output || (message as any).content || (message as any).toolInvocation?.result
        }]
      };
    }

    return message;
  });
}

async function preprocessMessages(messages: any[]) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_URL_LOCAL?.replace("/api/", "") || "";

  // Optimization: Process messages in parallel where possible
  return await Promise.all(
    messages.map(async (message: any) => {
      if (
        message.role !== "user" ||
        !message.parts ||
        !Array.isArray(message.parts)
      ) {
        return message;
      }

      const processedParts = await Promise.all(
        message.parts.map(async (part: any) => {
          if (part.type !== "file" || part.url?.startsWith("data:")) {
            return part;
          }

          try {
            if (part.mediaType?.startsWith("image/")) {
              const proxyUrl = `${baseUrl}/api/proxy-image?url=${encodeURIComponent(part.url)}`;
              const response = await fetch(proxyUrl, {
                signal: AbortSignal.timeout(10000),
              });
              if (!response.ok) throw new Error("Image fetch failed");

              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString("base64");
              return {
                ...part,
                url: `data:${part.mediaType};base64,${base64}`,
              };
            }

            if (part.mediaType === "application/pdf") {
              const proxyUrl = `${baseUrl}/api/proxy-file?url=${encodeURIComponent(part.url)}`;
              const response = await fetch(proxyUrl, {
                signal: AbortSignal.timeout(20000),
              });
              if (!response.ok) throw new Error("PDF fetch failed");

              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString("base64");
              return { ...part, url: `data:application/pdf;base64,${base64}` };
            }

            if (
              part.mediaType ===
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
              part.mediaType === "application/vnd.ms-excel"
            ) {
              const proxyUrl = `${baseUrl}/api/proxy-file?url=${encodeURIComponent(part.url)}`;
              const response = await fetch(proxyUrl, {
                signal: AbortSignal.timeout(15000),
              });
              if (!response.ok) throw new Error("Excel fetch failed");

              const arrayBuffer = await response.arrayBuffer();
              const workbook = XLSX.read(arrayBuffer, {
                type: "array",
                cellText: true,
                cellNF: false,
                raw: false,
              });

              let combinedCsvContent = "";
              for (const sheetName of workbook.SheetNames) {
                const csvContent = XLSX.utils.sheet_to_csv(
                  workbook.Sheets[sheetName],
                  { blankrows: false },
                );
                combinedCsvContent +=
                  workbook.SheetNames.length > 1
                    ? `\n\n=== ${sheetName} ===\n${csvContent}`
                    : csvContent;
              }

              const base64Csv = Buffer.from(
                combinedCsvContent,
                "utf8",
              ).toString("base64");
              return {
                ...part,
                url: `data:text/csv;base64,${base64Csv}`,
                mediaType: "text/csv",
                originalUrl: part.url,
                originalMediaType: part.mediaType,
              };
            }
          } catch (error) {
            console.error(`Error preprocessing part:`, error);
          }
          return part;
        }),
      );

      return { ...message, parts: processedParts };
    }),
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    console.log("🔍 GET /api/chat - Redis config:", {
      userId: session.user.id,
      limit,
      page,
      skip,
      redisEnabled: USING_REDIS,
      timestamp: new Date().toISOString(),
    });

    let chats;

    if (USING_REDIS) {
      // Try to get from Redis first
      console.log("🔍 Attempting to fetch chats from Redis...");
      const redisStartTime = Date.now();

      try {
        const redisChats = await RedisChatService.getUserChats(session.user.id);
        const redisTime = Date.now() - redisStartTime;

        console.log("✅ Redis fetch completed:", {
          userId: session.user.id,
          redisResponseTime: redisTime + "ms",
          chatsFound: redisChats.length,
          firstChatId: redisChats[0]?.id || "none",
        });

        if (redisChats.length > 0) {
          // Use Redis data
          const paginatedRedisChats = redisChats.slice(skip, skip + limit);

          chats = paginatedRedisChats.map((redisChat) => ({
            id: redisChat.id,
            userId: redisChat.userId,
            agentId: redisChat.agentId,
            messages: redisChat.messages,
            createdAt: redisChat.createdAt,
            topic: redisChat.topic,
            agent: redisChat.agentId
              ? {
                  id: redisChat.agentId,
                  agentName: "Agent",
                  description: null,
                }
              : null,
          }));

          console.log("✅ Using Redis data:", { convertedChats: chats.length });
        } else {
          throw new Error("No Redis data available");
        }
      } catch (redisError) {
        const redisTime = Date.now() - redisStartTime;
        console.log("📦 Redis unavailable, falling back to database:", {
          redisError:
            redisError instanceof Error
              ? redisError.message
              : String(redisError),
          redisResponseTime: redisTime + "ms",
        });

        // Fallback to database
        const dbStartTime = Date.now();
        chats = await prisma.chatNewVersion.findMany({
          where: {
            userId: session.user.id,
            isDeleted: { not: true },
          },
          include: {
            agent: {
              select: { id: true, agentName: true, description: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        });

        const dbTime = Date.now() - dbStartTime;
        console.log("📦 Database fallback completed:", {
          dbResponseTime: dbTime + "ms",
          dbChatsFound: chats.length,
        });
      }
    } else {
      // Standard database fetch
      console.log("📦 Using standard database fetch (Redis disabled)");
      const dbStartTime = Date.now();

      chats = await prisma.chatNewVersion.findMany({
        where: {
          userId: session.user.id,
          isDeleted: { not: true },
        },
        include: {
          agent: {
            select: { id: true, agentName: true, description: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      });

      const dbTime = Date.now() - dbStartTime;
      console.log("📦 Database fetch completed:", {
        dbResponseTime: dbTime + "ms",
        dbChatsFound: chats.length,
        redisUsed: false,
      });
    }

    return NextResponse.json(chats);
  } catch (error) {
    console.error("❌ Error in GET /api/chat:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 },
    );
  }
}

// Create a lightweight version of chat creation that doesn't block
async function quickCreateChat(userId: string, agentId?: string) {
  const startTime = Date.now();
  try {
    const result = await prisma.chatNewVersion.create({
      data: {
        userId,
        messages: [], // Start with empty messages
        agentId: agentId || null,
        createdAt: new Date(),
        totalResponseTime: 0,
        messageResponseTimes: [],
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      select: {
        id: true, // Only select the ID for quick return
      },
    });
    const duration = Date.now() - startTime;
    console.log(`DB Operation - quickCreateChat: ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `DB Operation Failed - quickCreateChat: ${duration}ms`,
      error,
    );
    throw error;
  }
}

// Sanitize messages before storing to DB/Redis:
// - Merge assistant and tool messages into a single assistant message turn
// - Convert tool-call/result parts into consolidated tool-invocation parts (v4 style)
// - Prepend step-start to all tool invocations
// - Strip providerOptions from ALL parts
// - Limit reasoning steps to first 10 + final answer
// - Remove duplicate consecutive text parts
function sanitizeMessagesForStorage(messages: any[]): any[] {
  const result: any[] = [];
  const normalized = normalizeMessagesToParts(messages);

  // Map all tool results by toolCallId for easier merging
  // AI SDK 5.0: Tool results can be in "tool" role messages OR embedded in assistant messages
  const toolResults = new Map<string, any>();
  normalized.forEach((msg) => {
    // Check "tool" role messages
    if (msg.role === "tool") {
      (msg.parts || []).forEach((part: any) => {
        const id = part.toolCallId || part.toolInvocation?.toolCallId || part.id;
        if (id) {
          toolResults.set(id, part);
        }
      });
    }
    // Also check assistant messages for AI SDK 5.0 format (tool-{name} parts with output)
    if (msg.role === "assistant") {
      (msg.parts || []).forEach((part: any) => {
        // SDK 5.0: Parts like tool-{name} with state: "output-available" and output
        if (part.type?.startsWith("tool-") &&
            part.type !== "tool-invocation" &&
            (part.state === "output-available" || part.output)) {
          const id = part.toolCallId || part.id;
          if (id && part.output) {
            toolResults.set(id, {
              ...part,
              result: part.output, // Normalize to 'result' for consistency
            });
          }
        }
        // Also check tool-result parts
        if (part.type === "tool-result") {
          const id = part.toolCallId || part.id;
          if (id) {
            toolResults.set(id, part);
          }
        }
      });
    }
  });

  const isBigQueryTool = (toolName: string, res: any, args: any) => {
    const name = (toolName || "").toLowerCase();
    const isKeywordMatch = 
      name.includes("bigquery") ||
      name.includes("inventory") ||
      name.includes("warehouse") ||
      name.includes("stock") ||
      name.includes("knowledge") ||
      name.includes("embedding") ||
      name.includes("research") ||
      name.includes("query");

    const hasBigQueryResultFields = !!(
      res?.originalSqlCommand ||
      args?.sqlCommand ||
      res?.executedQuery ||
      args?.executedQuery ||
      res?.databaseZone ||
      args?.databaseZone ||
      res?.sql_command ||
      args?.sql_command ||
      res?.toolId ||
      args?.toolId
    );

    return isKeywordMatch || hasBigQueryResultFields;
  };

  // Helper to extract tool metadata from various AI SDK formats (v4 and v5.0)
  const getToolMetadata = (part: any) => {
    // AI SDK 5.0 uses 'id' for toolCallId and 'name' for toolName
    const toolCallId = part.toolCallId || part.id || part.toolInvocation?.toolCallId || "";
    let toolName = part.toolName || part.name || part.toolInvocation?.toolName || "";

    // Fallback: extract tool name from type (e.g., "tool-google_search" -> "google_search")
    if (!toolName && part.type?.startsWith("tool-") && !["tool-invocation", "tool-call", "tool-result"].includes(part.type)) {
      toolName = part.type.replace("tool-", "");
    }

    const args = part.input || part.args || part.toolInvocation?.args || {};
    const res = part.output || part.result || part.content || part.toolInvocation?.result;

    return { toolCallId, toolName, args, result: res };
  };

  for (let i = 0; i < normalized.length; i++) {
    const message = normalized[i];
    if (message.role === "tool") continue;

    if (message.role === "user") {
      const cleanedParts = (message.parts || []).map(({ providerOptions, ...rest }: any) => rest);
      result.push({ ...message, parts: cleanedParts });
      continue;
    }

    if (message.role === "assistant") {
      let mergedParts = [...(message.parts || [])];
      
      // Look ahead to merge consecutive assistant messages or skip intermediate tool messages
      let j = i + 1;
      while (j < normalized.length) {
        if (normalized[j].role === "assistant") {
          mergedParts = [...mergedParts, ...(normalized[j].parts || [])];
          j++;
        } else if (normalized[j].role === "tool") {
          j++;
        } else {
          break;
        }
      }
      i = j - 1;

      let toolCount = 0;
      const finalParts: any[] = [];
      const seenTexts = new Set<string>();

      mergedParts.forEach((part: any) => {
        if (part.type === "text") {
          if (seenTexts.has(part.text)) return;
          seenTexts.add(part.text);
          finalParts.push(part);
          return;
        }
        
        if (part.type === "step-start") return;
        if (part.type === "tool-result") return; // Handled by merging with call

        const meta = getToolMetadata(part);
        let currentResult = meta.result;
        let currentState = (part.state === "output-available" || !!currentResult) ? "result" : "call";

        // Try to find result in map if not already present
        if (currentState === "call" && meta.toolCallId && toolResults.has(meta.toolCallId)) {
          const resPart = toolResults.get(meta.toolCallId);
          currentResult = resPart.result || resPart.output || resPart.content;
          currentState = "result";
        }

        // Also try to find result by matching toolName if toolCallId didn't work
        if (currentState === "call" && meta.toolName) {
          // Look for matching result in the toolResults map by toolName
          for (const [, resPart] of toolResults) {
            const resToolName = resPart.toolName || resPart.name ||
              (resPart.type?.startsWith("tool-") ? resPart.type.replace("tool-", "") : "");
            if (resToolName === meta.toolName && (resPart.result || resPart.output)) {
              currentResult = resPart.result || resPart.output || resPart.content;
              currentState = "result";
              console.log(`🔄 Matched tool result by name: ${meta.toolName}`);
              break;
            }
          }
        }

        // Last resort: check if any part in mergedParts has the result for this tool
        if (currentState === "call" && meta.toolName) {
          for (const otherPart of mergedParts) {
            if (otherPart === part) continue;
            const otherToolName = otherPart.toolName || otherPart.name ||
              (otherPart.type?.startsWith("tool-") ? otherPart.type.replace("tool-", "") : "") ||
              otherPart.toolInvocation?.toolName;
            if (otherToolName === meta.toolName && (otherPart.output || otherPart.result)) {
              currentResult = otherPart.output || otherPart.result;
              currentState = "result";
              console.log(`🔄 Found result in mergedParts for: ${meta.toolName}`);
              break;
            }
          }
        }

        const isBigQuery = isBigQueryTool(meta.toolName, currentResult, meta.args);

        // Limit reasoning steps
        if (meta.toolName === "addReasoningStep") {
          const reasoningSteps = mergedParts.filter(p => {
             const m = getToolMetadata(p);
             return m.toolName === "addReasoningStep";
          });
          const currentReasoningIndex = reasoningSteps.findIndex(p => p === part);
          const isFinalStep = meta.args?.nextStep === "finalAnswer" || currentResult?.nextStep === "finalAnswer";

          if (currentReasoningIndex >= 10 && !isFinalStep) return;
        }

        // Debug logging for BigQuery tools to diagnose storage issues
        if (isBigQuery) {
          console.log(`🔍 Storing BigQuery tool: ${meta.toolName}`, {
            toolCallId: meta.toolCallId,
            state: currentState,
            hasResult: !!currentResult,
            resultKeys: currentResult ? Object.keys(currentResult) : [],
            hasOriginalSqlCommand: !!currentResult?.originalSqlCommand,
            hasToolId: !!currentResult?.toolId,
            hasDatabaseZone: !!currentResult?.databaseZone,
            argsKeys: Object.keys(meta.args || {}),
          });
        }

        const toolInvocationPart = {
          type: "tool-invocation",
          isBigQuery,
          toolInvocation: {
            toolCallId: meta.toolCallId || "unknown",
            toolName: meta.toolName || "unknown",
            args: meta.args,
            state: currentState,
            result: currentResult,
            step: toolCount++,
            isBigQuery,
          }
        };

        finalParts.push({ type: "step-start" });
        finalParts.push(toolInvocationPart);
      });

      const cleanedParts = finalParts.map(({ providerOptions, ...rest }: any) => rest);
      if (cleanedParts.length > 0) {
        result.push({ ...message, parts: cleanedParts });
      }
    }
  }
  return result;
}

// Update chat messages in the background
// AI SDK 5.0: Token usage properties renamed (promptTokens -> inputTokens, completionTokens -> outputTokens)
async function updateChatMessages(
  chatId: string,
  messages: UIMessage[],
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  },
) {
  const startTime = Date.now();
  try {
    const filteredMessages = sanitizeMessagesForStorage(messages);

    await prisma.chatNewVersion.update({
      where: { id: chatId },
      data: {
        messages: filteredMessages as unknown as Prisma.JsonArray,
        promptTokens: usage?.inputTokens ?? 0,
        completionTokens: usage?.outputTokens ?? 0,
        totalTokens: usage?.totalTokens ?? 0,
      },
    });
    const duration = Date.now() - startTime;
    console.log(`DB Operation - updateChatMessages: ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `DB Operation Failed - updateChatMessages: ${duration}ms`,
      error,
    );
  }
}

// NEW: Create chat and sync with Redis
async function createChatWithRedis(
  userId: string,
  agentId?: string,
): Promise<string> {
  const startTime = Date.now();
  console.log("🚀 createChatWithRedis started:", {
    userId,
    agentId,
    timestamp: new Date().toISOString(),
  });

  try {
    // Create chat in database first
    const dbCreateStart = Date.now();
    const newChat = await quickCreateChat(userId, agentId);
    const chatId = newChat.id;
    const dbCreateTime = Date.now() - dbCreateStart;

    console.log("✅ Database chat creation completed:", {
      chatId,
      dbCreateTime: dbCreateTime + "ms",
    });

    // Sync with Redis (non-blocking)
    const redisChatData: RedisChatData = {
      id: chatId,
      userId: userId,
      agentId: agentId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalResponseTime: 0,
      },
    };

    console.log("🔄 Attempting Redis sync for new chat:", {
      chatId,
      redisChatDataStructure: Object.keys(redisChatData),
    });

    // Store in Redis (don't await to avoid blocking)
    const redisPromise = RedisChatService.setChat(redisChatData);

    redisPromise
      .then(() => {
        console.log("✅ Redis sync successful for new chat:", {
          chatId,
          syncTime: Date.now() - startTime + "ms",
        });
      })
      .catch((error) => {
        console.error("❌ Redis sync failed for new chat:", {
          chatId,
          error: error instanceof Error ? error.message : String(error),
          syncTime: Date.now() - startTime + "ms",
        });
      });

    const duration = Date.now() - startTime;
    console.log(`✅ createChatWithRedis completed:`, {
      chatId,
      totalTime: duration + "ms",
      dbTime: dbCreateTime + "ms",
      redisInitiated: true,
    });

    return chatId;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ createChatWithRedis failed:`, {
      totalTime: duration + "ms",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// NEW: Update chat in both database and Redis
// AI SDK 5.0: Token usage properties renamed (promptTokens -> inputTokens, completionTokens -> outputTokens)
async function updateChatWithRedis(
  chatId: string,
  messages: UIMessage[],
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  },
  topic?: string,
): Promise<void> {
  const startTime = Date.now();
  console.log("🔄 updateChatWithRedis started:", {
    chatId,
    messageCount: messages.length,
    hasUsage: !!usage,
    hasTopic: !!topic,
    timestamp: new Date().toISOString(),
  });

  try {
    // Update database (blocking)
    const dbUpdateStart = Date.now();
    await updateChatMessages(chatId, messages, usage);
    const dbUpdateTime = Date.now() - dbUpdateStart;

    console.log("✅ Database update completed:", {
      chatId,
      dbUpdateTime: dbUpdateTime + "ms",
    });

    // Update Redis (non-blocking)
    const redisUpdatePromise = RedisChatService.updateChatMessages(
      chatId,
      messages,
      {
        promptTokens: usage?.inputTokens,
        completionTokens: usage?.outputTokens,
        totalTokens: usage?.totalTokens,
      },
    );

    redisUpdatePromise
      .then(() => {
        console.log("✅ Redis message update successful:", {
          chatId,
          messageCount: messages.length,
          updateTime: Date.now() - startTime + "ms",
        });
      })
      .catch((error) => {
        console.error("❌ Redis message update failed:", {
          chatId,
          error: error instanceof Error ? error.message : String(error),
          updateTime: Date.now() - startTime + "ms",
        });
      });

    // If topic is provided, also update it in Redis
    if (topic) {
      console.log("🔄 Updating topic in Redis:", { chatId, topic });

      const topicUpdatePromise = RedisChatService.getChat(chatId).then(
        (existingChat) => {
          if (existingChat) {
            const updatedChat: RedisChatData = {
              ...existingChat,
              topic,
              messages,
              updatedAt: new Date().toISOString(),
            };
            return RedisChatService.setChat(updatedChat);
          }
        },
      );

      topicUpdatePromise
        .then(() => {
          console.log("✅ Redis topic update successful:", {
            chatId,
            topic,
            updateTime: Date.now() - startTime + "ms",
          });
        })
        .catch((error) => {
          console.error("❌ Redis topic update failed:", {
            chatId,
            topic,
            error: error instanceof Error ? error.message : String(error),
            updateTime: Date.now() - startTime + "ms",
          });
        });
    }

    const totalTime = Date.now() - startTime;
    console.log("✅ updateChatWithRedis completed:", {
      chatId,
      totalTime: totalTime + "ms",
      dbTime: dbUpdateTime + "ms",
      redisInitiated: true,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("❌ updateChatWithRedis failed:", {
      chatId,
      totalTime: totalTime + "ms",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStartTime = Date.now();
  console.log(
    `Setting request timeout for ${msToSeconds(
      SERVER_TIMEOUT,
    )} seconds (${SERVER_TIMEOUT}ms)`,
  );

  const controller = new AbortController();
  const { signal } = controller;
  const timeoutId = setTimeout(() => {
    console.log("SERVER TIMEOUT TRIGGERED - ABORTING REQUEST");
    try {
      controller.abort();
      console.log("Request aborted successfully");
    } catch (err) {
      console.error("Error while aborting request:", err);
    }
  }, SERVER_TIMEOUT);

  const session = await auth();
  if (!session?.user) {
    console.log("Unauthorized request");
    clearTimeout(timeoutId);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authTime = Date.now() - requestStartTime;
  console.log(`Auth check completed in: ${authTime}ms`);

  const parseStartTime = Date.now();
  const {
    messages,
    selectedModelId = "gemini-2.5-flash",
    isReasoningEnabled = true,
    activeChatId,
    agentId,
  }: {
    messages: Array<UIMessage>;
    selectedModelId?: modelID;
    isReasoningEnabled?: boolean;
    activeChatId?: string;
    agentId?: string;
  } = await request.json();

  const parseTime = Date.now() - parseStartTime;
  console.log(`Request parsing completed in: ${parseTime}ms`);

  // Ensure model exists
  if (!selectedModelId || !myProvider.languageModel) {
    clearTimeout(timeoutId);
    return new Response("Invalid model configuration", { status: 400 });
  }

  try {
    // Reset reasoning counter at the start of each request
    resetReasoningCounter();

    // Get or create chat ID with conditional Redis integration
    let chatId = activeChatId;
    const dbStartTime = Date.now();

    if (!chatId) {
      if (USING_REDIS) {
        console.log("🚀 Creating new chat with Redis sync...");
        chatId = await createChatWithRedis(session.user.id, agentId);
      } else {
        console.log("📦 Creating new chat with database only...");
        const newChat = await quickCreateChat(session.user.id, agentId);
        chatId = newChat.id;
      }

      const dbTime = Date.now() - dbStartTime;
      console.log(
        `✅ New chat created in: ${dbTime}ms with ID: ${chatId}, Redis: ${USING_REDIS}`,
      );
    }

    // Update messages in the background without blocking the response
    if (chatId) {
      const bgUpdateStartTime = Date.now();

      // Choose update method based on USING_REDIS flag
      const updatePromise = USING_REDIS
        ? updateChatWithRedis(chatId, messages)
        : updateChatMessages(chatId, messages);

      updatePromise
        .then(() => {
          const bgUpdateTime = Date.now() - bgUpdateStartTime;
          console.log(
            `Background message update with ${
              USING_REDIS ? "Redis" : "DB only"
            } completed in: ${bgUpdateTime}ms`,
          );
        })
        .catch((err) => {
          const bgUpdateTime = Date.now() - bgUpdateStartTime;
          console.error(
            `Background message update with ${
              USING_REDIS ? "Redis" : "DB only"
            } failed after ${bgUpdateTime}ms:`,
            err,
          );
        });
    }

    const setupStartTime = Date.now();
    // Set up tools with organization context
    const dynamicTools: any = await loadToolsFromDatabase(agentId || "");
    const agentData = await getCachedAgentSystemInstructions(agentId || "");

    const mcpTools: Record<string, any> = {};
    try {
      const client = new ToolboxClient("http://36.91.92.17:5000");
      const toolboxTools = await client.loadToolset("my-toolset");

      toolboxTools.forEach((toolboxTool: any) => {
        if (!toolboxTool.toolName.includes("search-entry-for-ppn-vendor")) {
          mcpTools[toolboxTool.toolName] = {
            description: toolboxTool.getDescription(),
            parameters: toolboxTool.getParamSchema(),
            execute: toolboxTool,
          };
        }
      });
    } catch (err) {
      console.error("Error loading toolbox tools:", err);
    }

    const toolsToUse = getTools(
      isReasoningEnabled,
      selectedModelId,
      true,
      { ...dynamicTools.tools, ...mcpTools },
      session.user.organizationId,
      undefined,
      agentData.imageGenerationEnabled ?? true,
    );

    const allSystemInstructions = [
      ...(agentData.instructions || []),
      ...(dynamicTools.extraSystemInstructions || []),
    ];

    const systemMessage = getSystemMessage(
      isReasoningEnabled,
      true,
      [
        ...allSystemInstructions,
        // Add this instruction to prevent getting stuck
        "IMPORTANT: After reasoning, always provide a clear, direct answer to the user's question. Do not end with reasoning steps alone.",
        "When using reasoning steps, limit yourself to 3-5 steps maximum, then provide your final answer.",
      ],
      undefined,
      undefined,
      agentData.imageGenerationEnabled ?? true,
    );

    const setupTime = Date.now() - setupStartTime;
    console.log(`Tools setup completed in: ${setupTime}ms`);

    const startTime = Date.now();

    const streamStartTime = Date.now();
    console.log(
      `Starting AI stream at: ${
        streamStartTime - requestStartTime
      }ms from request start`,
    );

    // Start streaming with organization context passed to tools
    const stream = streamText({
      system: systemMessage,
      model: myProvider.languageModel(selectedModelId),
      stopWhen: stepCountIs(10),
      temperature: agentData.temperature || 0.7,
      tools: toolsToUse,
      toolChoice: "auto",
      messages: convertToModelMessages(await preprocessMessages(messages)),
      abortSignal: signal,
      experimental_transform: smoothStream({
        delayInMs: 20, // optional: defaults to 10ms
        chunking: "word", // optional: defaults to 'word'
      }),

      async onFinish({ response, totalUsage: usage, finishReason }) {
        clearTimeout(timeoutId);
        console.log(`Stream finished with reason: ${finishReason}`);

        // Reset reasoning counter after completion
        resetReasoningCounter();

        // Handle database updates in the background with conditional Redis sync
        (async () => {
          const finishStartTime = Date.now();
          console.log(
            `onFinish handler started after: ${
              finishStartTime - streamStartTime
            }ms from stream start`,
          );

          try {
            if (!chatId) {
              console.error("No chat ID available for final update");
              return;
            }

            // Get current chat data
            const fetchStartTime = Date.now();
            const currentChat = await prisma.chatNewVersion.findUnique({
              where: { id: chatId },
              select: {
                promptTokens: true,
                completionTokens: true,
                totalTokens: true,
                totalResponseTime: true,
                topic: true,
              },
            });
            const fetchTime = Date.now() - fetchStartTime;
            console.log(`DB Operation - fetchCurrentChat: ${fetchTime}ms`);

            if (!currentChat) {
              console.error("Chat not found for final update:", chatId);
              return;
            }

            // AI SDK 5.0: appendResponseMessages removed, use array concatenation
            // Debug: Log response messages to diagnose tool result storage
            console.log("📥 Response messages count:", response.messages.length);
            response.messages.forEach((msg: any, idx: number) => {
              const parts = msg.parts || msg.content || [];
              const toolParts = (Array.isArray(parts) ? parts : []).filter((p: any) =>
                p.type?.startsWith("tool-") || p.type === "tool-call" || p.type === "tool-result"
              );
              if (toolParts.length > 0) {
                console.log(`  [${idx}] ${msg.role} - ${toolParts.length} tool parts:`);
                toolParts.forEach((p: any, pIdx: number) => {
                  const toolName = p.toolName || p.name || (p.type?.startsWith("tool-") ? p.type.replace("tool-", "") : "?");
                  console.log(`    [${pIdx}] ${p.type} - ${toolName}:`, {
                    state: p.state,
                    hasOutput: !!p.output,
                    hasResult: !!p.result,
                    outputKeys: p.output ? Object.keys(p.output) : [],
                    resultKeys: p.result ? Object.keys(p.result) : [],
                    hasOriginalSqlCommand: !!p.output?.originalSqlCommand || !!p.result?.originalSqlCommand,
                    originalSqlCommandPreview: (p.output?.originalSqlCommand || p.result?.originalSqlCommand || "").substring(0, 100),
                    // Log raw output for BigQuery tools
                    ...(toolName.toLowerCase().includes("warehouse") || toolName.toLowerCase().includes("inventory")
                      ? { rawOutputSample: JSON.stringify(p.output || p.result || {}).substring(0, 300) }
                      : {}),
                  });
                });
              }
            });

            // Normalize messages to use 'parts' format, then sanitize for storage
            const finalMessages = sanitizeMessagesForStorage(
              normalizeMessagesToParts([...messages, ...response.messages]),
            );

            let topic = currentChat.topic;
            console.log("Current topic from DB:", topic);

            if (!topic) {
              console.log("Generating new topic...");
              try {
                topic = generateSimpleTopicFromMessages(finalMessages);
                console.log("Generated topic:", topic);
              } catch (error) {
                console.error("Topic generation failed:", error);
                topic = "New Chat";
              }
            } else {
              console.log("Using existing topic:", topic);
            }

            // Calculate response time
            const responseTime = Date.now() - startTime;

            console.log("Saving to database and conditionally to Redis...");

            if (USING_REDIS) {
              // Update database and Redis
              const updateStartTime = Date.now();
              await prisma.chatNewVersion.update({
                where: { id: chatId },
                data: {
                  messages: finalMessages as unknown as Prisma.JsonArray,
                  topic: topic,
                  promptTokens:
                    (currentChat.promptTokens || 0) + (usage?.inputTokens || 0),
                  completionTokens:
                    (currentChat.completionTokens || 0) +
                    (usage?.outputTokens || 0),
                  totalTokens:
                    (currentChat.totalTokens || 0) + (usage?.totalTokens || 0),
                  totalResponseTime:
                    (currentChat.totalResponseTime || 0) + responseTime,
                  messageResponseTimes: [
                    {
                      messageIndex: messages.length - 1,
                      responseTime: responseTime,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                },
              });

              const updateTime = Date.now() - updateStartTime;
              console.log(`DB update completed in: ${updateTime}ms`);

              // Update Redis with complete chat data (non-blocking)
              const redisUpdateStartTime = Date.now();
              const existingRedisChat = await RedisChatService.getChat(chatId);

              if (existingRedisChat) {
                const updatedRedisChatData: RedisChatData = {
                  ...existingRedisChat,
                  // AI SDK 5.0: Cast to UIMessage[] as response messages are structurally compatible
                  messages: finalMessages as UIMessage[],
                  topic: topic,
                  updatedAt: new Date().toISOString(),
                  metadata: {
                    promptTokens:
                      (currentChat.promptTokens || 0) +
                      (usage?.inputTokens || 0),
                    completionTokens:
                      (currentChat.completionTokens || 0) +
                      (usage?.outputTokens || 0),
                    totalTokens:
                      (currentChat.totalTokens || 0) +
                      (usage?.totalTokens || 0),
                    totalResponseTime:
                      (currentChat.totalResponseTime || 0) + responseTime,
                  },
                };

                RedisChatService.setChat(updatedRedisChatData)
                  .then(() => {
                    const redisUpdateTime = Date.now() - redisUpdateStartTime;
                    console.log(
                      `✅ Redis update completed in: ${redisUpdateTime}ms`,
                    );
                  })
                  .catch((error) => {
                    console.error(
                      "Error updating final chat data in Redis:",
                      error,
                    );
                  });
              }

              console.log("Final chat update complete with Redis:", {
                chatId,
                messageCount: messages.length,
                responseTime,
                tokens: usage?.totalTokens || 0,
                redisEnabled: true,
              });
            } else {
              // Database only update
              const updateStartTime = Date.now();
              await prisma.chatNewVersion.update({
                where: { id: chatId },
                data: {
                  messages: finalMessages as unknown as Prisma.JsonArray,
                  topic: topic,
                  promptTokens:
                    (currentChat.promptTokens || 0) + (usage?.inputTokens || 0),
                  completionTokens:
                    (currentChat.completionTokens || 0) +
                    (usage?.outputTokens || 0),
                  totalTokens:
                    (currentChat.totalTokens || 0) + (usage?.totalTokens || 0),
                  totalResponseTime:
                    (currentChat.totalResponseTime || 0) + responseTime,
                  messageResponseTimes: [
                    {
                      messageIndex: messages.length - 1,
                      responseTime: responseTime,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                },
              });

              const updateTime = Date.now() - updateStartTime;
              console.log(`DB-only update completed in: ${updateTime}ms`);

              console.log("Final chat update complete (DB only):", {
                chatId,
                messageCount: messages.length,
                responseTime,
                tokens: usage?.totalTokens || 0,
                redisEnabled: false,
              });
            }

            const totalFinishTime = Date.now() - finishStartTime;
            console.log("Final chat update complete:", {
              chatId,
              messageCount: messages.length,
              responseTime,
              tokens: usage?.totalTokens || 0,
              totalFinishHandlerTime: totalFinishTime,
              redisUsed: USING_REDIS,
            });

            // Log chat creation or update audit logs
            try {
              const isNewChat = !activeChatId;
              if (isNewChat && chatId) {
                // Get agent information if available
                let agentName = "Unknown Agent";
                if (agentId) {
                  const agent = await prisma.agent.findUnique({
                    where: { id: agentId },
                    select: { agentName: true },
                  });
                  agentName = agent?.agentName || "Unknown Agent";
                }

                await logChatAction(
                  session.user.id,
                  session.user.email || "unknown",
                  session.user.name || "Unknown User",
                  AuditAction.CHAT_HISTORY,
                  chatId,
                  request,
                  {
                    topic: topic || "New Chat",
                    messageCount: finalMessages.length,
                    agentId: agentId || null,
                    agentName: agentName,
                    totalTokens:
                      (currentChat.totalTokens || 0) +
                      (usage?.totalTokens || 0),
                    promptTokens:
                      (currentChat.promptTokens || 0) +
                      (usage?.inputTokens || 0),
                    completionTokens:
                      (currentChat.completionTokens || 0) +
                      (usage?.outputTokens || 0),
                    responseTime:
                      (currentChat.totalResponseTime || 0) + responseTime,
                    timestamp: new Date().toISOString(),
                  },
                  true,
                );
                console.log("Chat creation logged to audit logs:", chatId);
              } else if (chatId) {
                // Update existing audit log with latest message count and token usage
                await updateChatAuditLog(chatId, {
                  messageCount: finalMessages.length,
                  totalTokens:
                    (currentChat.totalTokens || 0) + (usage?.totalTokens || 0),
                  promptTokens:
                    (currentChat.promptTokens || 0) + (usage?.inputTokens || 0),
                  completionTokens:
                    (currentChat.completionTokens || 0) +
                    (usage?.outputTokens || 0),
                  responseTime:
                    (currentChat.totalResponseTime || 0) + responseTime,
                  timestamp: new Date().toISOString(),
                });
                console.log("Audit log updated for chat:", chatId);
              }
            } catch (auditError) {
              console.error(
                "Error logging/updating chat audit log:",
                auditError,
              );
            }
          } catch (error) {
            console.error("Error in onFinish background task:", error);
          }
        })();
      },
    });

    // to check if system include history previous prompt
    console.log(
      "count of char in system message in stream text:",
      systemMessage.length,
    );
    console.log("messages:", await preprocessMessages(messages));

    const streamSetupTime = Date.now() - streamStartTime;
    console.log(`Stream setup completed in: ${streamSetupTime}ms`);

    // Return the stream with the chat ID and organization context in headers
    const responseStartTime = Date.now();
    const response = stream.toUIMessageStreamResponse({
      headers: {
        "x-chat-id": chatId || "unknown",
        "x-organization-id": session.user.organizationId,
        "x-data-source": USING_REDIS ? "redis" : "database",
        "x-redis-enabled": USING_REDIS.toString(),
      },
      onError: (e: any) => {
        console.log("Error in stream:", e);
        clearTimeout(timeoutId);

        if (e.name === "AbortError") {
          return `Timeout: The response took too long to generate (${msToSeconds(
            SERVER_TIMEOUT,
          )}s). Please try a simpler query or break your question into smaller parts.`;
        }

        return `An error occurred, please try again! ${e.message}`;
      },
    });

    const totalSetupTime = responseStartTime - requestStartTime;
    console.log(
      `Total setup time before streaming response: ${totalSetupTime}ms`,
    );

    return response;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    // Reset reasoning counter on error
    resetReasoningCounter();

    console.error("Streaming error:", error);
    return new Response("Error processing request", { status: 500 });
  }
}
