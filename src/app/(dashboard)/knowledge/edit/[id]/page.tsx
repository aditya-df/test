import { ContentLayout } from "@/components/dashboard/content-layout";
import { DatasourceSkeleton } from "@/components/dashboard/old-datasource/datasource-skeleton";
import { Suspense } from "react";

import { EditKnowledgeComponent } from "@/components/dashboard/knowledge/edit-knowledge-component";
export default async function Page() {
  return (
    <Suspense fallback={<DatasourceSkeleton />}>
      <ContentLayout title="Edit Knowledge">
        <EditKnowledgeComponent />
      </ContentLayout>
    </Suspense>
  );
}
