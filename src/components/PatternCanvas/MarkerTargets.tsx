import { Group, Rect, Line } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useHoopImageStore } from "../../stores/useHoopImageStore";
import { MARKERS, MARKER_SIZE } from "../../constants/hoopGeometry";

/**
 * Marker-check overlay (toggled from the Hoop Photo card): draws the four
 * expected fiducial-marker squares (12mm) at the positions this app assumes,
 * plus a crosshair at each center. When the warped hoop photo is shown, the
 * photo's real white markers should land inside these squares — a quick visual
 * confirmation that the registration is correct.
 */
export function MarkerTargets() {
  const { status, showMarkerCheck } = useHoopImageStore(
    useShallow((s) => ({
      status: s.status,
      showMarkerCheck: s.showMarkerCheck,
    })),
  );

  if (status !== "aligned" || !showMarkerCheck) return null;

  const half = MARKER_SIZE / 2;
  const color = "#ff2d95"; // bright magenta, hard to miss over fabric

  return (
    <Group name="marker-targets" listening={false}>
      {MARKERS.map((m) => (
        <Group key={m.side}>
          <Rect
            x={m.center.x - half}
            y={m.center.y - half}
            width={MARKER_SIZE}
            height={MARKER_SIZE}
            stroke={color}
            strokeWidth={3}
            dash={[8, 4]}
          />
          {/* center crosshair */}
          <Line
            points={[m.center.x - 20, m.center.y, m.center.x + 20, m.center.y]}
            stroke={color}
            strokeWidth={2}
          />
          <Line
            points={[m.center.x, m.center.y - 20, m.center.x, m.center.y + 20]}
            stroke={color}
            strokeWidth={2}
          />
        </Group>
      ))}
    </Group>
  );
}
