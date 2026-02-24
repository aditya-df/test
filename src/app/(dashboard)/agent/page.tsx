import React, { Suspense } from "react";
// import Link from "next/link";

// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from "@/components/ui/breadcrumb";
//import { prisma } from '@/config/db'
import { DatasourceSkeleton } from "@/components/dashboard/old-datasource/datasource-skeleton";
import { AgentContent } from "@/components/dashboard/agent/agent-list-component";
import { ContentLayout } from "@/components/dashboard/content-layout";

export default async function Page() {
  return (
    <>
      {/* Wrap the data-fetching component in Suspense */}
      <ContentLayout title="Agent">
        <Suspense fallback={<DatasourceSkeleton />}>
          {/* <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Agent</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb> */}
          <AgentContent />
        </Suspense>
      </ContentLayout>

    </>
  );
}
