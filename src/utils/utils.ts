import { env } from "@/env.mjs";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  ModelMessage,
  CoreToolMessage,
  generateId,
  UIMessage,
  streamText,
} from "ai";

// AI SDK 5.0: ToolInvocation is no longer exported, define locally
type ToolInvocation = {
  state: "input-available" | "output-available" | "streaming";
  toolCallId: string;
  toolName: string;
  input?: unknown;
  output?: unknown;
};
// import crypto from "crypto"

import { State } from "@/stores/basemodel";
import { Action } from "@/types";
import { BookOpen, Bot, Calendar, MessageSquare } from "lucide-react";
import { myProvider } from "@/lib/models";
import { KeyValueObject } from "./dynamicFunction";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function absoluteUrl(path: string) {
  return `${env.NEXT_PUBLIC_APP_URL}${path}`;
}

export function truncate(str: string, length: number) {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

export function convertToFormData(payload: any): FormData {
  const formData = new FormData();

  const sanitizeName = (name: string) => {
    return name
      .replace(/[^a-zA-Z0-9.]/g, "_") // Replace non-alphanumeric (except dots) with underscores
      .replace(/_+/g, "_"); // Merge multiple underscores
  };

  for (const key in payload) {
    if (key === "credentialFile" && payload[key] instanceof File) {
      const file = payload[key] as File;
      const sanitizedFile = new File([file], sanitizeName(file.name), {
        type: file.type,
      });
      formData.append("file", sanitizedFile);
    } else if (key === "document" && Array.isArray(payload[key])) {
      payload[key].forEach((data: any) => {
        if (data instanceof File) {
          const sanitizedFile = new File([data], sanitizeName(data.name), {
            type: data.type,
          });
          formData.append(`files`, sanitizedFile);
        }
      });
    } else if (key === "files" && Array.isArray(payload[key])) {
      payload[key].forEach((data: any) => {
        if (data instanceof File) {
          const sanitizedFile = new File([data], sanitizeName(data.name), {
            type: data.type,
          });
          formData.append(`files`, sanitizedFile);
        }
      });
    } else {
      formData.append(key, payload[key]);
    }
  }

  return formData;
}


export function mergeJsonArray(jsonArray: any[]) {
  return Object.assign({}, ...jsonArray);
}

export interface ActionExtension<T> extends Action<T> {
  getListWith: (obj: { offset: number; limit: number }) => void;
}

export async function getData<T>(
  url: string,
  set: (state: Partial<State<T>>) => void,
  get: () => State<T>,
  dataKey?: keyof State<T>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  customDataKeyResponse: boolean = false,
  customHeaders?: HeadersInit | undefined,
): Promise<T> {
  set({ loading: true });

  return await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...customHeaders,
    },
  })
    .then(async (res) => await res.json())
    .then((data) => {
      let responseData = data;
      let count = 0;

      // Your FastAPI response structure
      if (data && data.data && data.data.search_options) {
        count = data.data.search_options.total_count;
        responseData = data.data.founds;
      }
      // Alternative handling for other response formats
      else if (data && data.totals !== undefined) {
        console.log("enter this part");
        count = data.totals;
        responseData = data.data || data;
      }
      // If data has a 'data' property, use that
      else if (data && data.data) {
        responseData = data.data;
      }

      if (dataKey) {
        set({ success: true, [dataKey]: responseData, count: count });
      } else {
        set({ success: true, data: responseData, count: count });
      }

      return dataKey ? responseData : data;
    })
    .catch((err) => {
      set({ error: true, errorData: err });
      throw err;
    })
    .finally(() => set({ loading: false }));
}

