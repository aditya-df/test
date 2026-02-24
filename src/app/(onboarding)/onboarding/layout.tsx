import * as React from 'react'
import { redirect } from 'next/navigation'

import { DEFAULT_UNAUTHENTICATED_REDIRECT } from '@/config/defaults'
import { getUserOnboardingStatus } from '../../../services/onboarding'
import { getAuthSession } from '@/utils/auth-utils-server'
import { prisma } from '@/config/db'


interface OnboardingLayoutProps {
  children: React.ReactNode
}

export default async function OnboardingLayout({
  children,
}: OnboardingLayoutProps): Promise<React.ReactElement> {
  const session = await getAuthSession()

  if (!session) {
    redirect(DEFAULT_UNAUTHENTICATED_REDIRECT)
  }

  const { hasOnboarded, hasVerify } = await getUserOnboardingStatus(
    session.user.email ? session.user.email : '',
  )

  console.log('User onboarding status:', { hasOnboarded, hasVerify })

  if (hasOnboarded && hasVerify) {
    console.log('User has onboarded and is verified')

    // Check user role to determine redirect destination
    const isAdmin = session.user.roles?.includes('admin') || session.user.roles?.includes('superadmin')
    const isUser = session.user.roles?.includes('user')

    if (isUser) {
      // Fetch the latest created agent for the user
      const userOrganizations = await prisma.userOnOrganization.findMany({
        where: { userId: session.user.id },
        select: { organizationId: true },
      })

      console.log('userOrganizations:', userOrganizations)

      const organizationIds = userOrganizations.map(org => org.organizationId)

      const latestAgent = await prisma.agent.findFirst({
        where: {
          AND: [
            // Filter by organization
            {
              user: {
                organization: {
                  some: {
                    organizationId: {
                      in: organizationIds,
                    },
                  },
                },
              },
            },
            // Visibility conditions
            {
              OR: [
                // PRIVATE agents owned by user
                {
                  AND: [
                    { userId: session.user.id },
                    {
                      OR: [
                        { visibilityType: 'PRIVATE' },
                        { visibilityType: null }
                      ]
                    }
                  ]
                },
                // PUBLIC agents
                {
                  visibilityType: 'PUBLIC'
                },
                // ORGANIZATION agents with user access
                {
                  AND: [
                    {
                      users: {
                        some: {
                          userId: session.user.id
                        }
                      }
                    },
                    {
                      visibilityType: 'ORGANIZATION'
                    }
                  ]
                }
              ]
            }
          ]
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          agentName: true,
        },
      })

      console.log('Latest agent:', latestAgent)

      // If an agent exists, redirect to it; otherwise, redirect to chatbot
      if (latestAgent) {
        redirect(
          `/chatbot?agentId=${latestAgent.id}&selectedAgentNameProps=${encodeURIComponent(latestAgent.agentName)}`
        )
      }

      // User role without agent - redirect to chatbot
      console.log('User has no agents, redirecting to chatbot')
      redirect('/chatbot')
    }

    // Admin and superadmin users go to dashboard
    if (isAdmin) {
      console.log('Admin/superadmin user, redirecting to dashboard')
      redirect('/dashboard')
    }

    // Fallback for users with no recognized role - redirect to chatbot
    console.log('No recognized role, redirecting to chatbot')
    redirect('/chatbot')
  }

  if (hasOnboarded && !hasVerify) {
    console.log('User has onboarded but is not verified, redirecting to landing page')
    redirect('/signin')
  }

  console.log('User has not completed onboarding, proceeding with onboarding process')

  return (
    <div className="flex  h-auto min-h-screen w-full items-center justify-center">
      {/* <div className="max-sm:flex  max-sm:w-full max-sm:flex-col max-sm:items-center max-sm:justify-center max-sm:rounded-none max-sm:border-none sm:min-w-[370px] sm:max-w-[368px]"> */}
      <div className="max-sm:w-full max-sm:max-w-[340px] max-sm:px-10">{children}</div>
      {/* </div> */}
    </div>
  )
}
