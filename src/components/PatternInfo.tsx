import type { PesPatternData } from '../formats/import/pesImporter';

interface PatternInfoProps {
  pesData: PesPatternData;
  showThreadBlocks?: boolean;
}

export function PatternInfo({ pesData, showThreadBlocks = false }: PatternInfoProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 text-xs mb-2">
        <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
          <span className="text-gray-600 dark:text-gray-400 block">Size</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
            {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
          </span>
        </div>
        <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
          <span className="text-gray-600 dark:text-gray-400 block">Stitches</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {pesData.penStitches?.stitches.length.toLocaleString() || pesData.stitchCount.toLocaleString()}
            {pesData.penStitches && pesData.penStitches.stitches.length !== pesData.stitchCount && (
              <span
                className="text-gray-500 dark:text-gray-500 font-normal ml-1"
                title="Input stitch count from PES file (lock stitches were added for machine compatibility)"
              >
                ({pesData.stitchCount.toLocaleString()})
              </span>
            )}
          </span>
        </div>
        <div className="bg-gray-200 dark:bg-gray-700/50 p-2 rounded">
          <span className="text-gray-600 dark:text-gray-400 block">
            {showThreadBlocks ? 'Colors / Blocks' : 'Colors'}
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {showThreadBlocks
              ? `${pesData.uniqueColors.length} / ${pesData.threads.length}`
              : pesData.uniqueColors.length
            }
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

            // Show which thread blocks use this color in PatternSummaryCard
            const threadNumbers = color.threadIndices.map(i => i + 1).join(", ");
            const tooltipText = showThreadBlocks
              ? (metadata
                  ? `Color ${idx + 1}: ${color.hex} - ${metadata}`
                  : `Color ${idx + 1}: ${color.hex}`)
              : (metadata
                  ? `Color ${idx + 1}: ${color.hex}\n${metadata}\nUsed in thread blocks: ${threadNumbers}`
                  : `Color ${idx + 1}: ${color.hex}\nUsed in thread blocks: ${threadNumbers}`);

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
            <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 leading-none">
              +{pesData.uniqueColors.length - 8}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
