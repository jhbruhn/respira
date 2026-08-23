import { Image as KonvaImage } from "react-konva";
import { useShallow } from "zustand/react/shallow";
import { useHoopImageStore } from "../../stores/useHoopImageStore";
import { WARP_HALF } from "../../utils/imageWarp";

/**
 * Renders the aligned hoop photo as a background image on the canvas.
 *
 * The warped bitmap covers the inner hoop opening, so it is placed exactly like
 * the `Hoop` rect — centered on the origin, spanning [-WARP_HALF, WARP_HALF] in
 * both axes (0.1mm units). Because it lives inside the Konva Stage it inherits
 * the same pan/zoom transform as the pattern and grid automatically.
 */
export function HoopBackground() {
  const { warped, opacity, visible, status } = useHoopImageStore(
    useShallow((s) => ({
      warped: s.warped,
      opacity: s.opacity,
      visible: s.visible,
      status: s.status,
    })),
  );

  if (!warped || !visible || status !== "aligned") return null;

  return (
    <KonvaImage
      image={warped}
      x={-WARP_HALF}
      y={-WARP_HALF}
      width={WARP_HALF * 2}
      height={WARP_HALF * 2}
      opacity={opacity}
      listening={false}
    />
  );
}