export async function postData<T>(
  url: string,
  obj: T,
  set: (state: Partial<State<T>>) => void,
  get: () => State<T>,
  customHeaders?: HeadersInit | undefined,
): Promise<T> {
  set({ loading: true });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...customHeaders,
      },
      body: JSON.stringify(obj),
    });

    const data = await response.json();
    if (!response.ok) {
      set({
        loading: false,
        error: true,
        errorData: data.data,
      });
    } else {
      set({ loading: false, data: [data.data, ...get().data] });
    }
    return data.data;
  } catch (err) {
    set({
      loading: false,
      error: true,
      errorData: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }
}
export async function postDataMultipart<T>(
  url: string,
  formData: FormData,
  set: (state: Partial<State<T>>) => void,
  get: () => State<T>,
  customHeaders?: HeadersInit | undefined,
): Promise<T> {
  set({ loading: true });

  try {
    const response = await fetch(url, {
      method: "POST",
      body: formData,
      headers: {
        ...customHeaders,
      },
    });

    const data = await response.json();
    set({ loading: false, data: [...get().data, data.data] });
    return data.data;
  } catch (err) {
    set({
      loading: false,
      error: true,
      errorData: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }
}
export async function putDataMultipart<T>(
  url: string,
  formData: FormData,
  set: (state: Partial<State<T>>) => void,
  get: () => State<T>,
  customHeaders?: HeadersInit | undefined,
): Promise<T> {
  set({ loading: true });

  try {
    const response = await fetch(url, {
      method: "PUT",
      body: formData,
      headers: {
        ...customHeaders,
      },
    });

    const data = await response.json();

    const updatedData = get().data.map((currData: any) =>
      currData.id === data.data.id ? data.data : currData,
    );

    set({ loading: false, data: updatedData });
    return data.data;
  } catch (err) {
    set({
      loading: false,
      error: true,
      errorData: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }
}

export async function putData<T>(
  url: string,
  obj: T,
  set: (state: Partial<State<T>>) => void,
  get: () => State<T>,
  customHeaders?: HeadersInit | undefined,
): Promise<T> {
  set({ loading: true });

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...customHeaders,
      },
      body: JSON.stringify(obj),
    });

    const data = await response.json();

    // Only update the data array if we have data and obj has an id
    if (get().data && (obj as any)?.id) {
      const updatedDatasources = get().data.map((currData: any) =>
        currData.id === (obj as any).id ? data.data : currData,
      );
      set({ loading: false, data: updatedDatasources });
    } else {
      set({ loading: false });
    }
    return data.data;
  } catch (err) {
    set({
      loading: false,
      error: true,
      errorData: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  } finally {
    set({ loading: false });
  }
}

export async function deleteData<T>(
  url: string,
  id: string | number,
  set: (state: Partial<State<T>>) => void,
  get: () => State<T>,
  customHeaders?: HeadersInit | undefined,
): Promise<T[]> {
  return await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...customHeaders,
    },
  })
    .then(() => {
      const updatedDatasources = get().data.filter(
        (datasource: any) => datasource.id !== id,
      );
      set({ success: true, data: updatedDatasources });
      return updatedDatasources;
    })
    .catch((err) => {
      set({ error: true, errorData: err });
      return err;
    })
    .finally(() => set({ loading: false }));
}

export async function updateData<T>(
  url: string,
  obj: T,
  set: (state: Partial<State<T>>) => void,
  get: () => State<T>,
): Promise<T> {
  set({ loading: true });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(obj),
    });

    const data = await response.json();

    const updatedDatasources = get().data.map((currData: any) =>
      currData.id === (obj as any).id ? data.data : currData,
    );
    set({ loading: false, data: updatedDatasources });
    return data.data;
  } catch (err) {
    set({
      loading: false,
      error: true,
      errorData: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  } finally {
    set({ loading: false });
  }
}

export async function postDataFormUpload<Data>(
  url: string,
  obj: Data,
  extensionType: string,
  description: string,
  agentId: string | null,
  file: File | null,
  set: (state: Partial<State<Data>>) => void,
  get: () => State<Data>,
): Promise<Data> {
  set({ loading: true });

  try {
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    if (extensionType) {
      formData.append("fileType", extensionType);
    }
    if (description) {
      formData.append("description", description);
    }

    if (agentId) {
      formData.append("agentId", agentId);
    }

    const formResponse = await fetch(`${url}`, {
      method: "POST",
      body: formData,
    });

    const data = await formResponse.json();

    set({ loading: false, data: [...get().data, data.data] });
    return obj;
  } catch (err) {
    set({
      loading: false,
      error: true,
      errorData: err instanceof Error ? err : new Error(String(err)),
    });
    throw err;
  }
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  );
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper function to extract text content from UIMessage parts (AI SDK 5.0) or legacy content field
function getTextFromMessage(message: any): string {
  // AI SDK 5.0: Try to get text from parts first
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((part: any) => part.type === "text" || part.type === "reasoning")
      .map((part: any) => part.text)
      .join("\n\n");
  }

  // Fallback to legacy content field (AI SDK 4.0)
  if (typeof message.content === "string") {
    return message.content;
  }

  return "";
}

// AI SDK 5.0: Tool invocations are now stored as parts in the parts array
// This function updates tool parts with their results
function addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<UIMessage>;
}): Array<UIMessage> {
  return messages.map((message) => {
    // AI SDK 5.0: Check for tool parts instead of toolInvocations
    const hasToolParts = message.parts?.some(
      (part: any) =>
        part.type?.startsWith("tool-") && part.state === "input-available",
    );

    if (hasToolParts) {
      return {
        ...message,
        parts: message.parts.map((part: any) => {
          if (
            part.type?.startsWith("tool-") &&
            part.state === "input-available"
          ) {
            const toolResult = toolMessage.content.find(
              (tool) => tool.toolCallId === part.toolCallId,
            );

            if (toolResult) {
              return {
                ...part,
                state: "output-available",
                output: toolResult.output,
              };
            }
          }
          return part;
        }),
      };
    }

    return message;
  });
}

