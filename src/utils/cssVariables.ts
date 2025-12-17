/**
 * Get CSS variable value from document root
 */
export function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Canvas color helpers
 */
export const canvasColors = {
  grid: () => getCSSVariable('--color-canvas-grid'),
  origin: () => getCSSVariable('--color-canvas-origin'),
  hoop: () => getCSSVariable('--color-canvas-hoop'),
  bounds: () => getCSSVariable('--color-canvas-bounds'),
  position: () => getCSSVariable('--color-canvas-position'),
};
