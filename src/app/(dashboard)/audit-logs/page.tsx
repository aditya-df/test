// import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
// import Link from "next/link"
import React, { Suspense } from 'react';
import { redirect } from "next/navigation";
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/config/defaults";
import { auth } from "@/auth.config";
import { ContentLayout } from "@/components/dashboard/content-layout";
import { DatasourceSkeleton } from '@/components/dashboard/old-datasource/datasource-skeleton';
import { AuditLogsContent } from '@/components/admin-panel/audit-logs-content';

async function AuditLogsPage() {
    const sessionAuthConfig = await auth();
    if (!sessionAuthConfig) redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);

    // Check if user is superadmin - only superadmins can access organization management
    const userRoles = sessionAuthConfig?.user?.roles || [];
    const isSuperAdmin = Array.isArray(userRoles)
        ? userRoles.includes("superadmin")
        : userRoles === "superadmin";

    // Simulate a slow database query or API call
    // In production, remove this artificial delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return (
        <AuditLogsContent
            hasAccess={isSuperAdmin}
            sessionAuthConfig={sessionAuthConfig}
        />
    );
}

export default async function Page() {
    return (
        <ContentLayout title="Organizations">
            {/* Wrap the data-fetching component in Suspense */}
            <Suspense fallback={<DatasourceSkeleton />}>
                <AuditLogsPage />
            </Suspense>
        </ContentLayout>
    );
}
