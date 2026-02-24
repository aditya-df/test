import { Group } from "@/types";
import {
  Settings,
  LayoutGrid,
  Cpu,
} from "lucide-react";

// src\utils\menu-list.ts
export function getMenuList(pathname: string | null, menuTypes: string[]): Group[] {
  const allGroups = [
    {
      groupLabel: "",
      menus: [
        {
          href: "/dashboard",
          label: "Dashboard",
          active: pathname?.includes("/dashboard") ?? false,
          icon: LayoutGrid,
          submenus: [],
          constant: "DASHBOARD",
        },
      ],
    },
    {
      groupLabel: "",
      menus: [
        // {
        //   href: "/chatbot",
        //   label: "Chatbot",
        //   active: pathname?.includes("/chatbot") ?? false,
        //   icon: Bot,
        //   submenus: [],
        //   constant: "CHATBOT",
        // },
        {
          href: "/datasource",
          label: "Knowledge Base",
          active: pathname?.includes("/datasource") ?? false,
          icon: Settings,
          submenus: [],
          constant: "MANAGE_KNOWLEDGE",
        },
        {
          href: "/agent",
          label: "Agent",
          active: pathname?.includes("/agent") ?? false,
          icon: Cpu,
          submenus: [],
          constant: "MANAGE_AGENTS",
        },
      ],
    },
    // {
    //   groupLabel: "Settings",
    //   menus: [
    //     {
    //       href: "/users",
    //       label: "User Management",
    //       active: pathname?.includes("/users") ?? false,
    //       icon: User,
    //       submenus: [],
    //       constant: "MANAGE_USERS",
    //     },
    //     {
    //       href: "/invited-user",
    //       label: "Invited Users",
    //       active: pathname?.includes("/invited-user") ?? false,
    //       icon: Users,
    //       submenus: [],
    //       constant: "INVITE_USERS",
    //     },
    //     {
    //       href: "/acl",
    //       label: "ACL Management",
    //       active: pathname?.includes("/acl") ?? false,
    //       icon: Touchpad,
    //       submenus: [],
    //       constant: "MANAGE_ACL",
    //     },
    //     {
    //       href: "/credentials",
    //       label: "Credentials",
    //       active: pathname?.includes("/credentials") ?? false,
    //       icon: ReceiptText,
    //       submenus: [],
    //       constant: "MANAGE_CREDENTIALS",
    //     },
    //   ],
    // },
  ];

  const filteredGroups = allGroups.map((group) => ({
    ...group,
    menus: group.menus.filter((menu) => menuTypes.includes(menu.constant)),
  }));

  return filteredGroups.filter((group) => group.menus.length > 0);
}