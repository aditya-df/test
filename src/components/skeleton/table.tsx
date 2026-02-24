import { cn } from "@/utils/utils";
import { Skeleton } from "../ui/loading-skeletons/skeleton-base";

export default function TableSkeleton({ columnDefs }: { columnDefs: any[] }) {
  return (
    <section className="rounded-md overflow-hidden border border-gray-200 dark:border-zinc-800">
      {/* Header Row */}
      <div className="flex items-center w-full bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-800">
        {columnDefs.map((_, i) => (
          <div
            key={"tSkeletonHeader" + i}
            className="grow h-12 px-4 py-3 min-w-36 flex items-center"
          >
            <Skeleton className="h-4 w-24 opacity-60" />
          </div>
        ))}
      </div>
      
      {/* Data Rows */}
      {Array.from({ length: 5 }).map((_, oi) => (
        <div 
          key={"tSkeletonRow" + oi} 
          className="flex items-center w-full border-b border-gray-100 dark:border-zinc-800/50 last:border-0"
        >
          {columnDefs.map((_, i) => (
            <div
              key={"tSkeletonCol" + oi + i}
              className="grow h-16 px-4 py-4 min-w-36 flex flex-col justify-center gap-2"
            >
              <Skeleton className={cn(
                "h-4 rounded",
                i === 0 ? "w-3/4" : "w-1/2"
              )} />
              {i === 0 && <Skeleton className="h-3 w-1/2 opacity-40" />}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

