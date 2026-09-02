import { describe, it, expect } from "vitest";
import type { Polygon, Ring } from "../stitch/types";
import {
  signedArea,
  area,
  ensureWinding,
  pointInRing,
  pointInPolygon,
  ringPerimeter,
  polygonScanlineSpans,
  rotatePoint,
} from "./polygon";

const square = (size: number): Ring => [
  { x: 0, y: 0 },
  { x: size, y: 0 },
  { x: size, y: size },
  { x: 0, y: size },
];

describe("area / signedArea", () => {
  it("computes the area of a square", () => {
    expect(area(square(10))).toBeCloseTo(100);
  });

  it("signedArea flips sign with winding", () => {
    const s = square(10);
    expect(Math.sign(signedArea(s))).toBe(
      -Math.sign(signedArea([...s].reverse())),
    );
  });

  it("ensureWinding makes winding deterministic", () => {
    const s = square(10);
    const ccw = ensureWinding(s, true);
    const cw = ensureWinding(s, false);
    expect(signedArea(ccw)).toBeGreaterThan(0);
    expect(signedArea(cw)).toBeLessThan(0);
  });
});

describe("pointInRing", () => {
  it("detects inside and outside", () => {
    const s = square(10);
    expect(pointInRing({ x: 5, y: 5 }, s)).toBe(true);
    expect(pointInRing({ x: 15, y: 5 }, s)).toBe(false);
    expect(pointInRing({ x: -1, y: 5 }, s)).toBe(false);
  });
});

describe("pointInPolygon with a hole", () => {
  const poly: Polygon = {
    outer: square(20),
    holes: [
      [
        { x: 5, y: 5 },
        { x: 15, y: 5 },
        { x: 15, y: 15 },
        { x: 5, y: 15 },
      ],
    ],
  };

  it("is false inside the hole", () => {
    expect(pointInPolygon({ x: 10, y: 10 }, poly)).toBe(false);
  });

  it("is true in the ring between hole and outer edge", () => {
    expect(pointInPolygon({ x: 2, y: 10 }, poly)).toBe(true);
  });
});

describe("ringPerimeter", () => {
  it("is 4×side for a square", () => {
    expect(ringPerimeter(square(7))).toBeCloseTo(28);
  });
});

describe("polygonScanlineSpans", () => {
  it("returns one span across a solid square", () => {
    const spans = polygonScanlineSpans({ outer: square(10), holes: [] }, 5);
    expect(spans).toHaveLength(1);
    expect(spans[0][0]).toBeCloseTo(0);
    expect(spans[0][1]).toBeCloseTo(10);
  });

  it("returns two spans across a square with a central hole", () => {
    const poly: Polygon = {
      outer: square(20),
      holes: [
        [
          { x: 5, y: 5 },
          { x: 15, y: 5 },
          { x: 15, y: 15 },
          { x: 5, y: 15 },
        ],
      ],
    };
    const spans = polygonScanlineSpans(poly, 10);
    expect(spans).toHaveLength(2);
    expect(spans[0]).toEqual([expect.closeTo(0), expect.closeTo(5)]);
    expect(spans[1]).toEqual([expect.closeTo(15), expect.closeTo(20)]);
  });
});

describe("rotatePoint", () => {
  it("rotates 90° about the origin", () => {
    const p = rotatePoint({ x: 1, y: 0 }, Math.PI / 2);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(1);
  });
});
