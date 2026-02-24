import { DEFAULT_UNAUTHENTICATED_REDIRECT } from '@/config/defaults'
import { redirect } from "next/navigation";
import { checkAccess } from "@/utils/access-check";
import { auth } from "@/auth.config";
import { ContentLayout } from "@/components/dashboard/content-layout";
import { ACLManagement } from "@/components/admin-panel/acl-content";

export default async function Page() {
  
  
  const session = await auth()
  if (!session) redirect(DEFAULT_UNAUTHENTICATED_REDIRECT)
  const MENU_CONST = 'MANAGE_ACL'
  const accesss = checkAccess(session, MENU_CONST)


  return (
    <ContentLayout title="ACL Management">
      <ACLManagement hasAccess={accesss} session={session} MENU_CONST={MENU_CONST} />
    </ContentLayout>
  );
}
