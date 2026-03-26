/**
 * ProgressStats Component
 *
 * Displays three stat cards: stitches (current/total), time (elapsed/total), and speed
 */

interface ProgressStatsProps {
  currentStitch: number;
  totalStitches: number;
  elapsedMinutes: number;
  totalMinutes: number;
  speed: number;
}

export function ProgressStats({
  currentStitch,
  totalStitches,
  elapsedMinutes,
  totalMinutes,
  speed,
}: ProgressStatsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
      <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
        <span className="text-gray-600 dark:text-gray-400 block">Stitches</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {currentStitch.toLocaleString()} / {totalStitches.toLocaleString()}
        </span>
      </div>
      <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
        <span className="text-gray-600 dark:text-gray-400 block">Time</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {elapsedMinutes} / {totalMinutes} min
        </span>
      </div>
      <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
        <span className="text-gray-600 dark:text-gray-400 block">Speed</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {speed} spm
        </span>
      </div>
    </div>
  );
}
