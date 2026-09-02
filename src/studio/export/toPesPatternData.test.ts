import { describe, it, expect } from "vitest";
import type { StitchPlan } from "../stitch/types";
import { planToStitchArray, planToPesPatternData } from "./toPesPatternData";
import { MOVE, STITCH } from "../../formats/import/constants";

const plan: StitchPlan = {
  colors: ["#ff0000", "#0000ff"],
  paths: [
    {
      kind: "fill",
      color: "#ff0000",
      points: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 5, y: 5 },
      ],
    },
    {
      kind: "stroke",
      color: "#0000ff",
      points: [
        { x: -3, y: -3 },
        { x: 3, y: -3 },
      ],
    },
  ],
};

describe("planToStitchArray", () => {
  it("scales mm to 0.1 mm and assigns colour indices", () => {
    const { stitches, colors } = planToStitchArray(plan);
    expect(colors).toEqual(["#ff0000", "#0000ff"]);
    expect(stitches[0]).toEqual([0, 0, STITCH, 0]);
    expect(stitches[1]).toEqual([50, 0, STITCH, 0]);
    // First point of the 2nd path travels, and switches colour.
    expect(stitches[3]).toEqual([-30, -30, MOVE, 1]);
  });

  it("only the very first stitch is not a jump", () => {
    const { stitches } = planToStitchArray(plan);
    expect(stitches[0][2]).toBe(STITCH);
  });
});

describe("planToPesPatternData", () => {
  it("produces canvas-ready data with matching bounds and colour count", () => {
    const data = planToPesPatternData(plan);
    expect(data.colorCount).toBe(2);
    expect(data.threads).toHaveLength(2);
    expect(data.penData.length % 4).toBe(0);
    expect(data.penStitches.stitches.length).toBeGreaterThan(0);
    // Bounds cover stitched points in 0.1 mm (jump-only points are excluded,
    // matching encodeStitchesToPen's behaviour for imported PES files).
    expect(data.bounds.maxX).toBeGreaterThanOrEqual(50);
    expect(data.bounds.maxY).toBeGreaterThanOrEqual(50);
    expect(data.bounds.minY).toBeLessThanOrEqual(-30);
  });

  it("throws when there is nothing to stitch", () => {
    expect(() => planToPesPatternData({ colors: [], paths: [] })).toThrow(
      /nothing to stitch/i,
    );
  });
});
