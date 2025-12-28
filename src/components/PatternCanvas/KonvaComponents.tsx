import { memo, useMemo } from "react";
import { Group, Line, Rect, Text, Circle } from "react-konva";
import type { PesPatternData } from "../../formats/import/pesImporter";
import { getThreadColor } from "../../formats/import/pesImporter";
import type { MachineInfo } from "../../types/machine";
import { MOVE } from "../../formats/import/constants";
import { canvasColors } from "../../utils/cssVariables";

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
    for (
      let x = Math.floor(gridMinX / gridSize) * gridSize;
      x <= gridMaxX;
      x += gridSize
    ) {
      verticalLines.push([x, gridMinY, x, gridMaxY]);
    }

    // Horizontal lines
    for (
      let y = Math.floor(gridMinY / gridSize) * gridSize;
      y <= gridMaxY;
      y += gridSize
    ) {
      horizontalLines.push([gridMinX, y, gridMaxX, y]);
    }

    return { verticalLines, horizontalLines };
  }, [gridSize, bounds, machineInfo]);

  const gridColor = canvasColors.grid();

  return (
    <Group name="grid" listening={false}>
      {lines.verticalLines.map((points, i) => (
        <Line
          key={`v-${i}`}
          points={points}
          stroke={gridColor}
          strokeWidth={1}
          listening={false}
        />
      ))}
      {lines.horizontalLines.map((points, i) => (
        <Line
          key={`h-${i}`}
          points={points}
          stroke={gridColor}
          strokeWidth={1}
          listening={false}
        />
      ))}
    </Group>
  );
});

Grid.displayName = "Grid";

export const Origin = memo(() => {
  const originColor = canvasColors.origin();

  return (
    <Group name="origin" listening={false}>
      <Line
        points={[-10, 0, 10, 0]}
        stroke={originColor}
        strokeWidth={2}
        listening={false}
      />
      <Line
        points={[0, -10, 0, 10]}
        stroke={originColor}
        strokeWidth={2}
        listening={false}
      />
    </Group>
  );
});

Origin.displayName = "Origin";

interface HoopProps {
  machineInfo: MachineInfo;
}

export const Hoop = memo(({ machineInfo }: HoopProps) => {
  const { maxWidth, maxHeight } = machineInfo;
  const hoopLeft = -maxWidth / 2;
  const hoopTop = -maxHeight / 2;
  const hoopColor = canvasColors.hoop();

  return (
    <Group name="hoop" listening={false}>
      <Rect
        x={hoopLeft}
        y={hoopTop}
        width={maxWidth}
        height={maxHeight}
        stroke={hoopColor}
        strokeWidth={3}
        dash={[10, 5]}
        listening={false}
      />
      <Text
        x={hoopLeft + 10}
        y={hoopTop + 10}
        text={`Hoop: ${(maxWidth / 10).toFixed(0)} x ${(maxHeight / 10).toFixed(0)} mm`}
        fontSize={14}
        fontFamily="sans-serif"
        fontStyle="bold"
        fill={hoopColor}
        listening={false}
      />
    </Group>
  );
});

Hoop.displayName = "Hoop";

