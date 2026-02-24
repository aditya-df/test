import { LiveChatContent } from "@/components/livechat/livechat-content";

export default async function Page({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly agentId?: string;
    readonly selectedAgentNameProps?: string; // ← CHANGED: Match the parameter name
  }>;
}) {
  const params = await searchParams;
  const agentId = params?.agentId || "default-agent";
  const selectedAgentNameProps = params?.selectedAgentNameProps || "Default Agent"; // ← CHANGED: Read the correct parameter

  console.log("LiveChat Page - Received params:", params);
  console.log("LiveChat Page - AgentId:", agentId);
  console.log("LiveChat Page - SelectedAgentNameProps:", selectedAgentNameProps);

  return (
    <LiveChatContent
      key={agentId}
      agentId={agentId}
      selectedAgentNameProps={selectedAgentNameProps}
    />
  );
}