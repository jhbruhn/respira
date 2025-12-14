import { memo, useMemo } from 'react';
import { Group, Line, Rect, Text, Circle } from 'react-konva';
import type { PesPatternData } from '../formats/import/pesImporter';
import { getThreadColor } from '../formats/import/pesImporter';
import type { MachineInfo } from '../types/machine';
import { MOVE } from '../formats/import/constants';

interface GridProps {
  gridSize: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  machineInfo: MachineInfo | null;
}

export const Grid = memo(({ gridSize, bounds, machineInfo }: GridProps) => {
  const lines = useMemo(() => {
    const gridMinX = machineInfo ? -machineInfo.maxWidth / 2 : bounds.minX;
    const gridMaxX = machineInfo ? machineInfo.maxWidth / 2 : bounds.maxX;
    const gridMinY = machineInfo ? -machineInfo.maxHeight / 2 : bounds.minY;
    const gridMaxY = machineInfo ? machineInfo.maxHeight / 2 : bounds.maxY;

    const verticalLines: number[][] = [];
    const horizontalLines: number[][] = [];

    // Vertical lines
    for (let x = Math.floor(gridMinX / gridSize) * gridSize; x <= gridMaxX; x += gridSize) {
      verticalLines.push([x, gridMinY, x, gridMaxY]);
    }

    // Horizontal lines
    for (let y = Math.floor(gridMinY / gridSize) * gridSize; y <= gridMaxY; y += gridSize) {
      horizontalLines.push([gridMinX, y, gridMaxX, y]);
    }

    return { verticalLines, horizontalLines };
  }, [gridSize, bounds, machineInfo]);

  // Detect dark mode
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const gridColor = isDarkMode ? '#404040' : '#e0e0e0';

  return (
    <Group name="grid">
      {lines.verticalLines.map((points, i) => (
        <Line
          key={`v-${i}`}
          points={points}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}
      {lines.horizontalLines.map((points, i) => (
        <Line
          key={`h-${i}`}
          points={points}
          stroke={gridColor}
          strokeWidth={1}
        />
      ))}
    </Group>
  );
});

Grid.displayName = 'Grid';

export const Origin = memo(() => {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const originColor = isDarkMode ? '#999' : '#888';

  return (
    <Group name="origin">
      <Line points={[-10, 0, 10, 0]} stroke={originColor} strokeWidth={2} />
      <Line points={[0, -10, 0, 10]} stroke={originColor} strokeWidth={2} />
    </Group>
  );
});

Origin.displayName = 'Origin';

interface HoopProps {
  machineInfo: MachineInfo;
}

export const Hoop = memo(({ machineInfo }: HoopProps) => {
  const { maxWidth, maxHeight } = machineInfo;
  const hoopLeft = -maxWidth / 2;
  const hoopTop = -maxHeight / 2;

  return (
    <Group name="hoop">
      <Rect
        x={hoopLeft}
        y={hoopTop}
        width={maxWidth}
        height={maxHeight}
        stroke="#2196F3"
        strokeWidth={3}
        dash={[10, 5]}
      />
      <Text
        x={hoopLeft + 10}
        y={hoopTop + 10}
        text={`Hoop: ${(maxWidth / 10).toFixed(0)} x ${(maxHeight / 10).toFixed(0)} mm`}
        fontSize={14}
        fontFamily="sans-serif"
        fontStyle="bold"
        fill="#2196F3"
      />
    </Group>
  );
});

Hoop.displayName = 'Hoop';

interface PatternBoundsProps {
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export const PatternBounds = memo(({ bounds }: PatternBoundsProps) => {
  const { minX, maxX, minY, maxY } = bounds;
  const width = maxX - minX;
  const height = maxY - minY;

  return (
    <Rect
      x={minX}
      y={minY}
      width={width}
      height={height}
      stroke="#ff0000"
      strokeWidth={2}
      dash={[5, 5]}
    />
  );
});

PatternBounds.displayName = 'PatternBounds';

interface StitchesProps {
  stitches: number[][];
  pesData: PesPatternData;
  currentStitchIndex: number;
  showProgress?: boolean;
}

export const Stitches = memo(({ stitches, pesData, currentStitchIndex, showProgress = false }: StitchesProps) => {
  const stitchGroups = useMemo(() => {
    interface StitchGroup {
      color: string;
      points: number[];
      completed: boolean;
      isJump: boolean;
    }

    const groups: StitchGroup[] = [];
    let currentGroup: StitchGroup | null = null;

    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < stitches.length; i++) {
      const stitch = stitches[i];
      const [x, y, cmd, colorIndex] = stitch;
      const isCompleted = i < currentStitchIndex;
      const isJump = (cmd & MOVE) !== 0;
      const color = getThreadColor(pesData, colorIndex);

      // Start new group if color/status/type changes
      if (
        !currentGroup ||
        currentGroup.color !== color ||
        currentGroup.completed !== isCompleted ||
        currentGroup.isJump !== isJump
      ) {
        // For jump stitches, we need to create a line from previous position to current position
        // So we include both the previous point and current point
        if (isJump && i > 0) {
          currentGroup = {
            color,
            points: [prevX, prevY, x, y],
            completed: isCompleted,
            isJump,
          };
        } else {
          currentGroup = {
            color,
            points: [x, y],
            completed: isCompleted,
            isJump,
          };
        }
        groups.push(currentGroup);
      } else {
        currentGroup.points.push(x, y);
      }

      prevX = x;
      prevY = y;
    }

    return groups;
  }, [stitches, pesData, currentStitchIndex]);

  return (
    <Group name="stitches">
      {stitchGroups.map((group, i) => (
        <Line
          key={i}
          points={group.points}
          stroke={group.color}
          strokeWidth={group.isJump ? 1.5 : 1.5}
          lineCap="round"
          lineJoin="round"
          dash={group.isJump ? [8, 4] : undefined}
          opacity={group.isJump ? (group.completed ? 0.8 : 0.5) : (showProgress && !group.completed ? 0.3 : 1.0)}
        />
      ))}
    </Group>
  );
});

Stitches.displayName = 'Stitches';

interface CurrentPositionProps {
  currentStitchIndex: number;
  stitches: number[][];
}

export const CurrentPosition = memo(({ currentStitchIndex, stitches }: CurrentPositionProps) => {
  if (currentStitchIndex <= 0 || currentStitchIndex >= stitches.length) {
    return null;
  }

  const [x, y] = stitches[currentStitchIndex];

  return (
    <Group name="currentPosition">
      <Circle
        x={x}
        y={y}
        radius={8}
        fill="rgba(255, 0, 0, 0.3)"
        stroke="#ff0000"
        strokeWidth={3}
      />
      <Line points={[x - 12, y, x - 3, y]} stroke="#ff0000" strokeWidth={2} />
      <Line points={[x + 12, y, x + 3, y]} stroke="#ff0000" strokeWidth={2} />
      <Line points={[x, y - 12, x, y - 3]} stroke="#ff0000" strokeWidth={2} />
      <Line points={[x, y + 12, x, y + 3]} stroke="#ff0000" strokeWidth={2} />
    </Group>
  );
});

CurrentPosition.displayName = 'CurrentPosition';
