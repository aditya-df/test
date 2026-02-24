// import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
// import Link from "next/link"
import { redirect } from "next/navigation";
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from "@/config/defaults";
import { auth } from "@/auth.config";
import { checkAccess } from "@/utils/access-check";
import { ContentLayout } from "@/components/dashboard/content-layout";
import InvitedUserContent from "@/components/admin-panel/invited-user-content";

export default async function InvitedUsersPage() {
  const session = await auth()
  if (!session) redirect(DEFAULT_UNAUTHENTICATED_REDIRECT);
  const organizationId: any = session?.user.organizationId;

  const MENU_CONST = 'INVITE_USERS'
  const accesss = checkAccess(session, MENU_CONST)

  return (
    <ContentLayout title="Users">
      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Invited Users</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}
      <InvitedUserContent organizationId={organizationId} hasAccess={accesss} session={session} MENU_CONST={MENU_CONST}/>
    </ContentLayout>
  )
}
