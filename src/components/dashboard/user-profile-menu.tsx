"use server";

import { prisma } from "@/config/db";
import { authMethods, getAuthSession } from "@/utils/auth-utils-server";
import { HeaderClient } from "../nav-landing/HeaderProfileMenu";

export async function UserNav(): Promise<React.ReactElement> {
  const session = await getAuthSession();
  const systemSetting = await prisma.systemSettings.findFirst({
    where: {
      userId: session?.user.id,
    },
    select: {
      id: true,
      userId: true,
      sessionTimeout: true,
      warningTime: true,
      updatedAt: true,
    },
  });

  return (
    <>
      <HeaderClient
        session={session}
        isDashboard={true}
        systemSetting={systemSetting}
        authMethods={authMethods}
      />
    </>
  );
}
