import { Skeleton } from "./skeleton-base";

export function ChartSkeleton() {
  return (
    <div className="w-full p-6 border rounded-xl bg-white dark:bg-zinc-900/50 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-1/3" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      
      <div className="h-[250px] w-full flex items-end gap-3 px-2">
        {/* Mock bars for a bar chart skeleton */}
        {[60, 40, 90, 70, 50, 80, 45, 85].map((height, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t-sm" 
            style={{ height: `${height}%` }} 
          />
        ))}
      </div>
      
      <div className="flex justify-between pt-2">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}
