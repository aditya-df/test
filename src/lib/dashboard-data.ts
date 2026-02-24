import { MenuType } from "@prisma/client";
import { prisma } from "@/config/db";
import { cache } from 'react';

// This is the App Router equivalent of getStaticProps
// Using the cache function to deduplicate and cache requests
export const getMenuTypeAccess = cache(async (userRole: string) => {
  // Fetch all menu access permissions from the database
  const menuAccess = await prisma.acl.findMany({
    where: {
      role: userRole as any, // Cast to the UserRole enum
    },
    select: {
      menuType: true,
      create: true,
      read: true,
      update: true,
      delete: true
    }
  });

  // Create a map of menu types to their access permissions
  const menuTypeAccessMap = menuAccess.reduce((acc, item) => {
    if (item.menuType) {
      acc[item.menuType] = {
        create: item.create ?? false,
        read: item.read ?? false,
        update: item.update ?? false,
        delete: item.delete ?? false
      };
    }
    return acc;
  }, {} as Record<MenuType, { create: boolean; read: boolean; update: boolean; delete: boolean }>);

  return menuTypeAccessMap;
});

// Get all possible menu types for reference
export const getAllMenuTypes = cache(async () => {
  // This is static and will be cached
  return Object.values(MenuType);
});

// Get statistics that don't change frequently and can be cached
export const getDashboardStaticStats = cache(async () => {
  // This could include data that doesn't change often
  // For example, total number of menu types, system configurations, etc.
  return {
    totalMenuTypes: Object.keys(MenuType).length,
    systemVersion: "1.0.0",
    lastUpdated: new Date().toISOString(),
  };
});