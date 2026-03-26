/**
 * ProgressSection Component
 *
 * Displays the progress bar
 */

import { Progress } from "@/components/ui/progress";

interface ProgressSectionProps {
  progressPercent: number;
}

export function ProgressSection({ progressPercent }: ProgressSectionProps) {
  return (
    <div className="mb-3">
      <Progress
        value={progressPercent}
        className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-accent-600 [&>div]:to-accent-700 dark:[&>div]:from-accent-600 dark:[&>div]:to-accent-800"
      />
    </div>
  );
}
