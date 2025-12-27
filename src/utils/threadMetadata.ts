/**
 * Format thread metadata for display.
 *
 * Combines brand, catalog number, chart, and description into a readable string
 * using the following rules:
 *
 * - The primary part consists of the brand and catalog number:
 *   - The brand (if present) appears first.
 *   - The catalog number (if present) is prefixed with `#` and appended after
 *     the brand, separated by a single space (e.g. `"DMC #310"`).
 * - The secondary part consists of the chart and description:
 *   - The chart is omitted if it is `null`/empty or exactly equal to
 *     `threadCatalogNumber`.
 *   - The chart (when shown) and the description are joined with a single
 *     space (e.g. `"Anchor 24-colour Black"`).
 * - The primary and secondary parts are joined with `" • "` (space, bullet,
 *   space). If either part is empty, only the non-empty part is returned.
 *
 * Examples:
 *
 * - Brand and catalog only:
 *   - Input:
 *     - `threadBrand: "DMC"`
 *     - `threadCatalogNumber: "310"`
 *     - `threadChart: null`
 *     - `threadDescription: null`
 *   - Output: `"DMC #310"`
 *
 * - Brand, catalog, and description:
 *   - Input:
 *     - `threadBrand: "DMC"`
 *     - `threadCatalogNumber: "310"`
 *     - `threadChart: null`
 *     - `threadDescription: "Black"`
 *   - Output: `"DMC #310 • Black"`
 *
 * - Brand, catalog, chart (different from catalog), and description:
 *   - Input:
 *     - `threadBrand: "Anchor"`
 *     - `threadCatalogNumber: "403"`
 *     - `threadChart: "24-colour"`
 *     - `threadDescription: "Black"`
 *   - Output: `"Anchor #403 • 24-colour Black"`
 *
 * - Chart equal to catalog number (chart omitted):
 *   - Input:
 *     - `threadBrand: "DMC"`
 *     - `threadCatalogNumber: "310"`
 *     - `threadChart: "310"`
 *     - `threadDescription: "Black"`
 *   - Output: `"DMC #310 • Black"`
 */

interface ThreadMetadata {
  threadBrand: string | null;
  threadCatalogNumber: string | null;
  threadChart: string | null;
  threadDescription: string | null;
}

export function formatThreadMetadata(thread: ThreadMetadata): string {
  // Primary metadata: brand and catalog number
  const primaryMetadata = [
    thread.threadBrand,
    thread.threadCatalogNumber ? `#${thread.threadCatalogNumber}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  // Secondary metadata: chart and description
  // Only show chart if it's different from catalogNumber
  const secondaryMetadata = [
    thread.threadChart && thread.threadChart !== thread.threadCatalogNumber
      ? thread.threadChart
      : null,
    thread.threadDescription,
  ]
    .filter(Boolean)
    .join(" ");

  return [primaryMetadata, secondaryMetadata].filter(Boolean).join(" • ");
}
