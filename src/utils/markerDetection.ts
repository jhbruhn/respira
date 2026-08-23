/**
 * Automatic detection of the four hoop fiducial markers in a photo.
 *
 * The markers are identical white squares (~12mm) sitting on the black hoop
 * frame, each containing a black glyph. Because all four are identical, we do
 * NOT decode any ID — we simply find the four white square "stickers" and use
 * their bounding-box centers, then sort them into top/right/bottom/left by
 * position. This is a lightweight, fully-offline connected-components approach
 * (no OpenCV / no external deps).
 *
 * Pipeline: downscale → grayscale → Otsu threshold → connected components on
 * the white mask → filter to square, marker-sized, fully-enclosed blobs →
 * pick the outermost candidate on each of the four sides.
 */

import type { Pt } from "./homography";
import { classifyMarkerSide, type MarkerSide } from "../constants/hoopGeometry";

/** A detected white-blob candidate, in the source image's natural pixels. */
export interface MarkerCandidate {
  x: number; // bbox center
  y: number;
  side: number; // average bbox side length
  fill: number; // white pixels / bbox area
}

export interface DetectionResult {
  /** The 4 selected marker centers in [top, right, bottom, left] order, or [] if not found. */
  markers: Pt[];
  /** All candidates that passed the shape filter (for debugging/visualisation). */
  candidates: MarkerCandidate[];
  threshold: number;
}

const DETECT_MAX_DIM = 1000; // downscale longest side to this before detection

// Shape filters (relative to the downscaled image's shorter dimension)
const MIN_SIDE_FRAC = 0.02;
const MAX_SIDE_FRAC = 0.16;
const MIN_ASPECT = 0.6;
const MAX_ASPECT = 1.7;
const MIN_FILL = 0.1;
const MAX_FILL = 0.95;

/** Otsu's method: pick the grayscale threshold maximising between-class variance. */
function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

interface Component {
  minx: number;
  maxx: number;
  miny: number;
  maxy: number;
  area: number;
  touchesBorder: boolean;
}

/** Label 4-connected white components and return their bounding-box stats. */
function connectedComponents(
  white: Uint8Array,
  W: number,
  H: number,
): Component[] {
  const labels = new Int32Array(W * H);
  const stack = new Int32Array(W * H);
  const comps: Component[] = [];
  let label = 0;

  for (let start = 0; start < W * H; start++) {
    if (white[start] !== 1 || labels[start] !== 0) continue;
    label++;
    let sp = 0;
    stack[sp++] = start;
    labels[start] = label;

    let minx = W;
    let maxx = 0;
    let miny = H;
    let maxy = 0;
    let area = 0;
    let touchesBorder = false;

    while (sp > 0) {
      const p = stack[--sp];
      const x = p % W;
      const y = (p / W) | 0;
      area++;
      if (x < minx) minx = x;
      if (x > maxx) maxx = x;
      if (y < miny) miny = y;
      if (y > maxy) maxy = y;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1)
        touchesBorder = true;

      if (x > 0) {
        const q = p - 1;
        if (white[q] === 1 && labels[q] === 0) {
          labels[q] = label;
          stack[sp++] = q;
        }
      }
      if (x < W - 1) {
        const q = p + 1;
        if (white[q] === 1 && labels[q] === 0) {
          labels[q] = label;
          stack[sp++] = q;
        }
      }
      if (y > 0) {
        const q = p - W;
        if (white[q] === 1 && labels[q] === 0) {
          labels[q] = label;
          stack[sp++] = q;
        }
      }
      if (y < H - 1) {
        const q = p + W;
        if (white[q] === 1 && labels[q] === 0) {
          labels[q] = label;
          stack[sp++] = q;
        }
      }
    }

    comps.push({ minx, maxx, miny, maxy, area, touchesBorder });
  }

  return comps;
}

/** Coefficient of variation (std / mean) — 0 when all equal. */
function cv(xs: number[]): number {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  if (m === 0) return 0;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length;
  return Math.sqrt(v) / m;
}

/**
 * Choose the 4 real markers among (possibly cluttered) candidates by matching
 * the known marker configuration: the four markers are the unique set that is
 * same-sized, roughly symmetric about their common center, and arranged in the
 * correct pinwheel handedness (top shifted left, right shifted up, …).
 *
 * We enumerate 4-subsets of the best candidates and score each valid one by how
 * consistent the marker sizes and radii are; the best-scoring valid quad wins.
 * Returns the 4 points in [top, right, bottom, left] order, or [] if none fit.
 */
