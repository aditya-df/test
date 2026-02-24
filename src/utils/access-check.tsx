import { acl, MenuType } from "@prisma/client";
import { Session } from "next-auth";
import { useMemo } from "react";

interface CRUDOperation {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}



// Regular function version (no hooks) for non-React contexts
export function checkAccess(session: Session | null, MENU_CONST: MenuType): boolean {
  if (!session?.user?.acl) return false;

  const aclList: acl[] = session.user.acl ?? [];
  const menuTypes = aclList
    .map((item) => item.menuType)
    .filter((type) => type !== null);

  return menuTypes.includes(MENU_CONST);
}

// React hook version (properly named with 'use' prefix)
export function useAccessCheck(session: Session | null, MENU_CONST: MenuType): boolean {
  const hasAccess = useMemo(() => {
    if (!session?.user?.acl) return false;

    const aclList: acl[] = session.user.acl ?? [];
    const menuTypes = aclList
      .map((item) => item.menuType)
      .filter((type) => type !== null);

    return menuTypes.includes(MENU_CONST);
  }, [session?.user?.acl, MENU_CONST]);

  return hasAccess;
}

export function CheckCRUDPermission(
  session: Session | null,
  MENU_CONST: string,
  operation: keyof CRUDOperation
): boolean {
  if (session?.user?.roles?.includes("superadmin")) {
    return true;
  }
  if (!session?.user?.acl) return false;

  const aclList: acl[] = session.user.acl;
  const menuItem = aclList.find((item) => item.menuType === MENU_CONST);

  if (!menuItem) return false;

  return menuItem[operation] || false;
}

export function GetMenuListFromSession(session: Session | null): MenuType[] {
  const { menuTypes } = useMemo(() => {
    const aclList: acl[] = session?.user?.acl ?? [];
    // Filter out null values directly
    const menuTypes = aclList
      .map((item) => item.menuType)
      .filter((type) => type !== null);
    return { menuTypes };
  }, [session?.user?.acl]);

  return menuTypes;
}


