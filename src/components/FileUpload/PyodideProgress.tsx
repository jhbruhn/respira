/**
 * PyodideProgress Component
 *
 * Renders Pyodide initialization progress indicator
 */

import { Progress } from "@/components/ui/progress";

interface PyodideProgressProps {
  pyodideReady: boolean;
  pyodideProgress: number;
  pyodideLoadingStep: string | null;
  isFileLoading: boolean;
}

export function PyodideProgress({
  pyodideReady,
  pyodideProgress,
  pyodideLoadingStep,
  isFileLoading,
}: PyodideProgressProps) {
  if (pyodideReady || pyodideProgress === 0) return null;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          {isFileLoading
            ? "Please wait - initializing Python environment..."
            : pyodideLoadingStep || "Initializing Python environment..."}
        </span>
        <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
          {pyodideProgress.toFixed(0)}%
        </span>
      </div>
      <Progress value={pyodideProgress} className="h-2.5" />
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">
        {isFileLoading
          ? "File dialog will open automatically when ready"
          : "This only happens once on first use"}
      </p>
    </div>
  );
}
