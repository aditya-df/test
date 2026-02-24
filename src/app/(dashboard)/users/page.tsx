import React, { Suspense } from 'react'
// import Link from 'next/link'
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from '@/components/ui/breadcrumb'
// import { prisma } from '@/config/db'
import { DatasourceSkeleton } from '@/components/dashboard/old-datasource/datasource-skeleton'
import { UserManagementContent } from '@/components/admin-panel/user-management-content'
import { redirect } from "next/navigation";
import { checkAccess } from '@/utils/access-check'
import { auth } from '@/auth.config'
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from '@/config/defaults'
import { ContentLayout } from '@/components/dashboard/content-layout'

// Create a separate component for fetching credentials
// This allows us to suspend only this part
async function UserManagementPage() {
  const session = await auth()
  if (!session) redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);
  const MENU_CONST = 'MANAGE_USERS'
  const accesss = checkAccess(session, MENU_CONST)
  
  // Simulate a slow database query or API call
  // In production, remove this artificial delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  return <UserManagementContent hasAccess={accesss} session={session} MENU_CONST={MENU_CONST} />
}

export default async function Page() {

  return (
    <ContentLayout title="Users">
      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Users</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      {/* Wrap the data-fetching component in Suspense */}
      <Suspense fallback={<DatasourceSkeleton />}>
        <UserManagementPage />
      </Suspense>
    </ContentLayout>
  )
}