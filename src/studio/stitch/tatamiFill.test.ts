import { describe, it, expect } from "vitest";
import type { Polygon } from "./types";
import { tatamiFill } from "./tatamiFill";
import { pointInPolygon } from "../geometry/polygon";
import { distance } from "../geometry/polygon";

const square = (size: number): Polygon => ({
  outer: [
    { x: 0, y: 0 },
    { x: size, y: 0 },
    { x: size, y: size },
    { x: 0, y: size },
  ],
  holes: [],
});

describe("tatamiFill", () => {
  it("produces roughly height/rowSpacing rows over a square", () => {
    const paths = tatamiFill(square(10), "#000000", {
      rowSpacing: 1,
      angle: 0,
      underlay: false,
      maxStitchLen: 3,
    });
    expect(paths).toHaveLength(1);
    // Distinct row y-values.
    const ys = new Set(paths[0].points.map((p) => Math.round(p.y * 100) / 100));
    expect(ys.size).toBeGreaterThanOrEqual(8);
    expect(ys.size).toBeLessThanOrEqual(11);
  });

  it("keeps every needle point inside the polygon", () => {
    const poly = square(12);
    const paths = tatamiFill(poly, "#000000", {
      rowSpacing: 0.8,
      angle: 30,
      underlay: false,
    });
    const inset: Polygon = {
      outer: poly.outer.map((p) => ({
        x: p.x === 0 ? -0.01 : p.x + 0.01,
        y: p.y === 0 ? -0.01 : p.y + 0.01,
      })),
      holes: [],
    };
    for (const path of paths) {
      for (const pt of path.points) {
        expect(pointInPolygon(pt, inset)).toBe(true);
      }
    }
  });

  it("bounds each stitch to maxStitchLen along a row", () => {
    const paths = tatamiFill(square(20), "#000000", {
      rowSpacing: 1,
      maxStitchLen: 2,
      angle: 0,
      underlay: false,
    });
    for (const path of paths) {
      for (let i = 1; i < path.points.length; i++) {
        const a = path.points[i - 1];
        const b = path.points[i];
        // Same-row stitches must respect maxStitchLen; row-change steps are short too.
        if (Math.abs(a.y - b.y) < 1e-6) {
          expect(distance(a, b)).toBeLessThanOrEqual(2 + 1e-6);
        }
      }
    }
  });

  it("splits into two regions around a hole", () => {
    const poly: Polygon = {
      outer: square(30).outer,
      // Full-height slot so every scan row is split in two.
      holes: [
        [
          { x: 12, y: 0 },
          { x: 18, y: 0 },
          { x: 18, y: 30 },
          { x: 12, y: 30 },
        ],
      ],
    };
    const paths = tatamiFill(poly, "#000000", {
      rowSpacing: 1,
      angle: 0,
      underlay: false,
    });
    expect(paths.length).toBe(2);
  });

  it("adds an underlay pass when enabled", () => {
    const withUnderlay = tatamiFill(square(10), "#000000", {
      rowSpacing: 1,
      underlay: true,
    });
    expect(withUnderlay.some((p) => p.kind === "underlay")).toBe(true);
  });
});
