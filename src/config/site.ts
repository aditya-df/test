import { NavItemFooter } from "@/types";
import { NavItem } from "@/types";

const links = {
  twitter: "https://twitter.com/mii_metrodata",
  linkedin: "https://www.linkedin.com/company/metrodata",
  authorsWebsite: "https://metrodata.co.id",
};

export const siteConfig = {
  name: "Knowgen.ai",
  description:
    "Metrodata KnowgenAi is a data science product that helps you to make better decisions.",
  links,
  url: process.env.NEXT_PUBLIC_APP_URL || "https://knowgen-ai.metrodata.web.id",
  author: "Metrodata, Tbk",
  keywords: ["SaaS", "Next.js", "KnowgenAI"],
  navItems: [
    // {
    //   title: "About",
    //   href: "/about",
    // },
    // {
    //   title: "Features",
    //   href: "/features",
    // },
    // {
    //   title: "FAQ",
    //   href: "/faq",
    // },
  ] satisfies NavItem[],
  navItemsMobile: [],
  navItemsFooter: [
    {
      title: "Company",
      items: [
        {
          title: "About",
          href: "/about",
          external: false,
        },
        {
          title: "Terms",
          href: "/tos",
          external: false,
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          title: "FAQ",
          href: "/faq",
          external: false,
        },
        {
          title: "Contact",
          href: "/contact",
          external: false,
        },
      ],
    },
  ] satisfies NavItemFooter[],
};
