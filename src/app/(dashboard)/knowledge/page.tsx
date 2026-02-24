import { ContentLayout } from "@/components/dashboard/content-layout";
import { DatasourceSkeleton } from "@/components/dashboard/old-datasource/datasource-skeleton";
import { Suspense } from "react";
import { KnowledgeListComponent } from "@/components/dashboard/knowledge/knowledge-list-component";

export default async function Page() {
  return (
    <ContentLayout title="Knowledge">
      <Suspense fallback={<DatasourceSkeleton />}>
        <KnowledgeListComponent />
      </Suspense>
    </ContentLayout>
  );
}
