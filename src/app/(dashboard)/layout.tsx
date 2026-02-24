import { requireAuth } from "@/utils/auth-utils-server";
import Timeout from "@/components/timeout";
import { getUserOnboardingStatus } from "@/services/onboarding";
import { redirect } from "next/navigation";
import AdminPanelLayout from "@/components/dashboard/admin-panel-layout";
import { Suspense } from "react";
import { PageLoadingSpinner } from "@/components/page-loading-spinner";
import { NetworkProvider } from "@/providers/network-provider";
// import { OfflineModal } from "@/components/offline-modal";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Use the requireAuth utility to check authentication
  const session = await requireAuth();

  // Now that we know the user is authenticated, check onboarding status
  const { hasOnboarded, hasVerify } = await getUserOnboardingStatus(
    session.user.email ? session.user.email : '',
  );

  if (hasOnboarded && !hasVerify) {
    redirect('/confirmation');
  } else if (!hasOnboarded && !hasVerify) {
    redirect('/onboarding');
  }

  return (
    <AdminPanelLayout>
      <Timeout />
      <Suspense fallback={<PageLoadingSpinner variant="claude" />}>
        <NetworkProvider>
          {children}
          {/* <OfflineModal /> */}
        </NetworkProvider>
      </Suspense>
    </AdminPanelLayout>
  );
}
