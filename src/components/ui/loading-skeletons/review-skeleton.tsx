import { Skeleton } from "./skeleton-base";

export function ReviewSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-800/40 rounded border border-slate-700 p-4 space-y-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-10 h-10 rounded flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-32 rounded" />
              </div>
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </div>
          <div className="ml-13 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex justify-between pt-3 border-t border-slate-700">
              <div className="flex gap-4">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
