import { DocumentTextIcon, TrashIcon } from '@heroicons/react/24/solid';
import type { PesPatternData } from '../utils/pystitchConverter';

interface PatternSummaryCardProps {
  pesData: PesPatternData;
  fileName: string;
  onDeletePattern: () => void;
  canDelete: boolean;
  isDeleting: boolean;
}

export function PatternSummaryCard({
  pesData,
  fileName,
  onDeletePattern,
  canDelete,
  isDeleting
}: PatternSummaryCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-600 dark:border-blue-500">
      <div className="flex items-start gap-3 mb-3">
        <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Active Pattern</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={fileName}>
            {fileName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
          <span className="text-gray-600 dark:text-gray-400 block">Size</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
            {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
          <span className="text-gray-600 dark:text-gray-400 block">Stitches</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {pesData.stitchCount.toLocaleString()}
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
          <span className="text-gray-600 dark:text-gray-400 block">Colors</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {pesData.uniqueColors.length}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">Colors:</span>
        <div className="flex gap-1">
          {pesData.uniqueColors.slice(0, 8).map((color, idx) => {
            // Primary metadata: brand and catalog number
            const primaryMetadata = [
              color.brand,
              color.catalogNumber ? `#${color.catalogNumber}` : null
            ].filter(Boolean).join(" ");

            // Secondary metadata: chart and description
            const secondaryMetadata = [
              color.chart,
              color.description
            ].filter(Boolean).join(" ");

            const metadata = [primaryMetadata, secondaryMetadata].filter(Boolean).join(" • ");

            // Show which thread blocks use this color
            const threadNumbers = color.threadIndices.map(i => i + 1).join(", ");
            const tooltipText = metadata
              ? `Color ${idx + 1}: ${color.hex}\n${metadata}\nUsed in thread blocks: ${threadNumbers}`
              : `Color ${idx + 1}: ${color.hex}\nUsed in thread blocks: ${threadNumbers}`;

            return (
              <div
                key={idx}
                className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: color.hex }}
                title={tooltipText}
              />
            );
          })}
          {pesData.uniqueColors.length > 8 && (
            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 flex items-center justify-center text-[7px] font-bold text-gray-600 dark:text-gray-300">
              +{pesData.uniqueColors.length - 8}
            </div>
          )}
        </div>
      </div>

      {canDelete && (
        <button
          onClick={onDeletePattern}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isDeleting ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            </>
          ) : (
            <>
              <TrashIcon className="w-3 h-3" />
              Delete Pattern
            </>
          )}
        </button>
      )}
    </div>
  );
}
