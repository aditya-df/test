// import Link from 'next/link'

// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from '@/components/ui/breadcrumb'
import { DEFAULT_UNAUTHENTICATED_REDIRECT } from '@/config/defaults'
import { redirect } from 'next/navigation'
import { auth } from '@/auth.config'
import { checkAccess } from '@/utils/access-check'
import { ContentLayout } from '@/components/dashboard/content-layout'
import CredentialsContent from '@/components/admin-panel/credentials-content'


export default async function Page() {
  const session = await auth()
  if (!session) redirect(DEFAULT_UNAUTHENTICATED_REDIRECT)
  const MENU_CONST = 'MANAGE_CREDENTIALS'
  const accesss = checkAccess(session, MENU_CONST)

  return (
    <ContentLayout title="Credentials">
      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Credentials</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}
      <CredentialsContent hasAccess={accesss} session={session} MENU_CONST={MENU_CONST}/>
    </ContentLayout>
  )
}
