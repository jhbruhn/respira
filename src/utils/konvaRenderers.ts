import Konva from 'konva';
import type { PesPatternData } from '../formats/import/pesImporter';
import { getThreadColor } from '../formats/import/pesImporter';
import type { MachineInfo } from '../types/machine';
import { MOVE } from '../formats/import/constants';

/**
 * Renders a grid with specified spacing
 */
export function renderGrid(
  layer: Konva.Layer,
  gridSize: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  machineInfo: MachineInfo | null
): void {
  const gridGroup = new Konva.Group({ name: 'grid' });

  // Determine grid bounds based on hoop or pattern
  const gridMinX = machineInfo ? -machineInfo.maxWidth / 2 : bounds.minX;
  const gridMaxX = machineInfo ? machineInfo.maxWidth / 2 : bounds.maxX;
  const gridMinY = machineInfo ? -machineInfo.maxHeight / 2 : bounds.minY;
  const gridMaxY = machineInfo ? machineInfo.maxHeight / 2 : bounds.maxY;

  // Vertical lines
  for (let x = Math.floor(gridMinX / gridSize) * gridSize; x <= gridMaxX; x += gridSize) {
    const line = new Konva.Line({
      points: [x, gridMinY, x, gridMaxY],
      stroke: '#e0e0e0',
      strokeWidth: 1,
    });
    gridGroup.add(line);
  }

  // Horizontal lines
  for (let y = Math.floor(gridMinY / gridSize) * gridSize; y <= gridMaxY; y += gridSize) {
    const line = new Konva.Line({
      points: [gridMinX, y, gridMaxX, y],
      stroke: '#e0e0e0',
      strokeWidth: 1,
    });
    gridGroup.add(line);
  }

  layer.add(gridGroup);
}

/**
 * Renders the origin crosshair at (0,0)
 */
export function renderOrigin(layer: Konva.Layer): void {
  const originGroup = new Konva.Group({ name: 'origin' });

  // Horizontal line
  const hLine = new Konva.Line({
    points: [-10, 0, 10, 0],
    stroke: '#888',
    strokeWidth: 2,
  });

  // Vertical line
  const vLine = new Konva.Line({
    points: [0, -10, 0, 10],
    stroke: '#888',
    strokeWidth: 2,
  });

  originGroup.add(hLine, vLine);
  layer.add(originGroup);
}

/**
 * Renders the hoop boundary and label
 */
export function renderHoop(layer: Konva.Layer, machineInfo: MachineInfo): void {
  const hoopGroup = new Konva.Group({ name: 'hoop' });

  const hoopWidth = machineInfo.maxWidth;
  const hoopHeight = machineInfo.maxHeight;

  // Hoop is centered at origin (0, 0)
  const hoopLeft = -hoopWidth / 2;
  const hoopTop = -hoopHeight / 2;

  // Hoop boundary rectangle
  const rect = new Konva.Rect({
    x: hoopLeft,
    y: hoopTop,
    width: hoopWidth,
    height: hoopHeight,
    stroke: '#2196F3',
    strokeWidth: 3,
    dash: [10, 5],
  });

  // Hoop label
  const label = new Konva.Text({
    x: hoopLeft + 10,
    y: hoopTop + 10,
    text: `Hoop: ${(hoopWidth / 10).toFixed(0)} x ${(hoopHeight / 10).toFixed(0)} mm`,
    fontSize: 14,
    fontFamily: 'sans-serif',
    fontStyle: 'bold',
    fill: '#2196F3',
  });

  hoopGroup.add(rect, label);
  layer.add(hoopGroup);
}

/**
 * Renders embroidery stitches consolidated by color and completion status
 */
export function renderStitches(
  container: Konva.Layer | Konva.Group,
  stitches: number[][],
  pesData: PesPatternData,
  currentStitchIndex: number
): void {
  const stitchesGroup = new Konva.Group({ name: 'stitches' });

  // Group stitches by color, completion status, and type (stitch vs jump)
  interface StitchGroup {
    color: string;
    points: number[];
    completed: boolean;
    isJump: boolean;
  }

  const groups: StitchGroup[] = [];
  let currentGroup: StitchGroup | null = null;

  for (let i = 0; i < stitches.length; i++) {
    const stitch = stitches[i];
    const [x, y, cmd, colorIndex] = stitch;
    const isCompleted = i < currentStitchIndex;
    const isJump = (cmd & MOVE) !== 0;
    const color = getThreadColor(pesData, colorIndex);

    // Start new group if color/status/type changes, or if it's the first stitch
    if (
      !currentGroup ||
      currentGroup.color !== color ||
      currentGroup.completed !== isCompleted ||
      currentGroup.isJump !== isJump
    ) {
      currentGroup = {
        color,
        points: [x, y],
        completed: isCompleted,
        isJump,
      };
      groups.push(currentGroup);
    } else {
      // Continue the current group
      currentGroup.points.push(x, y);
    }
  }

  // Create Konva.Line for each group
  groups.forEach((group) => {
    if (group.isJump) {
      // Jump stitches - dashed lines in thread color
      const line = new Konva.Line({
        points: group.points,
        stroke: group.color,
        strokeWidth: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
        dash: [5, 5],
        opacity: group.completed ? 0.6 : 0.25,
      });
      stitchesGroup.add(line);
    } else {
      // Regular stitches - solid lines with actual thread color
      const line = new Konva.Line({
        points: group.points,
        stroke: group.color,
        strokeWidth: 1.5,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: group.completed ? 1.0 : 0.3,
      });
      stitchesGroup.add(line);
    }
  });

  container.add(stitchesGroup);
}