interface PatternBoundsProps {
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export const PatternBounds = memo(({ bounds }: PatternBoundsProps) => {
  const { minX, maxX, minY, maxY } = bounds;
  const width = maxX - minX;
  const height = maxY - minY;
  const boundsColor = canvasColors.bounds();

  return (
    <Rect
      x={minX}
      y={minY}
      width={width}
      height={height}
      stroke={boundsColor}
      strokeWidth={2}
      dash={[5, 5]}
    />
  );
});

PatternBounds.displayName = "PatternBounds";

interface StitchesProps {
  stitches: number[][];
  pesData: PesPatternData;
  currentStitchIndex: number;
  showProgress?: boolean;
}

export const Stitches = memo(
  ({
    stitches,
    pesData,
    currentStitchIndex,
    showProgress = false,
  }: StitchesProps) => {
    // PERFORMANCE OPTIMIZATION:
    // Separate static group structure (doesn't change during sewing)
    // from dynamic completion status (changes with currentStitchIndex).
    // This prevents recalculating all groups on every progress update.
    //
    // For very large patterns (>100k stitches), consider:
    // - Virtualization: render only visible stitches based on viewport
    // - LOD (Level of Detail): reduce stitch density when zoomed out
    // - Web Workers: offload grouping calculations to background thread

    interface StaticStitchGroup {
      color: string;
      points: number[];
      isJump: boolean;
      startIndex: number; // First stitch index in this group
      endIndex: number; // Last stitch index in this group
    }

    // Static grouping - only recalculates when stitches or colors change
    const staticGroups = useMemo(() => {
      const groups: StaticStitchGroup[] = [];
      let currentGroup: StaticStitchGroup | null = null;

      let prevX = 0;
      let prevY = 0;

      for (let i = 0; i < stitches.length; i++) {
        const stitch = stitches[i];
        const [x, y, cmd, colorIndex] = stitch;
        const isJump = (cmd & MOVE) !== 0;
        const color = getThreadColor(pesData, colorIndex);

        // Start new group if color or type changes (NOT completion status)
        if (
          !currentGroup ||
          currentGroup.color !== color ||
          currentGroup.isJump !== isJump
        ) {
          // For jump stitches, include previous position
          if (isJump && i > 0) {
            currentGroup = {
              color,
              points: [prevX, prevY, x, y],
              isJump,
              startIndex: i,
              endIndex: i,
            };
          } else {
            currentGroup = {
              color,
              points: [x, y],
              isJump,
              startIndex: i,
              endIndex: i,
            };
          }
          groups.push(currentGroup);
        } else {
          currentGroup.points.push(x, y);
          currentGroup.endIndex = i;
        }

        prevX = x;
        prevY = y;
      }

      return groups;
    }, [stitches, pesData]);

    // Dynamic grouping - adds completion status based on currentStitchIndex
    // Only needs to check group boundaries, not rebuild everything
    const stitchGroups = useMemo(() => {
      interface StitchGroup {
        color: string;
        points: number[];
        completed: boolean;
        isJump: boolean;
      }

      const groups: StitchGroup[] = [];

      for (const staticGroup of staticGroups) {
        // Check if this group needs to be split based on completion
        if (
          currentStitchIndex > staticGroup.startIndex &&
          currentStitchIndex <= staticGroup.endIndex
        ) {
          // Group is partially completed - need to split
          // This is rare during sewing (only happens when crossing group boundaries)

          // Rebuild this group with completion split
          let currentSubGroup: StitchGroup | null = null;
          const groupStitches = stitches.slice(
            staticGroup.startIndex,
            staticGroup.endIndex + 1,
          );

          let prevX =
            staticGroup.startIndex > 0
              ? stitches[staticGroup.startIndex - 1][0]
              : 0;
          let prevY =
            staticGroup.startIndex > 0
              ? stitches[staticGroup.startIndex - 1][1]
              : 0;

          for (let i = 0; i < groupStitches.length; i++) {
            const absoluteIndex = staticGroup.startIndex + i;
            const stitch = groupStitches[i];
            const [x, y] = stitch;
            const isCompleted = absoluteIndex < currentStitchIndex;

            if (!currentSubGroup || currentSubGroup.completed !== isCompleted) {
              if (staticGroup.isJump && i > 0) {
                currentSubGroup = {
                  color: staticGroup.color,
                  points: [prevX, prevY, x, y],
                  completed: isCompleted,
                  isJump: staticGroup.isJump,
                };
              } else {
                currentSubGroup = {
                  color: staticGroup.color,
                  points: [x, y],
                  completed: isCompleted,
                  isJump: staticGroup.isJump,
                };
              }
              groups.push(currentSubGroup);
            } else {
              currentSubGroup.points.push(x, y);
            }

            prevX = x;
            prevY = y;
          }
        } else {
          // Group is fully completed or fully incomplete
          groups.push({
            color: staticGroup.color,
            points: staticGroup.points,
            completed: currentStitchIndex > staticGroup.endIndex,
            isJump: staticGroup.isJump,
          });
        }
      }

      return groups;
    }, [staticGroups, currentStitchIndex, stitches]);

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
            opacity={
              group.isJump
                ? group.completed
                  ? 0.8
                  : 0.5
                : showProgress && !group.completed
                  ? 0.3
                  : 1.0
            }
          />
        ))}
      </Group>
    );
  },
  // Custom comparison to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Re-render only if these values actually changed
    return (
      prevProps.stitches === nextProps.stitches &&
      prevProps.pesData === nextProps.pesData &&
      prevProps.currentStitchIndex === nextProps.currentStitchIndex &&
      prevProps.showProgress === nextProps.showProgress
    );
  },
);

Stitches.displayName = "Stitches";

interface CurrentPositionProps {
  currentStitchIndex: number;
  stitches: number[][];
}

export const CurrentPosition = memo(
  ({ currentStitchIndex, stitches }: CurrentPositionProps) => {
    if (currentStitchIndex <= 0 || currentStitchIndex >= stitches.length) {
      return null;
    }

    const [x, y] = stitches[currentStitchIndex];
    const positionColor = canvasColors.position();

    return (
      <Group name="currentPosition">
        <Circle
          x={x}
          y={y}
          radius={8}
          fill={`${positionColor}4d`}
          stroke={positionColor}
          strokeWidth={3}
        />
        <Line
          points={[x - 12, y, x - 3, y]}
          stroke={positionColor}
          strokeWidth={2}
        />
        <Line
          points={[x + 12, y, x + 3, y]}
          stroke={positionColor}
          strokeWidth={2}
        />
        <Line
          points={[x, y - 12, x, y - 3]}
          stroke={positionColor}
          strokeWidth={2}
        />
        <Line
          points={[x, y + 12, x, y + 3]}
          stroke={positionColor}
          strokeWidth={2}
        />
      </Group>
    );
  },
);

CurrentPosition.displayName = "CurrentPosition";
