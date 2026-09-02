/**
 * Running stitch: an outline sewn as evenly spaced needle penetrations along a
 * path. Optionally tripled (there-and-back-and-there) for a bolder line.
 */

import type { Point, RunningStitchSettings, StitchPath } from "./types";
import { DEFAULT_RUNNING_STITCH } from "./types";
import {
  resampleRing,
  resamplePolyline,
  dropShortStitches,
} from "../geometry/resample";

function resolve(
  settings: Partial<RunningStitchSettings>,
): RunningStitchSettings {
  return { ...DEFAULT_RUNNING_STITCH, ...settings };
}

/** Running stitch along one ring (closed) or polyline (open). */
export function runningStitchPath(
  points: Point[],
  closed: boolean,
  color: string,
  settings: Partial<RunningStitchSettings> = {},
): StitchPath {
  const { stitchLen, triple } = resolve(settings);
  const base = closed
    ? resampleRing(points, stitchLen)
    : resamplePolyline(points, stitchLen);
  const cleaned = dropShortStitches(base, stitchLen * 0.25);

  const out = triple ? tripleRun(cleaned) : cleaned;
  return { points: out, color, kind: "stroke" };
}

/** Every segment is stitched forward, back, forward again. */
function tripleRun(points: Point[]): Point[] {
  if (points.length < 2) return points.slice();
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    out.push(b, a, b);
  }
  return out;
}
