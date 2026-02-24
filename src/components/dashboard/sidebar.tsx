import { Clock, GitCommit } from "lucide-react";

import { cn } from "@/utils/utils";
import { useStore } from "@/hooks/sidebar/use-store";
import { Button } from "@/components/ui/button";
import { useSidebarToggle } from "@/hooks/sidebar/use-sidebar-toggle";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
// import { SidebarToggle } from "./sidebar-toggle";
import { SidebarHamburger } from "./sidebar-hamburger";
import { NewMenu } from "./new-menu";
import Link from "next/link";
import { useSystemSettings } from "@/hooks/use-system-settings"; // Import the custom hook

const versionBuilds = [
  { id: 1, version: "v1.0.3", date: "2023-10-18", commit: "feat: Import file from google drive" },
  { id: 2, version: "v1.0.2", date: "2023-09-13", commit: "feat: API invitation new user" },
  { id: 3, version: "v1.0.1", date: "2023-09-11", commit: "feat: User management verification" },
  { id: 4, version: "v1.0.0", date: "2023-09-08", commit: "feat: Knowledge base datasource" },
];

export function Sidebar() {
  const sidebar = useStore(useSidebarToggle, (state) => state);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ✅ Use the custom hook instead of manual state management
  const { systemSetting } = useSystemSettings();

  // ✅ Move the early return AFTER all hooks are called
  if (!sidebar) return null;

  const isBaznasTheme = process.env.NEXT_PUBLIC_BAZNAS_THEME === "true";

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-20 h-screen -translate-x-full lg:translate-x-0 transition-[width] ease-in-out duration-300",
        sidebar.isOpen === false ? "w-[90px]" : "w-72",
        isBaznasTheme && "bg-[#ecfff6] dark:bg-background"
      )}
    >
      <div className="relative h-full flex flex-col px-3 py-4 overflow-y-auto shadow-md dark:shadow-zinc-900">
        <div className="flex items-center mb-1">
          {/* Hamburger menu icon */}
          <SidebarHamburger isOpen={sidebar.isOpen} setIsOpen={sidebar.setIsOpen} />

          {sidebar.isOpen === true && (
            <Button
              className={cn(
                "transition-transform ease-in-out duration-300 mb-1",
              )}
              variant="link"
              asChild
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/km/favicon/small-new-knowgen-logo.png"
                  alt="KnowGen Logo"
                  width={24}
                  height={24}
                  className="mr-1"
                />
                <h1
                  className={cn(
                    "font-bold text-lg whitespace-nowrap transition-[transform,opacity,display] ease-in-out duration-300",
                  )}
                >
                  <span
                    className="bg-linear-to-r from-blue-600 to-purple-400 bg-clip-text font-extrabold text-transparent"
                  >
                    Knowgen.AI
                  </span>
                </h1>
              </Link>
            </Button>
          )}
        </div>

        {/* Pass systemSetting to NewMenu */}
        <NewMenu isOpen={sidebar.isOpen} systemSetting={systemSetting} />

        {/* Optional: Show loading/error states */}
        {/* {isLoading && sidebar.isOpen && (
          <div className="px-2 py-1 text-xs text-gray-500">
            Loading settings...
          </div>
        )}

        {error && sidebar.isOpen && (
          <div className="px-2 py-1 text-xs text-red-500">
            Error loading settings
          </div>
        )} */}

        {/* Version Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
            </DialogHeader>
            <ScrollArea className="mt-8 max-h-[60vh] pr-4">
              {versionBuilds.map((build) => (
                <div key={build.id} className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0">
                  <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{build.version}</p>
                    <p className="text-sm text-muted-foreground">{build.commit}</p>
                    <div className="flex items-center pt-2 text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {build.date}
                      <span className="px-1">•</span>
                      <GitCommit className="mr-1 h-3 w-3" />
                      {build.id}
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}