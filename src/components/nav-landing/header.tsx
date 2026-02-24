import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { Navigation } from "@/components/nav-landing/landing-navigation";
import { NavigationMobile } from "@/components/nav-landing/landing-navigation-mobile";
import { ThemeToggle } from "../theme-toggle";
import { HeaderClient } from "./HeaderProfileMenu";
import { HeaderScroll } from "./HeaderScroll";
import { getAuthSession } from "@/utils/auth-utils-server";

export async function Header(): Promise<React.ReactElement> {
  const session = await getAuthSession();

  const navItems = [...siteConfig.navItems];

  return (
    <HeaderScroll>
      <div className="container flex items-center justify-between p-4">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-lg font-bold tracking-wide transition-all duration-300 ease-in-out"
        >
          <Image
            src="/km/favicon/android-chrome-192x192.png"
            width={40}
            height={40}
            alt={siteConfig.name}
            className="size-10 md:size-8"
          />
          <span className="hidden md:inline-flex bg-gradient-to-r from-pink-600 to-purple-400 bg-clip-text font-extrabold text-transparent">
            {siteConfig.name}
          </span>
        </Link>

        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Main navigation */}
          <Navigation navItems={navItems} session={session} />

          <ThemeToggle />

          {/* Show user menu if logged in, otherwise show auth buttons */}
          {session?.user ? (
            <HeaderClient session={session} isDashboard={false} />
          ) : (
            <> </>
          )}

          {/* Mobile navigation */}
          <NavigationMobile navItems={navItems} session={session} />
        </div>
      </div>
    </HeaderScroll>
  );
}