export function convertToUIMessages(
  messages: Array<ModelMessage>,
): Array<UIMessage> {
  return messages.reduce((chatMessages: Array<UIMessage>, message) => {
    if (message.role === "tool") {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      });
    }

    let textContent = "";
    // AI SDK 5.0: Tool invocations are now stored as parts, not separate property
    const toolParts: Array<any> = [];

    if (typeof message.content === "string") {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      for (const content of message.content) {
        if (content.type === "text") {
          textContent += content.text;
        } else if (content.type === "tool-call") {
          // AI SDK 5.0: Create tool part with type "tool-{toolName}"
          toolParts.push({
            type: `tool-${content.toolName}` as const,
            state: "input-available",
            toolCallId: content.toolCallId,
            toolName: content.toolName,
            input: content.input,
          });
        }
      }
    }

    // AI SDK 5.0: Create message with parts array (text + tool parts)
    const parts: any[] = [];
    if (textContent) {
      parts.push({
        type: "text" as const,
        text: textContent,
      });
    }
    // Add tool parts to the parts array
    parts.push(...toolParts);

    chatMessages.push({
      id: generateId(),
      role: message.role as "user" | "assistant",
      parts,
    } as UIMessage);

    return chatMessages;
  }, []);
}

export function redirectWithRefresh(path: string) {
  // This ensures we're in a browser environment
  if (typeof window !== "undefined") {
    window.location.href = path;
  } else {
    // Fallback for server-side
    return Response.redirect(new URL(path, "http://localhost"));
  }
}

export const getAgentIcon = (agentName: string) => {
  const name = agentName.toLowerCase();
  if (name.includes("research") || name.includes("knowledge")) return BookOpen;
  if (name.includes("jira") || name.includes("ticket") || name.includes("task"))
    return Calendar;
  if (name.includes("meeting") || name.includes("1:1") || name.includes("chat"))
    return MessageSquare;
  return Bot; // Default icon
};

export const getOrganizationColor = (orgName: string) => {
  // Pre-defined colors for organizations
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-yellow-100 text-yellow-800",
    "bg-indigo-100 text-indigo-800",
  ];

  // Generate consistent index based on org name
  const index =
    orgName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  return colors[index];
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const objectToQueryString = (params: Record<string, any>): string => {
  if (!params || Object.keys(params).length === 0) return "";

  const queryParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === "object") {
        queryParams.append(key, JSON.stringify(value));
      } else {
        queryParams.append(key, String(value));
      }
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : "";
};

export function generateSimpleTopicFromMessages(messages: any[]): string {
  const firstUserMessage = messages.find((msg) => {
    if (msg.role !== "user") return false;
    const textContent = getTextFromMessage(msg);
    return textContent && textContent.trim().length > 0;
  });

  if (!firstUserMessage) {
    return "New Chat";
  }

  return generateSimpleTopic(getTextFromMessage(firstUserMessage));
}

