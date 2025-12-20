import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
}

export function SkeletonLoader({
  className = "",
  variant = "rect",
}: SkeletonLoaderProps) {
  const variantClasses = {
    text: "h-4 rounded",
    rect: "rounded-lg",
    circle: "rounded-full",
  };

  return <Skeleton className={cn(variantClasses[variant], className)} />;
}

export function PatternCanvasSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600">
        <SkeletonLoader className="h-7 w-40" variant="text" />
      </div>
      <div className="relative w-full h-[600px] border border-gray-300 dark:border-gray-600 rounded bg-gray-200 dark:bg-gray-900 overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <div className="relative w-24 h-24 mx-auto">
              <SkeletonLoader className="w-24 h-24" variant="circle" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-500 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="space-y-2">
              <SkeletonLoader className="h-5 w-48 mx-auto" variant="text" />
              <SkeletonLoader className="h-4 w-64 mx-auto" variant="text" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatternInfoSkeleton() {
  return (
    <div className="mt-4">
      <SkeletonLoader className="h-6 w-40 mb-4" variant="text" />
      <div className="bg-gray-200 dark:bg-gray-900 p-4 rounded-lg space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <SkeletonLoader className="h-4 w-24" variant="text" />
            <SkeletonLoader className="h-4 w-32" variant="text" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MachineConnectionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600">
        <SkeletonLoader className="h-7 w-48" variant="text" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonLoader className="h-4 w-16" variant="text" />
          <SkeletonLoader className="h-8 w-32 rounded-lg" />
        </div>
        <div className="bg-gray-200 dark:bg-gray-900 p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <SkeletonLoader className="h-4 w-20" variant="text" />
            <SkeletonLoader className="h-4 w-24" variant="text" />
          </div>
          <div className="flex justify-between">
            <SkeletonLoader className="h-4 w-24" variant="text" />
            <SkeletonLoader className="h-4 w-32" variant="text" />
          </div>
        </div>
      </div>
    </div>
  );
}
