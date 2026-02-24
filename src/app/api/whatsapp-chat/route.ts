// src/app/api/whatsapp-chat/route.ts
import { modelID, myProvider } from "@/lib/models";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/config/db";
import { getTools, getSystemMessage } from "@/lib/tools";
import { loadToolsFromDatabase } from "@/lib/dynamicTools";

export async function POST(request: NextRequest) {
    try {
        const { message, agentId } = await request.json();

        if (!message || !agentId) {
            return NextResponse.json({ error: "Missing message or agentId" }, { status: 400 });
        }

        // Get agent data
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

        if (!agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        // Build system instructions
        const instructions: string[] = [];
        if (agent.agentName) {
            instructions.push(`Your name is ${agent.agentName}.`);
            instructions.push(`Always identify yourself as ${agent.agentName}, never as Gemini or any AI model.`);
        }
        if (agent.description) {
            instructions.push(`You are ${agent.description}`);
        }
        if (agent.systemInstruction) {
            instructions.push(agent.systemInstruction);
        }

        // Set up tools
        const dynamicTools: any = await loadToolsFromDatabase(agentId);
        const toolsToUse = getTools(
            false, // disable reasoning for WhatsApp
            "gemini-2.5-flash" as modelID,
            true,
            dynamicTools.tools,
            undefined, // no organization context for WhatsApp
            undefined,
            agent.imageGenerationEnabled ?? true
        );

        const systemMessage = getSystemMessage(
            false, // disable reasoning
            true,
            [...instructions, ...(dynamicTools.extraSystemInstructions || [])],
            undefined,
            undefined,
            agent.imageGenerationEnabled ?? true
        );

        // Generate response
        const result = await streamText({
            system: systemMessage,
            model: myProvider.languageModel("gemini-2.5-flash"),
            temperature: agent.temperature || 0.7,
            tools: toolsToUse,
            // AI SDK 5.0: User messages use 'content' instead of 'parts'
            messages: [{
                role: "user",
                content: message,
            }],
        });

        // Convert stream to text
        let fullResponse = '';
        for await (const chunk of result.textStream) {
            fullResponse += chunk;
        }

        return NextResponse.json({
            response: fullResponse,
            success: true
        });

    } catch (error) {
        console.error('WhatsApp chat error:', error);
        return NextResponse.json(
            { error: "Failed to process WhatsApp message" },
            { status: 500 }
        );
    }
}