import { UpdateToolComponent } from "@/components/dashboard/knowledge/update-tool-component";
import { ContentLayout } from "@/components/dashboard/content-layout";
import { DatasourceSkeleton } from "@/components/dashboard/old-datasource/datasource-skeleton";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { Suspense } from "react";

export default async function Page() {
    return (
        <ContentLayout title="Add-on Tool">
            <Suspense fallback={<DatasourceSkeleton />}>
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/">Home</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/add_on_tool">Add-on Tool</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>New</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <UpdateToolComponent />
            </Suspense>
        </ContentLayout>
    )
}

