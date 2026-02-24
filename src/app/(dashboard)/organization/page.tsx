import React, { Suspense } from 'react';
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from '@/config/defaults';
import { redirect } from "next/navigation";
import { auth } from "@/auth.config";
import { ContentLayout } from "@/components/dashboard/content-layout";
import { DatasourceSkeleton } from '@/components/dashboard/old-datasource/datasource-skeleton';
import { OrganizationManagementContent } from '@/components/admin-panel/org-management-content';

// Create a separate component for fetching organizations
// This allows us to suspend only this part
async function OrganizationManagementPage() {
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

    console.log("isSuperAdmin", isSuperAdmin);
    console.log("userRoles", userRoles);
    console.log("session", sessionAuthConfig);

    return (
        <OrganizationManagementContent
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
                <OrganizationManagementPage />
            </Suspense>
        </ContentLayout>
    );
}