export async function generateAITopicDirect(messages: any[]): Promise<string> {
  try {
    if (!messages || messages.length === 0) {
      return "New Chat";
    }

    // Get recent conversation context (last 5-8 messages or last 1000 chars)
    const recentMessages = getRecentConversationContext(messages);

    if (recentMessages.length === 0) {
      return "New Chat";
    }

    // Build conversation summary for topic generation
    const conversationSummary = buildConversationSummary(recentMessages);

    // Call AI with enhanced prompt
    const result = await streamText({
      model: myProvider.languageModel("gemini-2.5-flash-lite"),
      prompt: `Generate a short, descriptive topic (3-5 words max) for this conversation. Focus on the main subject or current discussion thread. Be concise and capture what the conversation is primarily about:

              Conversation context:
              ${conversationSummary}

              Generate a topic that reflects the current conversation focus:`,
      maxOutputTokens: 25,
    });

    const topicText = await result.text;
    const topic =
      topicText
        ?.trim()
        .replace(/^["']|["']$/g, "")
        .replace(/^Topic:\s*/i, "") || "";

    // Clean and validate the topic
    const cleanTopic = cleanGeneratedTopic(topic);

    return cleanTopic || generateFallbackTopic(recentMessages);
  } catch (error) {
    console.error("Error generating AI topic:", error);
    const recentMessages = getRecentConversationContext(messages);
    return generateFallbackTopic(recentMessages);
  }
}

function getRecentConversationContext(messages: any[]): any[] {
  // Filter valid messages
  const validMessages = messages.filter((msg) => {
    if (!msg.role) return false;
    const textContent = getTextFromMessage(msg);
    return textContent && textContent.trim().length > 0;
  });

  if (validMessages.length === 0) return [];

  // Take recent messages (last 6-8 messages or messages from last 1500 characters)
  const maxMessages = 8;
  const maxChars = 1500;

  const recentMessages = [];
  let totalChars = 0;

  // Start from the end and work backwards
  for (
    let i = validMessages.length - 1;
    i >= 0 && recentMessages.length < maxMessages;
    i--
  ) {
    const msg = validMessages[i];
    const textContent = getTextFromMessage(msg);
    const contentLength = textContent.length;

    if (totalChars + contentLength > maxChars && recentMessages.length > 0) {
      break;
    }

    recentMessages.unshift(msg);
    totalChars += contentLength;
  }

  // Always include at least the first message if we only have recent ones
  if (
    recentMessages.length > 0 &&
    validMessages.length > recentMessages.length
  ) {
    const firstMessage = validMessages[0];
    if (!recentMessages.find((msg) => msg === firstMessage)) {
      // If we have space, add the first message for context
      if (recentMessages.length < maxMessages) {
        recentMessages.unshift(firstMessage);
      }
    }
  }

  return recentMessages;
}

function buildConversationSummary(messages: any[]): string {
  const summary = messages
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      const textContent = getTextFromMessage(msg);
      const content = textContent.substring(0, 200); // Limit each message
      return `${role}: ${content}${textContent.length > 200 ? "..." : ""}`;
    })
    .join("\n\n");

  return summary;
}

function cleanGeneratedTopic(topic: string): string {
  if (!topic) return "";

  // Remove common prefixes/suffixes
  let cleaned = topic
    .replace(/^(Topic:|Subject:|Title:)\s*/i, "")
    .replace(/\.$/, "")
    .trim();

  // Split by common separators and take the first meaningful part
  const parts = cleaned.split(/[:\-–—|]/);
  if (parts.length > 1) {
    cleaned = parts[0].trim();
  }

  // Limit word count (3-5 words ideally)
  const words = cleaned.split(/\s+/).filter((word) => word.length > 0);
  if (words.length > 6) {
    cleaned = words.slice(0, 5).join(" ");
  }

  // Capitalize properly
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();

  return cleaned;
}

function generateFallbackTopic(messages: any[]): string {
  if (!messages || messages.length === 0) {
    return "New Chat";
  }

  // Find the most recent substantial user message
  const userMessages = messages.filter((msg) => {
    if (msg.role !== "user") return false;
    const textContent = getTextFromMessage(msg);
    return textContent && textContent.trim().length > 10;
  });

  if (userMessages.length === 0) {
    return "New Chat";
  }

  // Use the most recent user message for simple topic extraction
  const lastUserMessage = userMessages[userMessages.length - 1];
  return generateSimpleTopic(getTextFromMessage(lastUserMessage));
}

