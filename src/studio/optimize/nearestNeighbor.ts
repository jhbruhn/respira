/**
 * Stitch-path ordering.
 *
 * Groups paths by thread colour (keeping first-seen colour order), then within
 * each colour orders the paths with a greedy nearest-neighbour walk, reversing
 * individual paths when that shortens the jump. This is the "good enough" step;
 * a 2-opt / Or-opt refinement is a later phase.
 */

import type { Point, StitchPath, StitchPlan } from "../stitch/types";

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function firstSeenColors(paths: StitchPath[]): string[] {
  const seen: string[] = [];
  for (const p of paths) if (!seen.includes(p.color)) seen.push(p.color);
  return seen;
}

/** Order paths to minimise needle travel; returns a ready-to-encode plan. */
export function orderPaths(paths: StitchPath[]): StitchPlan {
  const usable = paths.filter((p) => p.points.length >= 2);
  const colors = firstSeenColors(usable);

  const ordered: StitchPath[] = [];
  let cursor: Point = { x: 0, y: 0 };

  for (const color of colors) {
    // Underlay before fill before stroke, then nearest-neighbour within that.
    const pool = usable
      .filter((p) => p.color === color)
      .sort((a, b) => kindRank(a.kind) - kindRank(b.kind));

    const remaining = new Set(pool);
    while (remaining.size > 0) {
      let best: StitchPath | null = null;
      let bestReversed = false;
      let bestCost = Infinity;
      for (const path of remaining) {
        const head = path.points[0];
        const tail = path.points[path.points.length - 1];
        const dHead = dist(cursor, head);
        const dTail = dist(cursor, tail);
        if (dHead < bestCost) {
          bestCost = dHead;
          best = path;
          bestReversed = false;
        }
        if (dTail < bestCost) {
          bestCost = dTail;
          best = path;
          bestReversed = true;
        }
      }
      if (!best) break;
      remaining.delete(best);
      const points = bestReversed
        ? best.points.slice().reverse()
        : best.points.slice();
      ordered.push({ ...best, points });
      cursor = points[points.length - 1];
    }
  }

  return { paths: ordered, colors };
}

function kindRank(kind: StitchPath["kind"]): number {
  return kind === "underlay" ? 0 : kind === "fill" ? 1 : 2;
}

/** Total jump distance between consecutive paths — used in tests and stats. */
export function totalJumpDistance(paths: StitchPath[]): number {
  let total = 0;
  for (let i = 1; i < paths.length; i++) {
    const prev = paths[i - 1].points;
    const cur = paths[i].points;
    total += dist(prev[prev.length - 1], cur[0]);
  }
  return total;
}
