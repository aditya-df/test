import { Chat } from '@/components/chat/chat'
import { ContentLayout } from '@/components/dashboard/content-layout'
import { prisma } from '@/config/db'
import { UIMessage } from 'ai';
import { redirect } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const chat = await prisma.chatNewVersion.findUnique({
            where: { id },
            select: {
                messages: true,
                agentId: true,
                createdAt: true,
                agent: {
                    select: {
                        id: true,
                        agentName: true,
                        description: true,
                        image: true,
                    }
                }
            }
        });
        if (!chat) {
            // If chat doesn't exist, redirect to the main chatbot page
            redirect('/chatbot');
        }

        // Get the chat creation time
        const chatCreatedAt = chat.createdAt ? new Date(chat.createdAt) : new Date();

        const messages = Array.isArray(chat?.messages)
            ? chat.messages.map((msg: any, index: number) => {
                const messageTime = msg.createdAt
                    ? new Date(msg.createdAt)
                    : new Date(chatCreatedAt.getTime() + (index * 60000));

                let parts = msg.parts || [];
                if (parts.length === 0 && msg.content) {
                    if (msg.reasoning) {
                        parts.push({ type: 'reasoning', text: msg.reasoning });
                    }
                    parts.push({ type: 'text', text: msg.content });
                }

                // Debug: Log BigQuery tool parts to diagnose download issues
                const bigQueryParts = parts.filter((p: any) =>
                    p.type === "tool-invocation" && (p.isBigQuery || p.toolInvocation?.isBigQuery)
                );
                if (bigQueryParts.length > 0) {
                    console.log(`📦 [Page Load] Message ${index} has ${bigQueryParts.length} BigQuery tool(s):`,
                        bigQueryParts.map((p: any) => ({
                            toolName: p.toolInvocation?.toolName,
                            state: p.toolInvocation?.state,
                            hasResult: !!p.toolInvocation?.result,
                            resultKeys: p.toolInvocation?.result ? Object.keys(p.toolInvocation.result) : [],
                            hasOriginalSqlCommand: !!p.toolInvocation?.result?.originalSqlCommand,
                        }))
                    );
                }

                return {
                    id: msg.id || `msg-${index}-${messageTime.getTime()}`,
                    role: msg.role,
                    name: msg.name,
                    parts,
                    experimental_attachments: msg.experimental_attachments,
                    toolInvocations: msg.toolInvocations,
                    createdAt: messageTime,
                } as UIMessage;
            })
            : [];


        return (
            <div>
                <ContentLayout title="Chatbot">
                    <Chat
                        key={id}
                        chatId={id}
                        initialMessages={messages}

                        agentId={chat.agentId || undefined}
                        selectedAgentNameProps={chat.agent?.agentName}
                        agentImage={chat.agent?.image || undefined}
                    />
                </ContentLayout>
            </div>
        );
    } catch (error) {
        console.error("Error fetching chat:", error);
        redirect('/chatbot');
    }
}
