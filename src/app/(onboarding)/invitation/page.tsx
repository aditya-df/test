// src/app/(onboarding)/invitation/page.tsx
import React, { Suspense } from 'react'
import PersonalInvitationInfo from '@/components/onboarding/sections/PersonalInfoInvitation'
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'

const LoadingCard = () => (
  <div className="container max-w-xl mx-auto mt-8 px-4">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div className="text-muted-foreground">Loading invitation...</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
)

interface InvitationPageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function InvitationPage({ searchParams }: InvitationPageProps) {
  // Await the searchParams promise
  const resolvedSearchParams = await searchParams
  const token = resolvedSearchParams.token

  // Get the Google invite configuration from environment
  const isGoogleInviteEnabled = process.env.INVITE_FROM_GOOGLE_USER === 'true'

  if (!token) {
    return (
      <div className="container max-w-xl mx-auto mt-8 px-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Invalid Invitation
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                No invitation token provided. Please check your invitation link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="bg-background">
      <Suspense fallback={<LoadingCard />}>
        <PersonalInvitationInfo
          token={token}
          isGoogleInviteEnabled={isGoogleInviteEnabled}
        />
      </Suspense>
    </main>
  )
}