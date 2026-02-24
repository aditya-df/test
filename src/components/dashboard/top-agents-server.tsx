import { prisma } from "@/config/db";
import { getAgentIcon } from "@/utils/utils";
import { TopAgentsList } from "./top-agents-client";

interface TopAgentsServerProps {
  userId: string;
  organizationIds: string[];
}

export async function TopAgentsServer({
  userId,
  organizationIds,
}: TopAgentsServerProps) {
  try {
    // Get user IDs in the same organizations
    const usersInOrgs = await prisma.userOnOrganization.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { userId: true },
    });
    const userIds = usersInOrgs.map((u) => u.userId);

    // Get agents with conversation counts that the user has access to
    const agentsWithCounts = await prisma.agent.findMany({
      where: {
        AND: [
          { userId: { in: userIds } }, // Agents from same organization
          {
            OR: [
              { userId: userId }, // User's own agents
              {
                // Agents user has been assigned to
                users: {
                  some: {
                    userId: userId,
                  },
                },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        agentName: true,
        description: true,
        image: true,
        _count: {
          select: {
            chatNewVersions: true,
            embeddedChats: true,
          },
        },
      },
      // Remove the orderBy - we'll sort after calculating total conversations
    });

    // Transform data and calculate total conversations for each agent
    const agentsWithTotalConversations = agentsWithCounts.map((agent) => {
      const Icon = getAgentIcon(agent.agentName);
      const totalConversations =
        agent._count.chatNewVersions + agent._count.embeddedChats;
      
      return {
        id: agent.id,
        agentName: agent.agentName,
        description: agent.description || `AI Assistant for ${agent.agentName}`,
        totalConversations,
        chatNewVersionsCount: agent._count.chatNewVersions,
        embeddedChatsCount: agent._count.embeddedChats,
        icon: Icon.name, // Pass icon name instead of component
        image: agent.image,
        href: `/chatbot?agentId=${
          agent.id
        }&selectedAgentNameProps=${encodeURIComponent(agent.agentName)}`,
      };
    });

    // Sort by total conversations in descending order (highest first)
    const sortedAgents = agentsWithTotalConversations.toSorted((a, b) => {
      return b.totalConversations - a.totalConversations;
    });

    // Take only the top 5 agents
    const topAgents = sortedAgents.slice(0, 5);

    // Log for debugging (you can remove this later)
    // console.log('Top Agents by conversation count:', topAgents.map(agent => ({
    //   name: agent.agentName,
    //   totalConversations: agent.totalConversations,
    //   chatNewVersions: agent.chatNewVersionsCount,
    //   embeddedChats: agent.embeddedChatsCount
    // })));

    return <TopAgentsList agents={topAgents} />;
  } catch (error) {
    console.error("Error fetching top agents:", error);
    return <TopAgentsList agents={[]} />;
  }
}
