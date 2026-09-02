/**
 * Tatami fill: parallel rows of running stitches covering a polygon interior,
 * with per-row stagger so needle penetration points do not line up.
 *
 * Algorithm:
 *  1. Rotate the polygon by -angle so rows are horizontal.
 *  2. Scan horizontal lines at each row centre; each line yields interior spans.
 *  3. Union spans of adjacent rows that overlap in x into connected components
 *     (this splits the fill correctly around holes and disjoint areas).
 *  4. Stitch each component boustrophedon (alternating row direction).
 *  5. Rotate results back by +angle.
 */

import type { Point, Polygon, StitchPath, TatamiSettings } from "./types";
import { DEFAULT_TATAMI } from "./types";
import {
  polygonScanlineSpans,
  polygonBounds,
  rotatePolygon,
  rotatePoint,
} from "../geometry/polygon";

function resolve(settings: Partial<TatamiSettings>): TatamiSettings {
  return { ...DEFAULT_TATAMI, ...settings };
}

interface Span {
  row: number;
  x0: number;
  x1: number;
}

class UnionFind {
  private parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    while (this.parent[i] !== i) {
      this.parent[i] = this.parent[this.parent[i]];
      i = this.parent[i];
    }
    return i;
  }
  union(a: number, b: number): void {
    this.parent[this.find(a)] = this.find(b);
  }
}

/** Generate tatami fill paths for a polygon. Returns one path per connected region. */
export function tatamiFill(
  poly: Polygon,
  color: string,
  settings: Partial<TatamiSettings> = {},
): StitchPath[] {
  const s = resolve(settings);
  if (s.rowSpacing <= 0 || s.maxStitchLen <= 0) return [];

  const paths: StitchPath[] = [];
  if (s.underlay) {
    paths.push(...underlayPaths(poly, color, s));
  }
  paths.push(
    ...rowFill(
      poly,
      color,
      s.angle,
      s.rowSpacing,
      s.maxStitchLen,
      s.staggerRows,
      "fill",
    ),
  );
  return paths;
}

/** Sparse perpendicular underlay pass — intentionally low density, for stability. */
function underlayPaths(
  poly: Polygon,
  color: string,
  s: TatamiSettings,
): StitchPath[] {
  const spacing = Math.max(s.rowSpacing * 6, 2);
  return rowFill(
    poly,
    color,
    s.angle + 90,
    spacing,
    Math.max(s.maxStitchLen, 3),
    1,
    "underlay",
  );
}

function rowFill(
  poly: Polygon,
  color: string,
  angleDeg: number,
  rowSpacing: number,
  maxStitchLen: number,
  staggerRows: number,
  kind: StitchPath["kind"],
): StitchPath[] {
  const angle = (angleDeg * Math.PI) / 180;
  const rotated = rotatePolygon(poly, -angle);
  const b = polygonBounds([rotated]);
  const height = b.maxY - b.minY;
  if (height <= 0) return [];

  const rowCount = Math.max(1, Math.floor(height / rowSpacing));
  const spans: Span[] = [];
  const spansByRow: Span[][] = [];
  for (let r = 0; r <= rowCount; r++) {
    const y = b.minY + (r + 0.5) * rowSpacing;
    if (y >= b.maxY) break;
    const rowSpans = polygonScanlineSpans(rotated, y).map(([x0, x1]) => ({
      row: r,
      x0,
      x1,
    }));
    spansByRow[r] = rowSpans;
    spans.push(...rowSpans);
  }
  if (spans.length === 0) return [];

  // Index spans and union adjacent overlapping ones.
  const index = new Map<Span, number>();
  spans.forEach((sp, i) => index.set(sp, i));
  const uf = new UnionFind(spans.length);
  for (let r = 0; r + 1 < spansByRow.length; r++) {
    const cur = spansByRow[r] ?? [];
    const nxt = spansByRow[r + 1] ?? [];
    for (const a of cur) {
      for (const c of nxt) {
        if (a.x0 < c.x1 && c.x0 < a.x1) uf.union(index.get(a)!, index.get(c)!);
      }
    }
  }

  // Group spans by component.
  const groups = new Map<number, Span[]>();
  for (const sp of spans) {
    const root = uf.find(index.get(sp)!);
    const list = groups.get(root) ?? [];
    list.push(sp);
    groups.set(root, list);
  }

  const result: StitchPath[] = [];
  for (const group of groups.values()) {
    const rows = new Map<number, Span[]>();
    for (const sp of group) {
      const list = rows.get(sp.row) ?? [];
      list.push(sp);
      rows.set(sp.row, list);
    }
    const orderedRows = [...rows.keys()].sort((x, y) => x - y);
    const points: Point[] = [];
    let flip = false;
    for (const r of orderedRows) {
      const y = b.minY + (r + 0.5) * rowSpacing;
      const phase = ((r % staggerRows) / staggerRows) * maxStitchLen;
      const rowSpans = rows.get(r)!.sort((a, c) => a.x0 - c.x0);
      const ordered = flip ? rowSpans.slice().reverse() : rowSpans;
      for (const sp of ordered) {
        const xs = spanStitchXs(sp.x0, sp.x1, maxStitchLen, phase);
        const seq = flip ? xs.reverse() : xs;
        for (const x of seq) points.push(rotatePoint({ x, y }, angle));
      }
      flip = !flip;
    }
    if (points.length >= 2) result.push({ points, color, kind });
  }
  return result;
}

/** Needle x-positions across a span, snapped to a staggered grid of pitch `pitch`. */
function spanStitchXs(
  x0: number,
  x1: number,
  pitch: number,
  phase: number,
): number[] {
  const xs = [x0];
  let g = Math.ceil((x0 - phase) / pitch) * pitch + phase;
  while (g < x1 - 1e-6) {
    if (g > x0 + 1e-6) xs.push(g);
    g += pitch;
  }
  xs.push(x1);
  return xs;
}
