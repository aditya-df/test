import React, { Suspense } from 'react'
import Link from 'next/link'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
// import { prisma } from '@/config/db'
import { DatasourceContent } from '@/components/dashboard/old-datasource/datasource-content'
import { DatasourceSkeleton } from '@/components/dashboard/old-datasource/datasource-skeleton'

// Create a separate component for fetching credentials
// This allows us to suspend only this part
async function DataSourcePage() {
  // Simulate a slow database query or API call
  // In production, remove this artificial delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  return <DatasourceContent />
}

export default async function Page() {

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Knowledge Base</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Wrap the data-fetching component in Suspense */}
      <Suspense fallback={<DatasourceSkeleton />}>
        <DataSourcePage />
      </Suspense>
    </>
  )
}