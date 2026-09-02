/**
 * Polyline resampling: turn a geometric path into evenly spaced needle points.
 */

import type { Point } from "../stitch/types";
import { distance } from "./polygon";

/**
 * Resample an open polyline so that consecutive points are at most `maxLen`
 * apart. The first and last points are always kept; existing vertices are kept
 * too (we only ever subdivide, never merge), so corners stay sharp.
 *
 * `maxLen` must be > 0.
 */
export function resamplePolyline(points: Point[], maxLen: number): Point[] {
  if (maxLen <= 0) throw new Error("resamplePolyline: maxLen must be > 0");
  if (points.length < 2) return points.slice();

  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const segLen = distance(a, b);
    if (segLen <= maxLen + 1e-9) {
      out.push(b);
      continue;
    }
    const steps = Math.ceil(segLen / maxLen);
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/**
 * Resample a closed ring into a loop of needle points spaced at most `maxLen`
 * apart, returning an open polyline that starts and ends at `ring[0]`.
 */
export function resampleRing(ring: Point[], maxLen: number): Point[] {
  if (ring.length < 2) return ring.slice();
  return resamplePolyline([...ring, ring[0]], maxLen);
}

/**
 * Drop points that are closer than `minLen` to the previous kept point, so the
 * needle never makes near-zero stitches (which pile up thread). The last point
 * is always kept so a path still reaches its intended end.
 */
export function dropShortStitches(points: Point[], minLen: number): Point[] {
  if (points.length < 2 || minLen <= 0) return points.slice();
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (distance(out[out.length - 1], points[i]) >= minLen) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}
