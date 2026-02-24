import { cn } from "@/utils/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "pulse" | "shimmer";
}

export function Skeleton({
  className,
  variant = "shimmer",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-md bg-gray-100 dark:bg-zinc-800",
        variant === "pulse" ? "animate-pulse" : "animate-shimmer",
        className
      )}
      {...props}
    />
  );
}
