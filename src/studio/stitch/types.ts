/**
 * Studio stitch-generation types
 *
 * The Studio module turns vector shapes into embroidery stitches. All geometry
 * inside the module works in millimetres with a Y-down coordinate system (same
 * orientation as SVG and the Konva canvas). Conversion to respira's internal
 * 0.1 mm units happens once, in `export/toPesPatternData.ts`.
 */

/** A 2D point in millimetres. */
export interface Point {
  x: number;
  y: number;
}

/**
 * A closed ring of points (polygon contour). The first and last point are NOT
 * required to be equal; the ring is treated as implicitly closed.
 */
export type Ring = Point[];

/**
 * A polygon with one outer ring and zero or more hole rings.
 * Winding is normalised by the geometry helpers (outer = CCW, holes = CW) but
 * consumers should not rely on a specific winding and instead use the helpers.
 */
export interface Polygon {
  outer: Ring;
  holes: Ring[];
}

/** A named vector shape imported into the Studio document. */
export interface StudioShape {
  id: string;
  /** Display name, derived from the SVG element id/label or a fallback. */
  name: string;
  /** One or more closed polygons that make up this shape (e.g. the dot of an "i"). */
  polygons: Polygon[];
  /** Open polylines (from `<polyline>` / `<line>` / unclosed paths) — stroke only. */
  openPaths: Point[][];
  /** Thread colour as `#RRGGBB`. */
  color: string;
  /** Whether to stitch a tatami fill for the interior. */
  fill: boolean;
  /** Whether to stitch a running-stitch outline along every ring. */
  stroke: boolean;
  /** Per-shape fill settings; falls back to document defaults when a field is undefined. */
  fillSettings: Partial<TatamiSettings>;
  /** Per-shape running-stitch settings. */
  strokeSettings: Partial<RunningStitchSettings>;
}

/** Tatami (parallel-row) fill parameters. Distances in millimetres, angle in degrees. */
export interface TatamiSettings {
  /** Distance between adjacent rows (fill density). */
  rowSpacing: number;
  /** Maximum length of a single stitch along a row. */
  maxStitchLen: number;
  /** Row orientation in degrees (0 = horizontal rows). */
  angle: number;
  /**
   * Stagger fraction: successive rows shift their stitch pattern by
   * `(rowIndex mod staggerRows) / staggerRows * maxStitchLen` so needle
   * penetration points do not line up between rows.
   */
  staggerRows: number;
  /** Add a sparse underlay pass (edge run + widely spaced rows) before the top layer. */
  underlay: boolean;
}

/** Running-stitch (outline) parameters. */
export interface RunningStitchSettings {
  /** Target spacing between needle penetrations along the path. */
  stitchLen: number;
  /** Stitch each segment three times (there-back-there) for a bolder line. */
  triple: boolean;
}

export const DEFAULT_TATAMI: TatamiSettings = {
  rowSpacing: 0.4,
  maxStitchLen: 3,
  angle: 0,
  staggerRows: 4,
  underlay: true,
};

export const DEFAULT_RUNNING_STITCH: RunningStitchSettings = {
  stitchLen: 2.5,
  triple: false,
};

/**
 * An ordered polyline of needle points for one continuous run of the needle.
 * `color` is the `#RRGGBB` thread colour. Consecutive paths of the same colour
 * are joined with a jump; a colour change additionally emits a trim + stop.
 */
export interface StitchPath {
  points: Point[];
  color: string;
  /** Origin of the path, useful for debugging / preview styling. */
  kind: "underlay" | "fill" | "stroke";
}

/** The full ordered plan for a design, before conversion to PEN/PES. */
export interface StitchPlan {
  paths: StitchPath[];
  /** Ordered list of distinct thread colours, one entry per colour block. */
  colors: string[];
}
