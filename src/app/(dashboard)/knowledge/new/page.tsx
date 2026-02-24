import { ContentLayout } from "@/components/dashboard/content-layout";
import { DatasourceSkeleton } from "@/components/dashboard/old-datasource/datasource-skeleton";
import { Suspense } from "react";
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from "@/components/ui/breadcrumb";
// import Link from "next/link";
import { CreateKnowledgeComponent } from "@/components/dashboard/knowledge/create-knowledge-component";
export default async function Page() {
  return (
    <Suspense fallback={<DatasourceSkeleton />}>
      <ContentLayout title="New Knowledge">
        {/* <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/add_on_tool">Datasource</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb> */}
        <CreateKnowledgeComponent />
      </ContentLayout>
    </Suspense>
  );
}
