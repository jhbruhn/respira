import { create } from "zustand";
import type { PesPatternData } from "../../formats/import/pesImporter";
import type {
  RunningStitchSettings,
  StitchPlan,
  StudioShape,
  TatamiSettings,
} from "../stitch/types";
import { DEFAULT_RUNNING_STITCH, DEFAULT_TATAMI } from "../stitch/types";
import { parseSvg } from "../geometry/svgParse";
import { buildPlan, type StudioDocumentSettings } from "../stitch/buildPlan";
import {
  planToPesPatternData,
  planToStitchArray,
} from "../export/toPesPatternData";

export type StudioStatus = "empty" | "ready" | "building" | "error";

interface StudioState {
  shapes: StudioShape[];
  targetWidthMm: number;
  docSettings: StudioDocumentSettings;

  plan: StitchPlan | null;
  pesData: PesPatternData | null;
  status: StudioStatus;
  error: string | null;

  importSvg: (svgText: string) => void;
  setTargetWidth: (mm: number) => void;
  updateShape: (id: string, patch: Partial<StudioShape>) => void;
  updateTatami: (patch: Partial<TatamiSettings>) => void;
  updateRunning: (patch: Partial<RunningStitchSettings>) => void;
  regenerate: () => PesPatternData | null;
  getStitchExport: () => { stitches: number[][]; colors: string[] } | null;
  reset: () => void;
}

const initialDocSettings: StudioDocumentSettings = {
  tatami: { ...DEFAULT_TATAMI },
  running: { ...DEFAULT_RUNNING_STITCH },
};

export const useStudioStore = create<StudioState>((set, get) => ({
  shapes: [],
  targetWidthMm: 60,
  docSettings: initialDocSettings,
  plan: null,
  pesData: null,
  status: "empty",
  error: null,

  importSvg: (svgText: string) => {
    try {
      const { shapes } = parseSvg(svgText, {
        targetWidthMm: get().targetWidthMm,
        fallbackColor: "#1F51A3",
      });
      set({ shapes, status: "ready", error: null, plan: null, pesData: null });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to import SVG",
      });
    }
  },

  setTargetWidth: (mm: number) => {
    const target = Math.max(5, Math.min(360, mm));
    const { shapes, targetWidthMm } = get();
    if (shapes.length === 0 || targetWidthMm === 0) {
      set({ targetWidthMm: target });
      return;
    }
    // Rescale existing shapes about the origin.
    const factor = target / targetWidthMm;
    set({
      targetWidthMm: target,
      shapes: shapes.map((s) => ({
        ...s,
        polygons: s.polygons.map((poly) => ({
          outer: poly.outer.map((p) => ({ x: p.x * factor, y: p.y * factor })),
          holes: poly.holes.map((h) =>
            h.map((p) => ({ x: p.x * factor, y: p.y * factor })),
          ),
        })),
        openPaths: s.openPaths.map((path) =>
          path.map((p) => ({ x: p.x * factor, y: p.y * factor })),
        ),
      })),
      plan: null,
      pesData: null,
    });
  },

  updateShape: (id, patch) => {
    set({
      shapes: get().shapes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      plan: null,
      pesData: null,
    });
  },

  updateTatami: (patch) => {
    set({
      docSettings: {
        ...get().docSettings,
        tatami: { ...get().docSettings.tatami, ...patch },
      },
      plan: null,
      pesData: null,
    });
  },

  updateRunning: (patch) => {
    set({
      docSettings: {
        ...get().docSettings,
        running: { ...get().docSettings.running, ...patch },
      },
      plan: null,
      pesData: null,
    });
  },

  regenerate: () => {
    const { shapes, docSettings } = get();
    if (shapes.length === 0) {
      set({ status: "error", error: "Import an SVG first." });
      return null;
    }
    set({ status: "building", error: null });
    try {
      const plan = buildPlan(shapes, docSettings);
      const pesData = planToPesPatternData(plan);
      set({ plan, pesData, status: "ready", error: null });
      return pesData;
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "Failed to build stitches",
      });
      return null;
    }
  },

  getStitchExport: () => {
    if (!get().plan) get().regenerate();
    const plan = get().plan;
    return plan ? planToStitchArray(plan) : null;
  },

  reset: () =>
    set({
      shapes: [],
      plan: null,
      pesData: null,
      status: "empty",
      error: null,
      docSettings: initialDocSettings,
    }),
}));
