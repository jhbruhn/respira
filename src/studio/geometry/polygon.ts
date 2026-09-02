/**
 * Polygon geometry helpers (millimetre space, Y-down).
 *
 * Deliberately dependency-free. Algorithms are the standard ones (shoelace area,
 * ray-casting point-in-polygon, scanline intersection) — no third-party code.
 */

import type { Point, Ring, Polygon } from "../stitch/types";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Signed area of a ring via the shoelace formula. Positive = counter-clockwise
 * in a Y-up frame; in our Y-down frame positive means clockwise on screen. The
 * sign is only used for relative comparisons (outer vs hole), so orientation
 * convention does not matter as long as it is consistent. */
export function signedArea(ring: Ring): number {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function area(ring: Ring): number {
  return Math.abs(signedArea(ring));
}

/** Reverse a ring in place-free fashion (returns a new array). */
export function reversed(ring: Ring): Ring {
  return ring.slice().reverse();
}

/** Force a ring to the requested winding. `ccw` is in shoelace terms. */
export function ensureWinding(ring: Ring, ccw: boolean): Ring {
  const isCcw = signedArea(ring) > 0;
  return isCcw === ccw ? ring : reversed(ring);
}

export function ringBounds(ring: Ring): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function polygonBounds(polys: Polygon[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polys) {
    for (const ring of [poly.outer, ...poly.holes]) {
      const b = ringBounds(ring);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

/** Ray-casting point-in-ring test. Points exactly on an edge may return either
 * result; callers that care use a small inset. */
export function pointInRing(p: Point, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const straddles = a.y > p.y !== b.y > p.y;
    if (straddles) {
      const xCross = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
      if (p.x < xCross) inside = !inside;
    }
  }
  return inside;
}

/** Point is inside the polygon: inside the outer ring and outside every hole. */
export function pointInPolygon(p: Point, poly: Polygon): boolean {
  if (!pointInRing(p, poly.outer)) return false;
  for (const hole of poly.holes) {
    if (pointInRing(p, hole)) return false;
  }
  return true;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Total length of an open polyline. */
export function polylineLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++)
    len += distance(points[i - 1], points[i]);
  return len;
}

/** Perimeter of a closed ring. */
export function ringPerimeter(ring: Ring): number {
  if (ring.length < 2) return 0;
  return polylineLength([...ring, ring[0]]);
}

export function rotatePoint(p: Point, angleRad: number): Point {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function rotateRing(ring: Ring, angleRad: number): Ring {
  return ring.map((p) => rotatePoint(p, angleRad));
}

export function rotatePolygon(poly: Polygon, angleRad: number): Polygon {
  return {
    outer: rotateRing(poly.outer, angleRad),
    holes: poly.holes.map((h) => rotateRing(h, angleRad)),
  };
}

/**
 * X coordinates where the horizontal line `y = yLevel` crosses the ring edges.
 * Returned sorted ascending. Vertices exactly at `yLevel` are nudged by the
 * caller's choice of scan levels (we always scan at row centres, never on a
 * grid that hits vertices, so this stays robust in practice).
 */
export function ringScanlineCrossings(ring: Ring, yLevel: number): number[] {
  const xs: number[] = [];
  for (let i = 0, n = ring.length; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const straddles = a.y > yLevel !== b.y > yLevel;
    if (straddles) {
      const t = (yLevel - a.y) / (b.y - a.y);
      xs.push(a.x + t * (b.x - a.x));
    }
  }
  return xs.sort((p, q) => p - q);
}

/**
 * Interior spans of a polygon along the horizontal line `y = yLevel`, as
 * `[xStart, xEnd]` pairs. Uses the even-odd rule over all rings (outer + holes):
 * every boundary crossing toggles inside/outside, so winding order of the holes
 * does not matter.
 */
export function polygonScanlineSpans(
  poly: Polygon,
  yLevel: number,
): Array<[number, number]> {
  const xs: number[] = [];
  for (const ring of [poly.outer, ...poly.holes]) {
    for (const x of ringScanlineCrossings(ring, yLevel)) xs.push(x);
  }
  xs.sort((a, b) => a - b);
  const spans: Array<[number, number]> = [];
  for (let i = 0; i + 1 < xs.length; i += 2) {
    if (xs[i + 1] - xs[i] > 1e-6) spans.push([xs[i], xs[i + 1]]);
  }
  return spans;
}
