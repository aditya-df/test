"use client";

import { cn } from "@/utils/utils";
import { useStore } from "@/hooks/sidebar/use-store";
import { useSidebarToggle } from "@/hooks/sidebar/use-sidebar-toggle";
import { ClaudeSpinner} from "../spinner";
import { Sidebar } from "./sidebar";
import { useSessionLoader } from "@/hooks/useSessionLoader";
import { PageLoadingSpinner } from "../page-loading-spinner";

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebarToggle, (state) => state);

  const { isLoaded, error } = useSessionLoader();

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">
            Error loading session
          </h2>
          <p className="mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ClaudeSpinner/>
      </div>
    );
  }

  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-[calc(100vh)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          sidebar?.isOpen === false ? "lg:ml-[90px]" : "lg:ml-72"
        )}
      >
         <PageLoadingSpinner />
        {children}
      </main>
    </>
  );
}