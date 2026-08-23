/**
 * Physical geometry of the Brother PP-1 embroidery hoop and its 4 fiducial
 * "vision" markers, used to register a photo of the hooped fabric into the
 * machine's coordinate system.
 *
 * All derived coordinates are expressed in the app's internal unit: **0.1mm,
 * hoop-center-relative** (millimetres × 10), with +X right and +Y down, exactly
 * matching the Konva canvas / embroidery coordinate space. Convert with mm × 10.
 */

/** Millimetres → internal 0.1mm units. */
export const MM = 10;

/** Inner opening of the hoop is a 129.5mm square, centered on the origin. */
export const HOOP_INNER_MM = 129.5;

/** Side length of each (identical) square fiducial marker. */
export const MARKER_SIZE_MM = 12;

/**
 * Distance from the inner edge the marker is offset *along* (parallel to), to
 * the marker's near edge. For the top marker this is measured horizontally from
 * the left inner edge to the marker's left edge.
 */
export const MARKER_INSET_MM = 24;

/**
 * Perpendicular gap from the inner edge the marker sits *beyond*, to the
 * marker's near edge. For the top marker this is the vertical gap from the top
 * inner edge up to the marker's bottom edge.
 */
export const MARKER_EDGE_GAP_MM = 6;

/** Half the inner opening, in 0.1mm units (± this is an inner edge). */
export const HOOP_INNER_HALF = (HOOP_INNER_MM * MM) / 2; // 647.5

/** Marker side length, in 0.1mm units. */
export const MARKER_SIZE = MARKER_SIZE_MM * MM; // 120

export type Point = { x: number; y: number };

/** Which side of the frame a marker sits on. Markers are in a 90° pinwheel. */
export type MarkerSide = "top" | "right" | "bottom" | "left";

export interface MarkerGeometry {
  side: MarkerSide;
  /** Center of the marker square, in 0.1mm hoop-center units. */
  center: Point;
  /** The 4 corners [TL, TR, BR, BL] of the axis-aligned marker square. */
  corners: [Point, Point, Point, Point];
}

/** Rotate a point 90° clockwise about the origin: (x, y) → (-y, x). */
function rotate90(p: Point): Point {
  return { x: -p.y, y: p.x };
}

/**
 * The top marker's center, derived from the physical measurements.
 *  - left edge  = -HOOP_INNER_HALF + inset      (24mm right of the left inner edge)
 *  - bottom edge = -HOOP_INNER_HALF - gap        (6mm above the top inner edge)
 * The marker square is axis-aligned, so its center is edge ± MARKER_SIZE/2.
 */
const TOP_MARKER_LEFT = -HOOP_INNER_HALF + MARKER_INSET_MM * MM; // -407.5
const TOP_MARKER_BOTTOM = -HOOP_INNER_HALF - MARKER_EDGE_GAP_MM * MM; // -707.5
const TOP_MARKER_CENTER: Point = {
  x: TOP_MARKER_LEFT + MARKER_SIZE / 2, // -347.5
  y: TOP_MARKER_BOTTOM - MARKER_SIZE / 2, // -767.5
};

/** Corners of an axis-aligned square marker of size MARKER_SIZE about `center`. */
function markerCorners(center: Point): [Point, Point, Point, Point] {
  const h = MARKER_SIZE / 2;
  return [
    { x: center.x - h, y: center.y - h }, // TL
    { x: center.x + h, y: center.y - h }, // TR
    { x: center.x + h, y: center.y + h }, // BR
    { x: center.x - h, y: center.y + h }, // BL
  ];
}

const SIDES: MarkerSide[] = ["top", "right", "bottom", "left"];

/**
 * All four markers, in order [top, right, bottom, left], generated from the top
 * marker by successive 90° clockwise rotations about the hoop center.
 *
 * Centers (0.1mm units):
 *   top    (-347.5, -767.5)
 *   right  ( 767.5, -347.5)
 *   bottom ( 347.5,  767.5)
 *   left   (-767.5,  347.5)
 */
export const MARKERS: MarkerGeometry[] = (() => {
  const out: MarkerGeometry[] = [];
  let center = TOP_MARKER_CENTER;
  for (let i = 0; i < 4; i++) {
    out.push({ side: SIDES[i], center, corners: markerCorners(center) });
    center = rotate90(center);
  }
  return out;
})();

/** Marker centers in canonical [top, right, bottom, left] order. */
export const MARKER_CENTERS: Record<MarkerSide, Point> = Object.fromEntries(
  MARKERS.map((m) => [m.side, m.center]),
) as Record<MarkerSide, Point>;

/** Flat list of all 16 marker corners, grouped by marker (for a 16-point fit). */
export const MARKER_CORNERS: Point[] = MARKERS.flatMap((m) => m.corners);

/** Largest |x| or |y| among the marker corners (~827.5), i.e. how far the
 *  frame-mounted markers reach from the hoop center. */
const MARKER_MAX_EXTENT = Math.max(
  ...MARKER_CORNERS.map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))),
);

/**
 * Half-extent (0.1mm units) of the canvas region the photo is warped into.
 * Cropped to just beyond the markers so the view reaches the outer edge of the
 * hoop frame (showing the whole hoop + markers) without the surrounding table.
 * The small margin keeps the outer markers fully visible for the marker check.
 */
export const HOOP_VIEW_HALF = MARKER_MAX_EXTENT + 40; // ≈ 867.5 (86.75mm half)

/**
 * Classify a point (relative to the centroid of the 4 marker points) to the
 * frame side it belongs to. Works despite the pinwheel offset because each
 * marker's perpendicular distance from center dominates its along-edge offset.
 */
export function classifyMarkerSide(dx: number, dy: number): MarkerSide {
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy < 0 ? "top" : "bottom";
  }
  return dx > 0 ? "right" : "left";
}
