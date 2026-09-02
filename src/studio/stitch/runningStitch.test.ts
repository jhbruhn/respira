import { describe, it, expect } from "vitest";
import type { Point } from "./types";
import { runningStitchPath } from "./runningStitch";
import { distance } from "../geometry/polygon";

const squareRing: Point[] = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 10 },
];

describe("runningStitchPath", () => {
  it("spaces needle points ~stitchLen apart around a closed ring", () => {
    const path = runningStitchPath(squareRing, true, "#000000", {
      stitchLen: 2,
    });
    for (let i = 1; i < path.points.length; i++) {
      expect(distance(path.points[i - 1], path.points[i])).toBeLessThanOrEqual(
        2 + 1e-6,
      );
    }
    // ~40mm perimeter / 2mm ≈ 20 stitches (+1 closing point).
    expect(path.points.length).toBeGreaterThanOrEqual(18);
    expect(path.points.length).toBeLessThanOrEqual(24);
  });

  it("returns to the start for a closed ring", () => {
    const path = runningStitchPath(squareRing, true, "#000000", {
      stitchLen: 3,
    });
    expect(path.points[0]).toEqual(path.points[path.points.length - 1]);
  });

  it("does not close an open polyline", () => {
    const open: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const path = runningStitchPath(open, false, "#000000", { stitchLen: 2 });
    expect(path.points[0]).toEqual({ x: 0, y: 0 });
    expect(path.points[path.points.length - 1]).toEqual({ x: 10, y: 0 });
  });

  it("triple stitch roughly triples the point count", () => {
    const single = runningStitchPath(squareRing, true, "#000000", {
      stitchLen: 2,
    });
    const triple = runningStitchPath(squareRing, true, "#000000", {
      stitchLen: 2,
      triple: true,
    });
    expect(triple.points.length).toBeGreaterThan(single.points.length * 2.5);
  });

  it("tags the path as a stroke", () => {
    expect(runningStitchPath(squareRing, true, "#000000").kind).toBe("stroke");
  });
});
