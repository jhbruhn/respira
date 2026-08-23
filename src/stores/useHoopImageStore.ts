import { create } from "zustand";
import { computeHomography, type Mat3, type Pt } from "../utils/homography";
import { warpImageToHoop } from "../utils/imageWarp";
import { detectMarkers, type MarkerCandidate } from "../utils/markerDetection";
import {
  MARKER_CENTERS,
  classifyMarkerSide,
  type MarkerSide,
} from "../constants/hoopGeometry";

/**
 * Hoop Image Store
 *
 * Manages a photo of the hooped fabric and its registration into the machine's
 * 0.1mm hoop-center coordinate space. The user loads a photo and clicks the four
 * fiducial markers; from those clicks we solve a homography and pre-warp the
 * photo into an aligned bitmap that the canvas renders beneath the pattern.
 */

export type HoopImageStatus = "none" | "loaded" | "aligned";

interface HoopImageState {
  imageUrl: string | null; // object URL, for display in the picker
  image: HTMLImageElement | null; // decoded, for warping
  imageSize: { width: number; height: number } | null;

  rawClicks: Pt[]; // marker clicks in image px, in click order (max 4)
  markerPoints: Partial<Record<MarkerSide, Pt>>; // classified clicks
  detectionCandidates: MarkerCandidate[]; // last auto-detect candidates (debug)

  homography: Mat3 | null;
  warped: HTMLCanvasElement | null;

  opacity: number; // 0..1
  visible: boolean;
  showMarkerCheck: boolean; // draw the assumed marker squares for verification
  status: HoopImageStatus;
  alignError: string | null;

  loadImage: (file: File) => Promise<void>;
  addClick: (pt: Pt) => void;
  autoDetect: () => void;
  undoClick: () => void;
  resetClicks: () => void;
  setOpacity: (v: number) => void;
  setVisible: (v: boolean) => void;
  setShowMarkerCheck: (v: boolean) => void;
  clear: () => void;
}

const DEFAULTS = {
  imageUrl: null,
  image: null,
  imageSize: null,
  rawClicks: [] as Pt[],
  markerPoints: {} as Partial<Record<MarkerSide, Pt>>,
  detectionCandidates: [] as MarkerCandidate[],
  homography: null,
  warped: null,
  status: "none" as HoopImageStatus,
  alignError: null,
};

export const useHoopImageStore = create<HoopImageState>((set, get) => ({
  ...DEFAULTS,
  opacity: 0.6,
  visible: true,
  showMarkerCheck: false,

  loadImage: async (file: File) => {
    // Revoke any previous object URL to avoid leaks.
    const prevUrl = get().imageUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch (err) {
      URL.revokeObjectURL(url);
      set({ alignError: "Could not load that image file." });
      console.error("[HoopImage] Failed to decode image:", err);
      return;
    }

    set({
      ...DEFAULTS,
      imageUrl: url,
      image,
      imageSize: { width: image.naturalWidth, height: image.naturalHeight },
      status: "loaded",
    });
  },

  addClick: (pt: Pt) => {
    const { rawClicks, status, image } = get();
    if (status === "none") return;
    if (rawClicks.length >= 4) return;

    const next = [...rawClicks, pt];
    if (next.length < 4 || !image) {
      set({ rawClicks: next, alignError: null });
      return;
    }

    // Fourth click — classify, solve the homography and warp.
    const result = solveAlignment(next, image);
    if (!result.ok) {
      set({ rawClicks: next, alignError: result.error });
      return;
    }
    set({
      rawClicks: next,
      markerPoints: result.markerPoints,
      homography: result.homography,
      warped: result.warped,
      status: "aligned",
      alignError: null,
    });
  },

  autoDetect: () => {
    const { image } = get();
    if (!image) return;

    let result;
    try {
      result = detectMarkers(image);
    } catch (err) {
      console.error("[HoopImage] Marker detection threw:", err);
      set({
        alignError:
          "Marker detection failed unexpectedly. Click the markers manually.",
      });
      return;
    }

    if (result.markers.length !== 4) {
      set({
        detectionCandidates: result.candidates,
        rawClicks: [],
        alignError: `Auto-detect found ${result.candidates.length} candidate marker(s), not 4. Click the markers manually, or adjust the photo (even lighting, all 4 markers in frame).`,
      });
      return;
    }

    const solved = solveAlignment(result.markers, image);
    if (!solved.ok) {
      set({
        detectionCandidates: result.candidates,
        rawClicks: result.markers,
        alignError: solved.error,
      });
      return;
    }

    set({
      rawClicks: result.markers,
      detectionCandidates: result.candidates,
      markerPoints: solved.markerPoints,
      homography: solved.homography,
      warped: solved.warped,
      status: "aligned",
      alignError: null,
    });
  },

  undoClick: () => {
    const { rawClicks } = get();
    set({
      rawClicks: rawClicks.slice(0, -1),
      alignError: null,
    });
  },

  resetClicks: () =>
    set({
      rawClicks: [],
      markerPoints: {},
      detectionCandidates: [],
      alignError: null,
    }),

  setOpacity: (v: number) => set({ opacity: Math.max(0, Math.min(1, v)) }),
  setVisible: (v: boolean) => set({ visible: v }),
  setShowMarkerCheck: (v: boolean) => set({ showMarkerCheck: v }),

  clear: () => {
    const prevUrl = get().imageUrl;
    if (prevUrl) URL.revokeObjectURL(prevUrl);
    set({ ...DEFAULTS });
  },
}));

type AlignResult =
  | {
      ok: true;
      markerPoints: Partial<Record<MarkerSide, Pt>>;
      homography: Mat3;
      warped: HTMLCanvasElement;
    }
  | { ok: false; error: string };

/**
 * Classify the four raw clicks into frame sides, solve the homography, and warp
 * the photo. Pure with respect to the store (returns a result to apply).
 */
function solveAlignment(clicks: Pt[], image: HTMLImageElement): AlignResult {
  // Classify each click by its dominant direction from the centroid.
  const cx = clicks.reduce((s, p) => s + p.x, 0) / 4;
  const cy = clicks.reduce((s, p) => s + p.y, 0) / 4;

  const bySide: Partial<Record<MarkerSide, Pt>> = {};
  for (const pt of clicks) {
    const side = classifyMarkerSide(pt.x - cx, pt.y - cy);
    if (bySide[side]) {
      return {
        ok: false,
        error:
          "Couldn't tell the four markers apart — click once near each of the top, right, bottom and left markers.",
      };
    }
    bySide[side] = pt;
  }

  const sides: MarkerSide[] = ["top", "right", "bottom", "left"];
  const src: Pt[] = sides.map((s) => bySide[s]!);
  const dst: Pt[] = sides.map((s) => MARKER_CENTERS[s]);

  try {
    const homography = computeHomography(src, dst);
    const warped = warpImageToHoop(image, homography);
    return { ok: true, markerPoints: bySide, homography, warped };
  } catch (err) {
    console.error("[HoopImage] Alignment failed:", err);
    return {
      ok: false,
      error:
        "Alignment failed — the four points may be collinear. Reset and try again.",
    };
  }
}
