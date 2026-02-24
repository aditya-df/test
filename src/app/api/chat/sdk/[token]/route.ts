import { modelID, myProvider } from "@/lib/models";
import { streamText, stepCountIs, convertToModelMessages } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { Prisma } from "@prisma/client";
import { getTools, getSystemMessage } from "@/lib/tools";
import type { UIMessage } from "ai";
import { loadToolsFromDatabase } from "@/lib/dynamicTools";
import { RedisChatData, RedisChatService } from "@/lib/redis-chat-service";

// Get Redis configuration from environment
const USING_REDIS = process.env.USING_REDIS === "true";

async function getAgentSystemInstructions(agentId: string): Promise<{ instructions: string[], temperature?: number, imageGenerationEnabled?: boolean }> {
    if (!agentId) return { instructions: [] };

    try {
        // Fetch the agent from the database
        const agent = await prisma.agent.findUnique({
            where: { id: agentId },
            select: {
                agentName: true,
                description: true,
                systemInstruction: true,
                temperature: true,
                imageGenerationEnabled: true,
            },
        });

        if (!agent) return { instructions: [] };

        // Extract system instructions from the agent
        const instructions: string[] = [];

        // Add agent name as identity instruction
        if (agent.agentName) {
            instructions.push(`Your name is ${agent.agentName}.`);
            instructions.push(
                `Always identify yourself as ${agent.agentName}, never as Gemini or any AI model.`
            );
        }

        // Add agent description if available
        if (agent.description) {
            instructions.push(`You are ${agent.description}`);
        }

        // Add any system instructions stored in the agent
        if (agent.systemInstruction) {
            // Handle different formats depending on your database schema
            if (typeof agent.systemInstruction === "string") {
                instructions.push(agent.systemInstruction);
            } else if (Array.isArray(agent.systemInstruction)) {
                instructions.push(...(agent.systemInstruction as string[]));
            } else if (typeof agent.systemInstruction === "object") {
                // If stored as JSON object with instructions field
                const sysInst = agent.systemInstruction as { instructions?: string[] };
                if (sysInst.instructions && Array.isArray(sysInst.instructions)) {
                    instructions.push(...sysInst.instructions);
                }
            }
        }

        return {
            instructions,
            temperature: agent.temperature || undefined,
            imageGenerationEnabled: agent.imageGenerationEnabled ?? true
        };
    } catch (error) {
        console.error("Error fetching agent system instructions:", error);
        return { instructions: [] };
    }
}


