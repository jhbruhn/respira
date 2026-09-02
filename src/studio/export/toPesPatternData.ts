/**
 * Convert a Studio StitchPlan into respira's `PesPatternData`, reusing the exact
 * same PEN encoder / decoder the PES importer uses. Once converted, the Studio
 * output flows through the unchanged canvas, hoop validation and Bluetooth
 * upload path.
 *
 * Units: the plan is in millimetres centred on the origin; respira works in
 * 0.1 mm, Y-down, origin-centred — so we scale by 10 and round.
 */

import type { StitchPlan } from "../stitch/types";
import type { PesPatternData } from "../../formats/import/pesImporter";
import { STITCH, MOVE } from "../../formats/import/constants";
import { encodeStitchesToPen } from "../../formats/pen/encoder";
import { decodePenData } from "../../formats/pen/decoder";
import { enhanceThreadWithBrotherColor } from "../../utils/brotherColors";

const MM_TO_TENTHS = 10;

export interface RawStitchExport {
  /** `[x, y, cmd, colorIndex]` in 0.1 mm, ready for `encodeStitchesToPen`. */
  stitches: number[][];
  /** Distinct thread colours as `#RRGGBB`, indexed by `colorIndex`. */
  colors: string[];
}

/** Flatten a StitchPlan to the `[x, y, cmd, colorIndex]` array respira expects. */
export function planToStitchArray(plan: StitchPlan): RawStitchExport {
  const stitches: number[][] = [];
  const colorIndexOf = (c: string) => Math.max(0, plan.colors.indexOf(c));

  for (const path of plan.paths) {
    const ci = colorIndexOf(path.color);
    for (let i = 0; i < path.points.length; i++) {
      const p = path.points[i];
      const x = Math.round(p.x * MM_TO_TENTHS);
      const y = Math.round(p.y * MM_TO_TENTHS);
      // First point of a path travels (jump); the rest stitch.
      const cmd = i === 0 && stitches.length > 0 ? MOVE : STITCH;
      stitches.push([x, y, cmd, ci]);
    }
  }
  return { stitches, colors: plan.colors };
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16) || 0;
}

/** Build the full `PesPatternData` for canvas preview + Bluetooth upload. */
export function planToPesPatternData(plan: StitchPlan): PesPatternData {
  const { stitches, colors } = planToStitchArray(plan);
  if (stitches.length < 2) {
    throw new Error(
      "Nothing to stitch — enable a fill or an outline on at least one shape.",
    );
  }

  const { penBytes, bounds } = encodeStitchesToPen(stitches);
  const penData = new Uint8Array(penBytes);
  const penStitches = decodePenData(penData);

  const threads = colors.map((hex) => {
    const enhanced = enhanceThreadWithBrotherColor(
      {
        color: hexToInt(hex),
        hex,
        brand: null,
        catalogNumber: null,
        description: null,
        chart: null,
      },
      { matchByRGB: true },
    );
    return {
      color: hexToInt(hex),
      hex: enhanced.hex,
      brand: enhanced.brand,
      catalogNumber: enhanced.catalogNumber,
      description: enhanced.description,
      chart: enhanced.chart,
    };
  });

  const uniqueColors = threads.reduce(
    (acc, thread, idx) => {
      const existing = acc.find((c) => c.hex === thread.hex);
      if (existing) {
        existing.threadIndices.push(idx);
      } else {
        acc.push({ ...thread, threadIndices: [idx] });
      }
      return acc;
    },
    [] as Array<(typeof threads)[number] & { threadIndices: number[] }>,
  );

  return {
    stitches,
    threads,
    uniqueColors,
    penData,
    penStitches,
    colorCount: colors.length,
    stitchCount: stitches.length,
    bounds,
  };
}