function generateSimpleTopic(content: string): string {
  if (!content || content.trim().length === 0) {
    return "New Chat";
  }

  // Extract key words (avoid common words)
  const text = content.toLowerCase();
  const commonWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "up",
    "about",
    "into",
    "through",
    "during",
    "before",
    "after",
    "above",
    "below",
    "between",
    "among",
    "throughout",
    "despite",
    "towards",
    "upon",
    "concerning",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "its",
    "our",
    "their",
    "this",
    "that",
    "these",
    "those",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "can",
    "shall",
  ]);

  const words = text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !commonWords.has(word))
    .slice(0, 3);

  if (words.length === 0) {
    return "General Discussion";
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// NEW: Dynamic satisfaction messages
export const getSatisfactionMessage = (
  percentage: number,
  totalFeedback: number,
) => {
  if (totalFeedback === 0) {
    return "No feedback received yet";
  }
  if (percentage >= 90) return "Excellent user satisfaction";
  if (percentage >= 80) return "Very good user satisfaction";
  if (percentage >= 70) return "Good user satisfaction";
  if (percentage >= 60) return "Fair user satisfaction";
  return "User satisfaction needs improvement";
};

// NEW: Trend analysis messages
export const getTrendMessage = (trend: number) => {
  if (trend > 5) return "Improving satisfaction";
  if (trend < -5) return "Declining satisfaction";
  return "Stable satisfaction";
};

export function formatSchemaForCodeMirror(
  selectedDatasetBigquery: Record<string, any> | null,
) {
  if (!selectedDatasetBigquery || !selectedDatasetBigquery.tables) return {};
  const schema: Record<string, string[]> = {};
  for (const table of selectedDatasetBigquery.tables) {
    schema[table.table_id] = Array.isArray(table.schema)
      ? table.schema.map((col: any) => col.name)
      : [];
  }
  return schema;
}

/**
 * Detect fields from data and their types
 */
export function detectFieldsFromData(
  data: any,
): Array<{ name: string; type: string; isNumeric: boolean }> {
  if (
    !data?.values ||
    !Array.isArray(data.values) ||
    data.values.length === 0
  ) {
    return [];
  }

  const sampleRow = data.values[0];
  const fields = [];

  for (const [fieldName, fieldValue] of Object.entries(sampleRow)) {
    // More robust numeric detection
    const isNumeric =
      typeof fieldValue === "number" ||
      (typeof fieldValue === "string" &&
        fieldValue.trim() !== "" &&
        !isNaN(Number(fieldValue)));

    fields.push({
      name: fieldName,
      type: isNumeric ? "quantitative" : "nominal",
      isNumeric,
    });
  }

  return fields;
}

/**
 * Create dynamic encoding for table-to-bar conversion
 */
export function createDynamicTableEncoding(
  fields: Array<{ name: string; type: string; isNumeric: boolean }>,
) {
  // Separate numeric and categorical fields
  const numericFields = fields.filter((f) => f.isNumeric);
  const categoricalFields = fields.filter((f) => !f.isNumeric);

  // Strategy for table conversion:
  // 1. Use first categorical field for Y-axis (categories)
  // 2. Use first numeric field for X-axis (values)
  // 3. If no categorical fields, use first field as category
  // 4. If no numeric fields, use count aggregation

  let xField, yField;

  if (numericFields.length > 0 && categoricalFields.length > 0) {
    // Ideal case: we have both categorical and numeric fields
    xField = numericFields[0];
    yField = categoricalFields[0];

    return {
      x: {
        field: xField.name,
        type: "quantitative",
        axis: { title: xField.name, format: ",.0f" },
      },
      y: {
        field: yField.name,
        type: "nominal",
        axis: { title: yField.name },
        sort: "-x",
      },
      tooltip: fields.map((field) => ({
        field: field.name,
        type: field.type,
        ...(field.isNumeric ? { format: ",.0f" } : {}),
      })),
    };
  } else if (categoricalFields.length > 0) {
    // Only categorical fields - use count aggregation
    yField = categoricalFields[0];

    return {
      x: {
        aggregate: "count",
        type: "quantitative",
        axis: { title: "Count" },
      },
      y: {
        field: yField.name,
        type: "nominal",
        axis: { title: yField.name },
        sort: "-x",
      },
      tooltip: [
        { field: yField.name, type: "nominal" },
        { aggregate: "count", type: "quantitative" },
      ],
    };
  } else if (numericFields.length > 0) {
    // Only numeric fields - create histogram of first field
    xField = numericFields[0];

    return {
      x: {
        field: xField.name,
        type: "quantitative",
        bin: true,
        axis: { title: xField.name },
      },
      y: {
        aggregate: "count",
        type: "quantitative",
        axis: { title: "Count" },
      },
      tooltip: [
        { field: xField.name, type: "quantitative", bin: true },
        { aggregate: "count", type: "quantitative" },
      ],
    };
  } else {
    // Fallback: treat first field as categorical
    const firstField = fields[0];

    return {
      x: {
        aggregate: "count",
        type: "quantitative",
        axis: { title: "Count" },
      },
      y: {
        field: firstField.name,
        type: "nominal",
        axis: { title: firstField.name },
        sort: "-x",
      },
      tooltip: [
        { field: firstField.name, type: "nominal" },
        { aggregate: "count", type: "quantitative" },
      ],
    };
  }
}

/**
 * Search for a table by table_id and return its schema
 * @param {string} tableId - The table_id to search for
 * @returns {Array|null} - The schema array if found, null if not found
 */
export function findTableSchema(tableId: string, datasetList: any[]) {
  for (const dataset of datasetList) {
    for (const table of dataset.tables) {
      if (table.table_id === tableId) {
        return table.schema;
      }
    }
  }
  return null;
}

/**
 * Search for a table by table_id and return the full table object
 * @param {string} tableId - The table_id to search for
 * @returns {Object|null} - The table object if found, null if not found
 */
export function findTable(tableId: string, datasetList: any[]) {
  for (const dataset of datasetList) {
    for (const table of dataset.tables) {
      if (table.table_id === tableId) {
        return {
          ...table,
          dataset_id: dataset.dataset_id,
          location: dataset.location,
        };
      }
    }
  }
  return null;
}

/**
 * Format schema array into a readable string format
 * @param {Array} schema - The schema array to format
 * @returns {string} - Formatted string with field list
 */
export function formatSchemaToString(schema: any[]) {
  if (!schema || !Array.isArray(schema)) {
    return "No schema found";
  }

  const fieldList = schema
    .map((field) => `${field.name}(${field.type})`)
    .join(", ");
  return `column_list: ${fieldList}`;
}

/**
 * Appends or replaces column schema in the description
 * @param {string} desc - The original description
 * @param {string} schema - The column schema to append/replace
 * @returns {string} - Updated description with column schema
 */
export function appendColumnSchema(desc: string, schema: string) {
  // Check if column_list already exists in the description
  if (desc.includes("column_list:")) {
    // Replace existing column_list with new schema
    const regex = /column_list:.*?(?=\n|$)/;
    return desc.replace(regex, schema);
  } else {
    // Append new column schema with proper line breaks
    return `${desc}\n\n${schema}`;
  }
}

export function extractTableNameFromQuery(query: string) {
  // This regex matches FROM `project`.`table` or FROM project.table or FROM `table`
  // First capture group: optional database name (with or without backticks)
  // Second capture group: table name (with or without backticks)
  const tableRegex = /FROM\s+(?:`?([^`\s]+)`?\.)?`?([^`\s]+)`?/i;
  const match = query.match(tableRegex);
  console.log("match", match);

  if (match) {
    // If we have a database.table format, return the table name (match[2])
    // If we only have a table name, return match[1]
    return match[2] || match[1];
  }
  return null;
}

/**
 * Interface for zakat data structure from BigQuery
 */
interface ZakatData {
  tahun: string;
  bulan: string;
  provinsi: string;
  kab_kota: string;
  zakatmal_perorangan: string;
  zakatmal_badan: string;
  zakat_fitrah: string;
  infak_sedekah_tidak_terikat: string;
  infak_sedekah_terikat: string;
  infak_penyaluran: string;
  infak_operasional: string;
  csr: string;
  kurban: string;
  dskl: string;
  fidyah: string;
}

/**
 * Calculates total zakat (zakatmal_perorangan + zakatmal_badan + zakat_fitrah)
 * @param data Array of zakat data objects
 * @returns Total zakat amount as number
 */
export function calculateTotalZakat(data: ZakatData[]): number {
  return data.reduce((total, item) => {
    const perorangan = parseFloat(item.zakatmal_perorangan) || 0;
    const badan = parseFloat(item.zakatmal_badan) || 0;
    const fitrah = parseFloat(item.zakat_fitrah) || 0;
    return total + perorangan + badan + fitrah;
  }, 0);
}

/**
 * Calculates sum for a specific zakat type
 * @param data Array of zakat data objects
 * @param zakatType The specific zakat type to sum (e.g., 'zakatmal_perorangan', 'zakat_fitrah')
 * @returns Sum of the specified zakat type as number
 */
export function calculateSpecificZakatSum(
  data: ZakatData[],
  zakatType: keyof ZakatData,
): number {
  return data.reduce((total, item) => {
    const value = parseFloat(item[zakatType] as string) || 0;
    return total + value;
  }, 0);
}

/**
 * Calculates all zakat-related sums from the data
 * @param data Array of zakat data objects
 * @returns Object containing all zakat calculations
 */
export function calculateAllZakatSums(data: ZakatData[]) {
  return {
    totalZakat: calculateTotalZakat(data),
    zakatmalPerorangan: calculateSpecificZakatSum(data, "zakatmal_perorangan"),
    zakatmalBadan: calculateSpecificZakatSum(data, "zakatmal_badan"),
    zakatFitrah: calculateSpecificZakatSum(data, "zakat_fitrah"),
    infakSedekahTidakTerikat: calculateSpecificZakatSum(
      data,
      "infak_sedekah_tidak_terikat",
    ),
    infakSedekahTerikat: calculateSpecificZakatSum(
      data,
      "infak_sedekah_terikat",
    ),
    infakPenyaluran: calculateSpecificZakatSum(data, "infak_penyaluran"),
    infakOperasional: calculateSpecificZakatSum(data, "infak_operasional"),
    csr: calculateSpecificZakatSum(data, "csr"),
    kurban: calculateSpecificZakatSum(data, "kurban"),
    dskl: calculateSpecificZakatSum(data, "dskl"),
    fidyah: calculateSpecificZakatSum(data, "fidyah"),
  };
}

/**
 * Generic function to calculate sums for multiple columns
 * @param data Array of data objects
 * @param columnsToSum Comma-separated list of column names to sum
 * @returns Object containing sums for each column or total if multiple columns
 *
 * @example
 * // Single column
 * const data = [{ revenue: "100" }, { revenue: "200" }];
 * calculateColumnSums(data, "revenue"); // Returns: { revenue: 300 }
 *
 * // Multiple columns
 * const data = [
 *   { sales: "100", profit: "50" },
 *   { sales: "200", profit: "75" }
 * ];
 * calculateColumnSums(data, "sales,profit"); // Returns: { total: 425 }
 *
 * // Invalid column (will be ignored with warning)
 * calculateColumnSums(data, "sales,invalid_column"); // Returns: { sales: 300 }
 *
 * // Non-numeric column (will be ignored with warning)
 * const data = [{ name: "John", age: "25" }];
 * calculateColumnSums(data, "name,age"); // Returns: { age: 25 }
 */
export function calculateColumnSums<T extends Record<string, any>>(
  data: T[],
  columnsToSum: string,
): Record<string, number> {
  if (!data || data.length === 0) {
    return {};
  }

  // Parse columns from comma-separated string
  const columns = columnsToSum
    .split(",")
    .map((col) => col.trim())
    .filter((col) => col.length > 0);

  if (columns.length === 0) {
    return {};
  }

  // Get the first row to check data structure
  const firstRow = data[0];
  const availableColumns = Object.keys(firstRow);

  // Validate columns exist in data structure
  const validColumns = columns.filter((col) => {
    if (!availableColumns.includes(col)) {
      console.warn(
        `Column "${col}" not found in data structure. Available columns:`,
        availableColumns,
      );
      return false;
    }
    return true;
  });

  if (validColumns.length === 0) {
    console.error("No valid columns found for summation");
    return {};
  }

  // Check if values are numeric for each column
  const numericColumns = validColumns.filter((col) => {
    const sampleValue = firstRow[col];
    const isNumeric = !isNaN(parseFloat(String(sampleValue)));
    if (!isNumeric) {
      console.warn(`Column "${col}" contains non-numeric values:`, sampleValue);
    }
    return isNumeric;
  });

  if (numericColumns.length === 0) {
    console.error("No numeric columns found for summation");
    return {};
  }

  // Calculate sums
  const result: Record<string, number> = {};

  if (numericColumns.length === 1) {
    // Single column: return with column name as key
    const column = numericColumns[0];
    result[column] = data.reduce((total, item) => {
      const value = parseFloat(String(item[column])) || 0;
      return total + value;
    }, 0);
  } else {
    // Multiple columns: return total sum
    result.total = data.reduce((total, item) => {
      const rowSum = numericColumns.reduce((colTotal, col) => {
        const value = parseFloat(String(item[col])) || 0;
        return colTotal + value;
      }, 0);
      return total + rowSum;
    }, 0);
  }

  return result;
}

export function calculateColumnAverages<T extends Record<string, any>>(
  data: T[],
  columnsToAverage: string,
): Record<string, number> {
  if (!data || data.length === 0) {
    return {};
  }

  // First, get the sums using the existing calculateColumnSums function
  const sums = calculateColumnSums(data, columnsToAverage);

  if (Object.keys(sums).length === 0) {
    return {};
  }

  // Parse columns from comma-separated string to determine structure
  const columns = columnsToAverage
    .split(",")
    .map((col) => col.trim())
    .filter((col) => col.length > 0);

  // Calculate averages based on the sums
  const result: Record<string, number> = {};

  if (columns.length === 1) {
    // Single column: use the column name from sums and convert to average
    const columnName = Object.keys(sums)[0];
    if (columnName && sums[columnName] !== undefined) {
      result[`avg_${columnName}`] = sums[columnName] / data.length;
    }
  } else {
    // Multiple columns: if sums has 'total', we need to calculate individual averages
    if (sums.total !== undefined) {
      // For multiple columns that were summed into 'total', calculate individual averages
      columns.forEach((column) => {
        const columnSum = data.reduce((total, item) => {
          const value = parseFloat(String(item[column])) || 0;
          return total + value;
        }, 0);
        result[`avg_${column}`] = columnSum / data.length;
      });
    } else {
      // If individual column sums exist, convert them to averages
      Object.entries(sums).forEach(([columnName, sum]) => {
        result[`avg_${columnName}`] = sum / data.length;
      });
    }
  }

  return result;
}

export async function getKey(secret: string) {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey("raw", enc, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export function toBase64Url(arr: Uint8Array) {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-") // URL safe
    .replace(/\//g, "_")
    .replace(/=+$/, ""); // remove padding
}

export function fromBase64Url(b64: string) {
  // Convert URL-safe base64 back to normal
  b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  // Pad string
  while (b64.length % 4) b64 += "=";
  return Buffer.from(b64, "base64");
}

export async function encryptObject(obj: any, secretKey?: string) {
  // Convert object to string and encode as UTF-8
  const data = new TextEncoder().encode(JSON.stringify(obj));

  if (secretKey) {
    // Create HMAC with secret key
    const keyData = new TextEncoder().encode(secretKey);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureBase64 = btoa(
      String.fromCharCode.apply(null, signatureArray),
    );

    return {
      hash: signatureBase64, // This is now an HMAC signature
      data: toBase64Url(data),
    };
  } else {
    // Fallback to regular SHA-256 hash
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashBase64 = btoa(String.fromCharCode.apply(null, hashArray));

    return {
      hash: hashBase64,
      data: toBase64Url(data),
    };
  }
}

export async function hashText(
  data: string,
  secretKey: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(data);

  // Import the secret key for HMAC operations
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false, // not extractable
    ["sign"],
  );

  // Generate HMAC signature
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);

  // Convert signature to hexadecimal string
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}
export function removeNonArrayValues<T extends Record<string, unknown>>(
  input: T,
) {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => Array.isArray(v)),
  ) as { [K in keyof T as T[K] extends unknown[] ? K : never]: T[K] };
}

export function getParamValueFromSources<
  T extends Record<string, KeyValueObject[]>,
>(param: string, sources: T): string | undefined {
  for (const key in sources) {
    const source = sources[key];
    const found = source?.find((p) => p.key === param);
    if (found) return found.value;
  }
  return undefined;
}

export function objectToKeyValueArray<T extends Record<string, string>>(
  obj: T,
) {
  return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

export function isSameKey(a: string, b: string) {
  // split by underscore atau hyphen
  const splitKey = (s: string) => s.toLowerCase().split(/[_-]/);

  const A = splitKey(a);
  const B = splitKey(b);

  if (A.length !== B.length) return false;

  for (let i = 0; i < A.length; i++) {
    if (A[i] !== B[i]) return false;
  }

  return true;
}

export function isWithinTolerance(num1: number, num2: number, tolerance = 2) {
  return Math.abs(num1 - num2) <= tolerance;
}

export function normalizeText(str: string) {
  if (typeof str !== "string") return "";
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD") // Decompose accents [web:11]
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics [web:12]
    .replace(/[^\w\s]/g, "") // Remove symbols/punctuation, keep word chars & spaces [web:7]
    .replace(/\s+/g, " ") // Collapse multiple spaces [web:1]
    .trim();
}

export function normalizeNPWP(npwp: string) {
  return npwp.replace(/\D/g, "");
}

export function isMMYYYYFormat(str: string) {
  const regex = /^0[1-9]|1[0-2]\/20\d{2}$/;
  if (!regex.test(str)) return false;

  const [month, year] = str.split("/").map(Number);
  return month >= 1 && month <= 12 && year >= 2000 && year <= 2099; // Adjust year range as needed
}

export function mmYyyyToYyyyMmDd(str: string) {
  const regex = /^(0[1-9]|1[0-2])\/20\d{2}$/;
  if (!regex.test(str)) return null; // Invalid format

  const [month, year] = str.split("/").map(Number);
  if (month < 1 || month > 12 || year < 2000 || year > 2099) return null;

  const paddedMonth = month.toString().padStart(2, "0");
  return `${year}-${paddedMonth}-01`;
}

export function decodeBase64Value(
  obj: Record<string, any>,
): Record<string, any> {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(decodeBase64Value);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      try {
        const decoded = atob(value);
        const num = parseFloat(decoded);
        if (!isNaN(num)) {
          result[key] = Math.round(num);
          continue;
        }
      } catch {
        // Bukan Base64 valid, skip
      }
    }
    result[key] = decodeBase64Value(value);
  }
  return result;
}


export async function getFunctionDataFromDB(session: any, toolName: string) {
  // get function detail from database
  const responseDetailFunction = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL_V2}/function_tool?tool_name=${encodeURIComponent(
      toolName,
    )}`,
    {
      method: "GET",
      headers: {
        "User-id": session.user.id,
        Authorization: `Bearer ${session.user.backendToken}`,
      },
    },
  );
  const detailFunction = await responseDetailFunction.json();
  const result =
    detailFunction.data.founds[0]; // response always return 1 data;

  return result;
}