async function verifySessionToken(sessionToken: string) {
    try {
        // First, verify the session token with the backend
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
        const response = await fetch(`${backendUrl}/v1/session/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_token: sessionToken }),
        });

        if (!response.ok) {
            console.log("Session token verification failed:", response.status);
            return null;
        }

        const sessionData = await response.json();

        if (!sessionData.data || !sessionData.data.agent_id) {
            console.log("Invalid session data received");
            return null;
        }

        // Get agent details from the database
        const agent = await prisma.agent.findFirst({
            where: {
                id: sessionData.data.agent_id,
            },
            select: {
                id: true,
                userId: true,
                agentName: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        organization: {
                            select: {
                                organizationId: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });

        if (!agent) {
            console.log("Agent not found for session");
            return null;
        }

        return agent;
    } catch (error) {
        console.error("Error verifying session token:", error);
        return null;
    }
}

// Legacy function for backward compatibility - will be deprecated
async function verifyToken(token: string) {
    try {
        const agent = await prisma.agent.findFirst({
            where: {
                token: token,
            },
            select: {
                id: true,
                userId: true,
                agentName: true,
                user: {
                    select: {
                        id: true,
                        organization: {
                            select: {
                                organizationId: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });

        if (!agent) {
            return null;
        }

        return agent;
    } catch (error) {
        console.error("Error verifying token:", error);
        return null;
    }
}

// Create a lightweight version of chat creation that doesn't block
async function quickCreateChat(token: string, agentId: string) {
    const startTime = Date.now();
    try {
        const result = await prisma.embeddedChat.create({
            data: {
                messages: [],
                token,
                agentId,
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
            error
        );
        throw error;
    }
}

// Update chat messages in the background
async function updateChatMessages(
    chatId: string,
    messages: UIMessage[],
) {
    const startTime = Date.now();
    try {
        await prisma.embeddedChat.update({
            where: { id: chatId },
            data: {
                messages: messages as unknown as Prisma.JsonArray,
            },
        });
        const duration = Date.now() - startTime;
        console.log(`DB Operation - updateChatMessages: ${duration}ms`);
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(
            `DB Operation Failed - updateChatMessages: ${duration}ms`,
            error
        );
    }
}

// NEW: Create chat and sync with Redis
async function createChatWithRedis(token: string, agentId: string): Promise<string> {
    const startTime = Date.now();
    console.log("🚀 createChatWithRedis started:", {
        // userId,
        agentId,
        timestamp: new Date().toISOString()
    });

    try {
        // Create chat in database first
        const dbCreateStart = Date.now();
        const newChat = await quickCreateChat(token, agentId);
        const chatId = newChat.id;
        const dbCreateTime = Date.now() - dbCreateStart;

        console.log("✅ Database chat creation completed:", {
            chatId,
            dbCreateTime: dbCreateTime + "ms"
        });

        // Sync with Redis (non-blocking)
        const redisChatData: RedisChatData = {
            id: chatId,
            token: token,
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
            redisChatDataStructure: Object.keys(redisChatData)
        });

        // Store in Redis (don't await to avoid blocking)
        const redisPromise = RedisChatService.setChat(redisChatData);

        redisPromise
            .then(() => {
                console.log('✅ Redis sync successful for new chat:', {
                    chatId,
                    syncTime: (Date.now() - startTime) + "ms"
                });
            })
            .catch((error: { message: any; }) => {
                console.error('❌ Redis sync failed for new chat:', {
                    chatId,
                    error: error instanceof Error ? error.message : String(error),
                    syncTime: (Date.now() - startTime) + "ms"
                });
            });

        const duration = Date.now() - startTime;
        console.log(`✅ createChatWithRedis completed:`, {
            chatId,
            totalTime: duration + "ms",
            dbTime: dbCreateTime + "ms",
            redisInitiated: true
        });

        return chatId;
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ createChatWithRedis failed:`, {
            totalTime: duration + "ms",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

// NEW: Update chat in both database and Redis
async function updateChatWithRedis(
    chatId: string,
    messages: UIMessage[],
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    },
    topic?: string
): Promise<void> {
    const startTime = Date.now();
    console.log("🔄 updateChatWithRedis started:", {
        chatId,
        messageCount: messages.length,
        hasUsage: !!usage,
        hasTopic: !!topic,
        timestamp: new Date().toISOString()
    });

    try {
        // Update database (blocking)
        const dbUpdateStart = Date.now();
        await updateChatMessages(chatId, messages);
        const dbUpdateTime = Date.now() - dbUpdateStart;

        console.log("✅ Database update completed:", {
            chatId,
            dbUpdateTime: dbUpdateTime + "ms"
        });

        // Update Redis (non-blocking)
        const redisUpdatePromise = RedisChatService.updateChatMessages(chatId, messages);

        redisUpdatePromise
            .then(() => {
                console.log('✅ Redis message update successful:', {
                    chatId,
                    messageCount: messages.length,
                    updateTime: (Date.now() - startTime) + "ms"
                });
            })
            .catch(error => {
                console.error('❌ Redis message update failed:', {
                    chatId,
                    error: error instanceof Error ? error.message : String(error),
                    updateTime: (Date.now() - startTime) + "ms"
                });
            });

        // If topic is provided, also update it in Redis
        if (topic) {
            console.log("🔄 Updating topic in Redis:", { chatId, topic });

            const topicUpdatePromise = RedisChatService.getChat(chatId)
                .then(existingChat => {
                    if (existingChat) {
                        const updatedChat: RedisChatData = {
                            ...existingChat,
                            topic,
                            messages,
                            updatedAt: new Date().toISOString(),
                        };
                        return RedisChatService.setChat(updatedChat);
                    }
                });

            topicUpdatePromise
                .then(() => {
                    console.log('✅ Redis topic update successful:', {
                        chatId,
                        topic,
                        updateTime: (Date.now() - startTime) + "ms"
                    });
                })
                .catch(error => {
                    console.error('❌ Redis topic update failed:', {
                        chatId,
                        topic,
                        error: error instanceof Error ? error.message : String(error),
                        updateTime: (Date.now() - startTime) + "ms"
                    });
                });
        }

        const totalTime = Date.now() - startTime;
        console.log("✅ updateChatWithRedis completed:", {
            chatId,
            totalTime: totalTime + "ms",
            dbTime: dbUpdateTime + "ms",
            redisInitiated: true
        });

    } catch (error) {
        const totalTime = Date.now() - startTime;
        console.error('❌ updateChatWithRedis failed:', {
            chatId,
            totalTime: totalTime + "ms",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

export async function POST(
    request: NextRequest,
    params: { params: Promise<{ token: string }> }
) {
    const requestStartTime = Date.now();
    const { token } = await params.params

    // Check if token is a session token (starts with 'sess_') or legacy agent token
    let agent;
    let backendBearerToken: string | undefined;
    if (token.startsWith('sess_')) {
        // Use session token verification
        agent = await verifySessionToken(token);
        if (!agent) {
            console.log("Unauthorized request - Invalid session token");
            return NextResponse.json({ error: "Invalid or expired session token" }, { status: 401 });
        }

        // Exchange session token for backend bearer token via Auth Service
        try {
            const authServiceUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL;
            if (!authServiceUrl) {
                console.error("Auth Service URL is not configured");
            } else {
                const loginResp = await fetch(`${authServiceUrl}/user/login-session`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session_token: token, email: agent?.user?.email }),
                });
                if (loginResp.ok) {
                    const loginData = await loginResp.json();
                    backendBearerToken = loginData.access_token;
                    console.log("Obtained backend bearer token via login-session");
                } else {
                    console.error("login-session failed:", loginResp.status, loginResp.statusText);
                }
            }
        } catch (e) {
            console.error("Error during login-session exchange:", e);
        }
    } else {
        // Legacy agent token verification (for backward compatibility)
        agent = await verifyToken(token);
        if (!agent) {
            console.log("Unauthorized request - Invalid agent token");
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
    }

    const parseStartTime = Date.now();
    const {
        messages,
        selectedModelId = "gemini-2.5-flash",
        isReasoningEnabled = true,
        activeChatId,
    }: {
        messages: Array<UIMessage>;
        selectedModelId?: modelID;
        isReasoningEnabled?: boolean;
        activeChatId?: string;
    } = await request.json();

    const parseTime = Date.now() - parseStartTime;
    console.log(`Request parsing completed in: ${parseTime}ms`);

    console.log("SDK API received:", {
        selectedModelId,
        isReasoningEnabled,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1],
        activeChatId,
        agentId: agent.id,
    });

    // Ensure model exists
    if (!selectedModelId || !myProvider.languageModel) {
        return new Response("Invalid model configuration", { status: 400 });
    }

    try {
        // Get or create chat ID with minimal blocking
        let chatId = activeChatId;
        const dbStartTime = Date.now();

        if (!chatId) {
            if (USING_REDIS) {
                console.log("🚀 Creating new chat with Redis sync...");
                chatId = await createChatWithRedis(token, agent.id);
            } else {
                console.log("📦 Creating new chat with database only...");
                const newChat = await quickCreateChat(token, agent.id);
                chatId = newChat.id;
            }
            const dbTime = Date.now() - dbStartTime;
            console.log(`✅ New chat created in: ${dbTime}ms with ID: ${chatId}, Redis: ${USING_REDIS}`);
        }

        // Update messages in the background without blocking the response
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
                        `Background message update with ${USING_REDIS ? 'Redis' : 'DB only'} completed in: ${bgUpdateTime}ms`
                    );
                })
                .catch((err) => {
                    const bgUpdateTime = Date.now() - bgUpdateStartTime;
                    console.error(
                        `Background message update with ${USING_REDIS ? 'Redis' : 'DB only'} failed after ${bgUpdateTime}ms:`,
                        err
                    );
                });
        }

        const setupStartTime = Date.now();
        // Load tools for this specific agent, with optional authContext for iframe sessions
        const dynamicTools: any = await loadToolsFromDatabase(
            agent.id,
            {
                userId: agent?.user?.id,
                bearerToken: backendBearerToken,
            }
        );

        const agentData = await getAgentSystemInstructions(
            agent.id || ""
        );

        const toolsToUse = getTools(
            isReasoningEnabled,
            selectedModelId,
            true,
            dynamicTools.tools,
            agent?.user.organization[0]?.organizationId,
            undefined,
            agentData.imageGenerationEnabled ?? true
        );

        const allSystemInstructions = [
            ...(agentData.instructions || []),
            ...(dynamicTools.extraSystemInstructions || []),
        ];

        const systemMessage = getSystemMessage(
            isReasoningEnabled,
            true,
            allSystemInstructions,
            undefined,
            undefined,
            agentData.imageGenerationEnabled ?? true
        );
        const setupTime = Date.now() - setupStartTime;
        console.log(`Tools setup completed in: ${setupTime}ms`);

        const startTime = Date.now();

        console.log("Using model config:", {
            model: selectedModelId,
            reasoning: isReasoningEnabled ? "enabled" : "disabled",
            toolsEnabled: true,
        });

        const streamStartTime = Date.now();
        console.log(
            `Starting AI stream at: ${streamStartTime - requestStartTime}
            ms from request start`
        );

        // Start streaming immediately
        const stream = streamText({
            system: systemMessage,
            providerOptions: {
                google: {
                    thinking: {
                        type: isReasoningEnabled ? "enabled" : "disabled",
                        budgetTokens: 5000,
                    },
                },
            },
            model: myProvider.languageModel(selectedModelId),
            stopWhen: stepCountIs(10),
            temperature: agentData.temperature || 0.7,
            tools: toolsToUse,
            toolChoice: "auto",
            // AI SDK 5.0: Convert UI messages to model messages
            messages: convertToModelMessages(messages),
            async onFinish({ response, totalUsage: usage }) {
                // Handle database updates in the background
                (async () => {
                    const finishStartTime = Date.now();
                    console.log(
                        `onFinish handler started after: ${finishStartTime - streamStartTime}
                        ms from stream start`
                    );

                    try {
                        if (!chatId) {
                            console.error("No chat ID available for final update");
                            return;
                        }

                        // Get current chat data
                        const fetchStartTime = Date.now();
                        const currentChat = await prisma.embeddedChat.findUnique({
                            where: { id: chatId },
                        });
                        const fetchTime = Date.now() - fetchStartTime;
                        console.log(`DB Operation - fetchCurrentChat: ${fetchTime}ms`);

                        if (!currentChat) {
                            console.error("Chat not found for final update:", chatId);
                            return;
                        }

                        // Calculate response time
                        const responseTime = Date.now() - startTime;

                        // Update with final data
                        const updateStartTime = Date.now();
                        await prisma.embeddedChat.update({
                            where: { id: chatId },
                            data: {
                                // AI SDK 5.0: appendResponseMessages removed, use array concatenation
                                messages: [...messages, ...response.messages] as unknown as Prisma.JsonArray,
                            },
                        });
                        const updateTime = Date.now() - updateStartTime;
                        console.log(`DB Operation - finalChatUpdate: ${updateTime}ms`);

                        const totalFinishTime = Date.now() - finishStartTime;
                        console.log("Final chat update complete:", {
                            chatId,
                            messageCount: messages.length,
                            responseTime,
                            tokens: usage?.totalTokens || 0,
                            dbOperationTime: fetchTime + updateTime,
                            totalFinishHandlerTime: totalFinishTime,
                        });
                    } catch (error) {
                        console.error("Error in onFinish background task:", error);
                    }
                })();
            },
        });

        const streamSetupTime = Date.now() - streamStartTime;
        console.log(`Stream setup completed in: ${streamSetupTime}ms`);

        // Return the stream with the chat ID in headers
        const responseStartTime = Date.now();
        const response = stream.toUIMessageStreamResponse({
            headers: {
                "x-chat-id": chatId || "unknown",
                "x-data-source": USING_REDIS ? "redis" : "database",
                "x-redis-enabled": USING_REDIS.toString(),
            },
            onError: (e: any) => {
                console.log("Error in stream:", e);
                // Return error string for client-side handling
                return `An error occurred, please try again! ${e.message}`;
            },
        });

        const totalSetupTime = responseStartTime - requestStartTime;
        console.log(
            `Total setup time before streaming response: ${totalSetupTime}ms`
        );

        return response;
    } catch (error: unknown) {
        console.error("Streaming error:", error);
        console.error("Error details:", {
            name: error instanceof Error ? error.name : "Unknown",
            message:
                error instanceof Error ? error.message : "An unknown error occurred",
            stack: error instanceof Error ? error.stack : undefined,
        });
        return new Response("Error processing request", { status: 500 });
    }
}

