/**
 * Turn a Studio document (shapes + default settings) into an ordered StitchPlan.
 */

import type {
  RunningStitchSettings,
  StitchPath,
  StitchPlan,
  StudioShape,
  TatamiSettings,
} from "./types";
import { tatamiFill } from "./tatamiFill";
import { runningStitchPath } from "./runningStitch";
import { orderPaths } from "../optimize/nearestNeighbor";
import { area } from "../geometry/polygon";

export interface StudioDocumentSettings {
  tatami: TatamiSettings;
  running: RunningStitchSettings;
}

/** Build raw (unordered) stitch paths for a single shape. */
export function shapeToPaths(
  shape: StudioShape,
  defaults: StudioDocumentSettings,
): StitchPath[] {
  const fillSettings = { ...defaults.tatami, ...shape.fillSettings };
  const strokeSettings = { ...defaults.running, ...shape.strokeSettings };
  const paths: StitchPath[] = [];

  for (const poly of shape.polygons) {
    if (poly.outer.length < 3 || area(poly.outer) < 1e-3) continue;
    if (shape.fill) {
      paths.push(...tatamiFill(poly, shape.color, fillSettings));
    }
    if (shape.stroke) {
      for (const ring of [poly.outer, ...poly.holes]) {
        if (ring.length >= 2) {
          paths.push(
            runningStitchPath(ring, true, shape.color, strokeSettings),
          );
        }
      }
    }
  }

  if (shape.stroke) {
    for (const open of shape.openPaths) {
      if (open.length >= 2) {
        paths.push(runningStitchPath(open, false, shape.color, strokeSettings));
      }
    }
  }

  return paths;
}

/** Build the full ordered plan for a document. */
export function buildPlan(
  shapes: StudioShape[],
  defaults: StudioDocumentSettings,
): StitchPlan {
  const all: StitchPath[] = [];
  for (const shape of shapes) all.push(...shapeToPaths(shape, defaults));
  return orderPaths(all);
}
