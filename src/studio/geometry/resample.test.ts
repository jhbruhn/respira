import { describe, it, expect } from "vitest";
import type { Point } from "../stitch/types";
import { resamplePolyline, resampleRing, dropShortStitches } from "./resample";
import { distance } from "./polygon";

function maxGap(points: Point[]): number {
  let m = 0;
  for (let i = 1; i < points.length; i++)
    m = Math.max(m, distance(points[i - 1], points[i]));
  return m;
}

describe("resamplePolyline", () => {
  it("keeps endpoints and bounds every gap to maxLen", () => {
    const line: Point[] = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const out = resamplePolyline(line, 3);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 100, y: 0 });
    expect(maxGap(out)).toBeLessThanOrEqual(3 + 1e-6);
  });

  it("preserves existing vertices (corners stay sharp)", () => {
    const poly: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const out = resamplePolyline(poly, 100);
    expect(out).toEqual(poly);
  });

  it("throws on non-positive maxLen", () => {
    expect(() =>
      resamplePolyline(
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        0,
      ),
    ).toThrow();
  });
});

describe("resampleRing", () => {
  it("closes the loop back to the start", () => {
    const ring: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    const out = resampleRing(ring, 2);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 0, y: 0 });
    expect(maxGap(out)).toBeLessThanOrEqual(2 + 1e-6);
  });
});

describe("dropShortStitches", () => {
  it("removes points closer than minLen but keeps first and last", () => {
    const pts: Point[] = [
      { x: 0, y: 0 },
      { x: 0.1, y: 0 },
      { x: 0.2, y: 0 },
      { x: 5, y: 0 },
    ];
    const out = dropShortStitches(pts, 1);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[out.length - 1]).toEqual({ x: 5, y: 0 });
    expect(out.length).toBe(2);
  });
});
