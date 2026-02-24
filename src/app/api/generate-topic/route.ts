import { streamText } from 'ai';
import { myProvider } from '@/lib/models';

export async function POST(request: Request) {
    try {
        const { message } = await request.json();

        const result = await streamText({
            model: myProvider.languageModel("gemini-2.5-flash-lite"),
            prompt: `
                    Generate a short, descriptive topic (3-5 words max) for this chat message. Be concise and capture the main subject:
                    Message: "${message}"
                    Topic:
            `,
            maxOutputTokens: 20,
        });

        // FIX: Properly await the text result
        const topicText = await result.text;
        const topic = topicText || "New Chat";

        return Response.json({
            topic: topic.trim().replace(/^["']|["']$/g, '') // Remove quotes
        });
    } catch (error) {
        console.error("Topic generation error:", error);
        return Response.json({ topic: "New Chat" });
    }
}
