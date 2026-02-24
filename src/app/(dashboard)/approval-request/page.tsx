import { ContentLayout } from "@/components/dashboard/content-layout";
import { Suspense } from "react";
import { DatasourceSkeleton } from "@/components/dashboard/old-datasource/datasource-skeleton";
import { ApprovalRequestAgentComponent } from "@/components/dashboard/approval-request/approval-request-agent-component";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    const process = params.process as string;
    console.log(process);

    return (
        <ContentLayout title="Approval Requests">
            <Suspense fallback={<DatasourceSkeleton />}>
                <ApprovalRequestAgentComponent process={process ?? ""} />
            </Suspense>
        </ContentLayout>
    )
}