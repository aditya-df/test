import { Skeleton } from "./skeleton-base";
import { ImageIcon } from "lucide-react";

export function ImageSkeleton() {
  return (
    <div className="w-full max-w-lg aspect-video border rounded-xl overflow-hidden bg-gray-50 dark:bg-zinc-900 flex flex-col">
      <div className="flex-grow flex items-center justify-center relative overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
        <ImageIcon className="w-12 h-12 text-gray-300 dark:text-zinc-700 relative z-10" />
      </div>
      <div className="p-4 space-y-2 bg-white dark:bg-zinc-900">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}
