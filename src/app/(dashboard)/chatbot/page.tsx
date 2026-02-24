import { auth } from '@/auth.config'
import { Chat } from '@/components/chat/chat'
import { ContentLayout } from '@/components/dashboard/content-layout'
import { redirect } from 'next/navigation'
import { prisma } from '@/config/db'

export default async function Page({ searchParams }: { searchParams: Promise<{ agentId?: string, selectedAgentNameProps?: string }> }) {
  const session = await auth()

  console.log('Session:', session)

  if (!session?.user) {
    redirect('/signin')
  }

  // Extract agentId from query parameters if provided
  const agentId = (await searchParams).agentId
  const selectedAgentNameProps = (await searchParams).selectedAgentNameProps

  console.log('Agent ID: ', agentId)

  let agentImage: string | undefined = undefined;

  if (agentId) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          image: true,
        }
      });

      agentImage = agent?.image || undefined;
    } catch (error) {
      console.error('Error fetching agent:', error);
    }
  }

  return (
    <ContentLayout title="Chatbot">
      <div className="flex flex-col h-full flex-1 overflow-hidden p-0">
        <Chat
          key={agentId || 'default'}
          agentId={agentId}
          selectedAgentNameProps={selectedAgentNameProps}
          agentImage={agentImage}
          userImage={session?.user?.image}
          userName={session?.user?.name}
          userEmail={session?.user?.email}
          />
      </div>
    </ContentLayout>
  )
}