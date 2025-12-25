/**
 * ThreadLegend Component
 *
 * Displays a legend of thread colors used in the embroidery pattern
 * Shows color swatches with brand, catalog number, and description metadata
 */

interface ThreadColor {
  hex: string;
  brand?: string | null;
  catalogNumber?: string | null;
  chart?: string | null;
  description?: string | null;
}

interface ThreadLegendProps {
  colors: ThreadColor[];
}

export function ThreadLegend({ colors }: ThreadLegendProps) {
  return (
    <div className="absolute top-2 sm:top-2.5 left-2 sm:left-2.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-lg shadow-lg z-10 max-w-[150px] sm:max-w-[180px] lg:max-w-[200px]">
      <h4 className="m-0 mb-1.5 sm:mb-2 text-xs font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-600 pb-1 sm:pb-1.5">
        Colors
      </h4>
      {colors.map((color, idx) => {
        // Primary metadata: brand and catalog number
        const primaryMetadata = [
          color.brand,
          color.catalogNumber ? `#${color.catalogNumber}` : null,
        ]
          .filter(Boolean)
          .join(" ");

        // Secondary metadata: chart and description
        // Only show chart if it's different from catalogNumber
        const secondaryMetadata = [
          color.chart && color.chart !== color.catalogNumber
            ? color.chart
            : null,
          color.description,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div
            key={idx}
            className="flex items-start gap-1.5 sm:gap-2 mb-1 sm:mb-1.5 last:mb-0"
          >
            <div
              className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-black dark:border-gray-300 flex-shrink-0 mt-0.5"
              style={{ backgroundColor: color.hex }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                Color {idx + 1}
              </div>
              {(primaryMetadata || secondaryMetadata) && (
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-tight mt-0.5 break-words">
                  {primaryMetadata}
                  {primaryMetadata && secondaryMetadata && (
                    <span className="mx-1">•</span>
                  )}
                  {secondaryMetadata}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
