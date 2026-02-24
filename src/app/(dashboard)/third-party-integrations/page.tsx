import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/config/defaults";
import { redirect } from "next/navigation";
import { auth } from "@/auth.config";
import { checkAccess } from "@/utils/access-check";
import { ContentLayout } from "@/components/dashboard/content-layout";
import ThirdPartyContent from "@/components/admin-panel/third-party-integration-content";

export default async function Page() {
  const session = await auth();
  if (!session) redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);
  const MENU_CONST = "MANAGE_CREDENTIALS";
  const accesss = checkAccess(session, MENU_CONST);

  return (
    <ContentLayout title="Third Party Integrations">
      <ThirdPartyContent
        hasAccess={accesss}
        session={session}
        MENU_CONST={MENU_CONST}
      />
    </ContentLayout>
  );
}
