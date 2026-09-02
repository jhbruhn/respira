import { describe, it, expect } from "vitest";
import type { StitchPath } from "../stitch/types";
import { orderPaths, totalJumpDistance } from "./nearestNeighbor";

const seg = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color = "#000000",
  kind: StitchPath["kind"] = "stroke",
): StitchPath => ({
  points: [
    { x: x0, y: y0 },
    { x: x1, y: y1 },
  ],
  color,
  kind,
});

describe("orderPaths", () => {
  it("reduces total jump distance versus the input order", () => {
    // Deliberately interleaved far-apart segments.
    const input = [
      seg(0, 0, 1, 0),
      seg(100, 0, 101, 0),
      seg(2, 0, 3, 0),
      seg(102, 0, 103, 0),
    ];
    const before = totalJumpDistance(input);
    const after = totalJumpDistance(orderPaths(input).paths);
    expect(after).toBeLessThan(before);
  });

  it("reverses a path when that end is closer", () => {
    const plan = orderPaths([seg(0, 0, 1, 0), seg(10, 0, 2, 0)]);
    // Second segment should be flipped so it starts near x=2, not x=10.
    expect(plan.paths[1].points[0].x).toBeCloseTo(2);
  });

  it("keeps first-seen colour order and groups by colour", () => {
    const plan = orderPaths([
      seg(0, 0, 1, 0, "#ff0000"),
      seg(5, 5, 6, 6, "#00ff00"),
      seg(2, 0, 3, 0, "#ff0000"),
    ]);
    expect(plan.colors).toEqual(["#ff0000", "#00ff00"]);
    expect(plan.paths.map((p) => p.color)).toEqual([
      "#ff0000",
      "#ff0000",
      "#00ff00",
    ]);
  });

  it("orders underlay before fill before stroke within a colour", () => {
    const plan = orderPaths([
      seg(0, 0, 1, 0, "#000000", "stroke"),
      seg(0, 0, 1, 0, "#000000", "underlay"),
      seg(0, 0, 1, 0, "#000000", "fill"),
    ]);
    expect(plan.paths.map((p) => p.kind)).toEqual([
      "underlay",
      "fill",
      "stroke",
    ]);
  });
});