function selectFour(cands: MarkerCandidate[]): Pt[] {
  if (cands.length < 4) return [];

  // Bound the combinatorial search: prefer ring-like fill (real markers are a
  // white ring around a dark glyph, ~0.2–0.6, unlike solid background patches).
  const ranked = [...cands]
    .sort((a, b) => Math.abs(a.fill - 0.4) - Math.abs(b.fill - 0.4))
    .slice(0, 16);
  const M = ranked.length;

  let best: { score: number; pts: Pt[] } | null = null;

  for (let i = 0; i < M; i++)
    for (let j = i + 1; j < M; j++)
      for (let k = j + 1; k < M; k++)
        for (let l = k + 1; l < M; l++) {
          const quad = [ranked[i], ranked[j], ranked[k], ranked[l]];
          const cx = quad.reduce((s, c) => s + c.x, 0) / 4;
          const cy = quad.reduce((s, c) => s + c.y, 0) / 4;

          // Assign each to a side relative to this quad's own centroid.
          const bySide: Partial<Record<MarkerSide, MarkerCandidate>> = {};
          let ok = true;
          for (const c of quad) {
            const side = classifyMarkerSide(c.x - cx, c.y - cy);
            if (bySide[side]) {
              ok = false;
              break;
            }
            bySide[side] = c;
          }
          const { top, right, bottom, left } = bySide;
          if (!ok || !top || !right || !bottom || !left) continue;

          // Pinwheel handedness: top is left of center, right is above center,
          // bottom is right of center, left is below center.
          if (!(top.x < cx && right.y < cy && bottom.x > cx && left.y > cy))
            continue;

          const pts = [top, right, bottom, left];
          const radii = pts.map((c) => Math.hypot(c.x - cx, c.y - cy));
          const sizes = pts.map((c) => c.side);
          const score = cv(radii) + cv(sizes);
          if (!best || score < best.score) {
            best = { score, pts: pts.map((c) => ({ x: c.x, y: c.y })) };
          }
        }

  return best ? best.pts : [];
}

export function detectMarkers(image: HTMLImageElement): DetectionResult {
  const nW = image.naturalWidth;
  const nH = image.naturalHeight;
  const scale = Math.min(1, DETECT_MAX_DIM / Math.max(nW, nH));
  const W = Math.max(1, Math.round(nW * scale));
  const H = Math.max(1, Math.round(nH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { markers: [], candidates: [], threshold: 0 };
  ctx.drawImage(image, 0, 0, W, H);
  const { data } = ctx.getImageData(0, 0, W, H);

  const gray = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }

  const threshold = otsuThreshold(gray);
  const white = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) white[i] = gray[i] > threshold ? 1 : 0;

  const comps = connectedComponents(white, W, H);

  const minDim = Math.min(W, H);
  const minSide = MIN_SIDE_FRAC * minDim;
  const maxSide = MAX_SIDE_FRAC * minDim;
  const invScale = 1 / scale;

  const candidates: MarkerCandidate[] = [];
  for (const c of comps) {
    if (c.touchesBorder) continue;
    const w = c.maxx - c.minx + 1;
    const h = c.maxy - c.miny + 1;
    const s = (w + h) / 2;
    if (s < minSide || s > maxSide) continue;
    const aspect = w / h;
    if (aspect < MIN_ASPECT || aspect > MAX_ASPECT) continue;
    const fill = c.area / (w * h);
    if (fill < MIN_FILL || fill > MAX_FILL) continue;

    candidates.push({
      x: ((c.minx + c.maxx + 1) / 2) * invScale,
      y: ((c.miny + c.maxy + 1) / 2) * invScale,
      side: s * invScale,
      fill,
    });
  }

  const markers = selectFour(candidates);

  if (import.meta.env.DEV) {
    const candStr = candidates
      .map(
        (c) =>
          `(${Math.round(c.x)},${Math.round(c.y)} s=${Math.round(c.side)} f=${c.fill.toFixed(2)})`,
      )
      .join(" ");
    const selStr = markers
      .map((m) => `(${Math.round(m.x)},${Math.round(m.y)})`)
      .join(" ");
    console.log(
      `[markerDetection] threshold=${threshold} components=${comps.length} candidates=${candidates.length} selected=${markers.length}`,
    );
    console.log(`[markerDetection] candidates: ${candStr}`);
    console.log(`[markerDetection] selected: ${selStr}`);
  }

  return { markers, candidates, threshold };
}
