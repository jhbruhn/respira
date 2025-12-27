/**
 * getDisplayFilename Utility
 *
 * Determines which filename to display based on priority:
 * 1. currentFileName (from pattern store)
 * 2. localFileName (from file input)
 * 3. resumeFileName (from cache)
 * 4. Empty string
 */

export function getDisplayFilename(options: {
  currentFileName: string | null;
  localFileName: string;
  resumeFileName: string | null;
}): string {
  return (
    options.currentFileName ||
    options.localFileName ||
    options.resumeFileName ||
    ""
  );
}