/**
 * Renders pattern bounds rectangle
 */
export function renderPatternBounds(
  container: Konva.Layer | Konva.Group,
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
): void {
  const { minX, maxX, minY, maxY } = bounds;
  const patternWidth = maxX - minX;
  const patternHeight = maxY - minY;

  const rect = new Konva.Rect({
    x: minX,
    y: minY,
    width: patternWidth,
    height: patternHeight,
    stroke: '#ff0000',
    strokeWidth: 2,
    dash: [5, 5],
  });

  container.add(rect);
}

/**
 * Renders the current position indicator
 */
export function renderCurrentPosition(
  container: Konva.Layer | Konva.Group,
  currentStitchIndex: number,
  stitches: number[][]
): void {
  if (currentStitchIndex <= 0 || currentStitchIndex >= stitches.length) return;

  const stitch = stitches[currentStitchIndex];
  const [x, y] = stitch;

  const posGroup = new Konva.Group({ name: 'currentPosition' });

  // Circle with fill
  const circle = new Konva.Circle({
    x,
    y,
    radius: 8,
    fill: 'rgba(255, 0, 0, 0.3)',
    stroke: '#ff0000',
    strokeWidth: 3,
  });

  // Crosshair lines
  const hLine1 = new Konva.Line({
    points: [x - 12, y, x - 3, y],
    stroke: '#ff0000',
    strokeWidth: 2,
  });

  const hLine2 = new Konva.Line({
    points: [x + 12, y, x + 3, y],
    stroke: '#ff0000',
    strokeWidth: 2,
  });

  const vLine1 = new Konva.Line({
    points: [x, y - 12, x, y - 3],
    stroke: '#ff0000',
    strokeWidth: 2,
  });

  const vLine2 = new Konva.Line({
    points: [x, y + 12, x, y + 3],
    stroke: '#ff0000',
    strokeWidth: 2,
  });

  posGroup.add(circle, hLine1, hLine2, vLine1, vLine2);
  container.add(posGroup);
}

/**
 * Renders thread color legend (positioned at top-left of viewport)
 */
export function renderLegend(
  layer: Konva.Layer,
  pesData: PesPatternData
): void {
  const legendGroup = new Konva.Group({ name: 'legend' });

  // Semi-transparent background for better readability
  const bgPadding = 8;
  const itemHeight = 25;
  const legendHeight = pesData.threads.length * itemHeight + bgPadding * 2;

  const background = new Konva.Rect({
    x: 10,
    y: 10,
    width: 100,
    height: legendHeight,
    fill: 'rgba(255, 255, 255, 0.9)',
    cornerRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowBlur: 4,
    shadowOffset: { x: 0, y: 2 },
  });
  legendGroup.add(background);

  let legendY = 10 + bgPadding;

  // Draw legend for each thread
  for (let i = 0; i < pesData.threads.length; i++) {
    const color = getThreadColor(pesData, i);

    // Color swatch
    const swatch = new Konva.Rect({
      x: 18,
      y: legendY,
      width: 20,
      height: 20,
      fill: color,
      stroke: '#000',
      strokeWidth: 1,
    });

    // Thread label
    const label = new Konva.Text({
      x: 43,
      y: legendY + 5,
      text: `Thread ${i + 1}`,
      fontSize: 12,
      fontFamily: 'sans-serif',
      fill: '#000',
    });

    legendGroup.add(swatch, label);
    legendY += itemHeight;
  }

  layer.add(legendGroup);
}

/**
 * Renders pattern dimensions text (positioned at bottom-right of viewport)
 */
export function renderDimensions(
  layer: Konva.Layer,
  patternWidth: number,
  patternHeight: number,
  stageWidth: number,
  stageHeight: number
): void {
  const dimensionText = `${(patternWidth / 10).toFixed(1)} x ${(patternHeight / 10).toFixed(1)} mm`;

  // Background for better readability
  const textWidth = 140;
  const textHeight = 30;
  const padding = 8;

  const background = new Konva.Rect({
    x: stageWidth - textWidth - padding - 10,
    y: stageHeight - textHeight - padding - 80, // Above zoom controls
    width: textWidth,
    height: textHeight,
    fill: 'rgba(255, 255, 255, 0.9)',
    cornerRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowBlur: 4,
    shadowOffset: { x: 0, y: 2 },
  });

  const text = new Konva.Text({
    x: stageWidth - textWidth - 10,
    y: stageHeight - textHeight - 80,
    width: textWidth,
    height: textHeight,
    text: dimensionText,
    fontSize: 14,
    fontFamily: 'sans-serif',
    fill: '#000',
    align: 'center',
    verticalAlign: 'middle',
  });

  layer.add(background, text);
}

/**
 * Calculates initial scale to fit the view (hoop or pattern)
 */
export function calculateInitialScale(
  stageWidth: number,
  stageHeight: number,
  viewWidth: number,
  viewHeight: number,
  padding: number = 40
): number {
  const scaleX = (stageWidth - 2 * padding) / viewWidth;
  const scaleY = (stageHeight - 2 * padding) / viewHeight;
  return Math.min(scaleX, scaleY);
}
