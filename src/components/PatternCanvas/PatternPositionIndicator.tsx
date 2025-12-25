/**
 * PatternPositionIndicator Component
 *
 * Displays the current pattern position and rotation
 * Shows locked state when pattern is uploaded or being uploaded
 */

import { LockClosedIcon } from "@heroicons/react/24/solid";

interface PatternPositionIndicatorProps {
  offset: { x: number; y: number };
  rotation?: number;
  isLocked: boolean;
  isUploading: boolean;
}

export function PatternPositionIndicator({
  offset,
  rotation = 0,
  isLocked,
  isUploading,
}: PatternPositionIndicatorProps) {
  return (
    <div
      className={`absolute bottom-16 sm:bottom-20 right-2 sm:right-5 backdrop-blur-sm p-2 sm:p-2.5 px-2.5 sm:px-3.5 rounded-lg shadow-lg z-[11] min-w-[160px] sm:min-w-[180px] transition-colors ${
        isUploading || isLocked
          ? "bg-amber-50/95 dark:bg-amber-900/80 border-2 border-amber-300 dark:border-amber-600"
          : "bg-white/95 dark:bg-gray-800/95"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          Pattern Position:
        </div>
        {(isUploading || isLocked) && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <LockClosedIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-xs font-bold">
              {isUploading ? "UPLOADING" : "LOCKED"}
            </span>
          </div>
        )}
      </div>
      <div className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-1">
        X: {(offset.x / 10).toFixed(1)}mm, Y: {(offset.y / 10).toFixed(1)}mm
      </div>
      {!isUploading && !isLocked && rotation !== 0 && (
        <div className="text-sm font-semibold text-primary-600 dark:text-primary-400 mb-1">
          Rotation: {rotation.toFixed(1)}°
        </div>
      )}
      <div className="text-xs text-gray-600 dark:text-gray-400 italic">
        {isUploading
          ? "Uploading pattern..."
          : isLocked
            ? "Pattern locked • Drag background to pan"
            : "Drag pattern to move • Drag background to pan"}
      </div>
    </div>
  );
}
