/**
 * SVG → Studio shapes.
 *
 * Dependency-free. Uses the browser DOM to resolve element transforms and to
 * sample curves (`SVGGeometryElement.getPointAtLength`), and our own
 * `pathData.ts` to split compound paths into subpaths. Not usable under jsdom —
 * geometry/fill logic is unit-tested separately on plain polygons.
 */

import type { Point, Polygon, Ring, StudioShape } from "../stitch/types";
import { area, pointInRing, ringBounds, polygonBounds } from "./polygon";
import { parsePathSubpaths, serializeCommands } from "./pathData";

const SVG_NS = "http://www.w3.org/2000/svg";

export interface SvgImportOptions {
  /** Scale the whole drawing so its bounding-box width equals this many mm. */
  targetWidthMm: number;
  /** Curve sampling resolution in mm (smaller = smoother, more points). */
  sampleMm?: number;
  /** Default thread colour when an element has no usable fill/stroke. */
  fallbackColor?: string;
}

export interface SvgImportResult {
  shapes: StudioShape[];
  /** Bounding box of all shapes, in mm. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface RawRing {
  points: Ring;
  /** True if the source subpath was explicitly closed (Z) — fillable. */
  closed: boolean;
  color: string;
  hasFill: boolean;
  hasStroke: boolean;
  name: string;
}

let uid = 0;
const nextId = () => `shape_${Date.now().toString(36)}_${(uid++).toString(36)}`;

/**
 * Parse an SVG document string into Studio shapes positioned in mm space,
 * centred on the origin (matching how respira centres imported patterns).
 */
export function parseSvg(
  svgText: string,
  options: SvgImportOptions,
): SvgImportResult {
  const { targetWidthMm, sampleMm = 0.3, fallbackColor = "#000000" } = options;

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Invalid SVG file");
  const svg = doc.documentElement as unknown as SVGSVGElement;
  if (svg.tagName.toLowerCase() !== "svg")
    throw new Error("Root element is not <svg>");

  // Render offscreen so getCTM / getPointAtLength are available and accurate.
  const host = document.createElementNS(SVG_NS, "svg");
  host.setAttribute("width", "0");
  host.setAttribute("height", "0");
  host.style.position = "absolute";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.overflow = "hidden";
  const imported = svg.cloneNode(true) as SVGSVGElement;
  host.appendChild(imported);
  document.body.appendChild(host);

  try {
    const rootCTM = imported.getScreenCTM();
    const rawRings = collectRings(
      imported,
      host,
      sampleMm,
      fallbackColor,
      rootCTM,
    );
    if (rawRings.length === 0)
      throw new Error("No drawable shapes found in SVG");

    // Compute drawing bounds in the sampled (screen) space, then rescale to mm.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of rawRings) {
      const b = ringBounds(r.points);
      minX = Math.min(minX, b.minX);
      minY = Math.min(minY, b.minY);
      maxX = Math.max(maxX, b.maxX);
      maxY = Math.max(maxY, b.maxY);
    }
    const rawWidth = maxX - minX || 1;
    const scale = targetWidthMm / rawWidth;
    const cxRaw = (minX + maxX) / 2;
    const cyRaw = (minY + maxY) / 2;
    const toMm = (p: Point): Point => ({
      x: (p.x - cxRaw) * scale,
      y: (p.y - cyRaw) * scale,
    });

    const mmRings: RawRing[] = rawRings.map((r) => ({
      ...r,
      points: r.points.map(toMm),
    }));

    const shapes = buildShapes(mmRings);
    const bounds = polygonBounds(shapes.flatMap((s) => s.polygons));
    return { shapes, bounds };
  } finally {
    document.body.removeChild(host);
  }
}

/** Walk the SVG tree and sample every geometry element into rings. */
function collectRings(
  root: SVGSVGElement,
  host: SVGSVGElement,
  sampleMm: number,
  fallbackColor: string,
  rootCTM: DOMMatrix | null,
): RawRing[] {
  const rings: RawRing[] = [];
  const selector = "path, rect, circle, ellipse, polygon, polyline, line";
  const elements = Array.from(
    root.querySelectorAll(selector),
  ) as SVGGraphicsElement[];

  for (const el of elements) {
    if (isHidden(el)) continue;
    const style = getComputedStyle(el);
    const fill = normaliseColor(style.fill);
    const stroke = normaliseColor(style.stroke);
    const hasFill = fill !== null && style.fill !== "none";
    const hasStroke =
      stroke !== null &&
      style.stroke !== "none" &&
      parseFloat(style.strokeWidth) > 0;
    const color = fill ?? stroke ?? fallbackColor;
    const name =
      el.id || el.getAttribute("inkscape:label") || el.tagName.toLowerCase();

    const ctm = combinedMatrix(rootCTM, el.getScreenCTM());
    const subpaths = elementToSubpathStrings(el);

    for (const { d, closed } of subpaths) {
      const pts = samplePath(host, d, sampleMm, ctm);
      if (pts.length >= 2) {
        rings.push({
          points: pts,
          closed:
            closed &&
            el.tagName.toLowerCase() !== "polyline" &&
            el.tagName.toLowerCase() !== "line",
          color,
          hasFill,
          hasStroke,
          name,
        });
      }
    }
  }
  return rings;
}

function isHidden(el: Element): boolean {
  const style = getComputedStyle(el as SVGGraphicsElement);
  return (
    style.display === "none" ||
    style.visibility === "hidden" ||
    parseFloat(style.opacity) === 0
  );
}

/** Convert a primitive element to one or more subpath `d` strings. */
function elementToSubpathStrings(
  el: SVGGraphicsElement,
): Array<{ d: string; closed: boolean }> {
  const tag = el.tagName.toLowerCase();
  const num = (name: string) => parseFloat(el.getAttribute(name) || "0");

  switch (tag) {
    case "path": {
      const d = el.getAttribute("d");
      if (!d) return [];
      return parsePathSubpaths(d).map((cmds) => ({
        d: serializeCommands(cmds),
        closed: cmds.some((c) => c.cmd === "Z"),
      }));
    }
    case "rect": {
      const x = num("x");
      const y = num("y");
      const w = num("width");
      const h = num("height");
      if (w <= 0 || h <= 0) return [];
      return [
        {
          d: `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`,
          closed: true,
        },
      ];
    }
    case "circle": {
      const cx = num("cx");
      const cy = num("cy");
      const r = num("r");
      if (r <= 0) return [];
      return [{ d: ellipseD(cx, cy, r, r), closed: true }];
    }
    case "ellipse": {
      const cx = num("cx");
      const cy = num("cy");
      const rx = num("rx");
      const ry = num("ry");
      if (rx <= 0 || ry <= 0) return [];
      return [{ d: ellipseD(cx, cy, rx, ry), closed: true }];
    }
    case "polygon":
    case "polyline": {
      const raw = (el.getAttribute("points") || "").trim();
      if (!raw) return [];
      const nums = (raw.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(
        Number,
      );
      if (nums.length < 4) return [];
      let d = `M${nums[0]} ${nums[1]}`;
      for (let i = 2; i + 1 < nums.length; i += 2)
        d += ` L${nums[i]} ${nums[i + 1]}`;
      if (tag === "polygon") d += " Z";
      return [{ d, closed: tag === "polygon" }];
    }
    case "line": {
      const d = `M${num("x1")} ${num("y1")} L${num("x2")} ${num("y2")}`;
      return [{ d, closed: false }];
    }
    default:
      return [];
  }
}

function ellipseD(cx: number, cy: number, rx: number, ry: number): string {
  // Two arcs -> full ellipse. pathData.ts converts arcs to cubics.
  return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

/** Sample a `d` string (single subpath) at ~sampleMm spacing, transformed by `ctm`. */
function samplePath(
  host: SVGSVGElement,
  d: string,
  sampleMm: number,
  ctm: DOMMatrix | null,
): Point[] {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  host.appendChild(path);
  try {
    const total = path.getTotalLength();
    if (total === 0) {
      const p = path.getPointAtLength(0);
      return [applyMatrix(ctm, p.x, p.y)];
    }
    const steps = Math.max(2, Math.ceil(total / Math.max(0.01, sampleMm)));
    const pts: Point[] = [];
    for (let i = 0; i <= steps; i++) {
      const p = path.getPointAtLength((i / steps) * total);
      pts.push(applyMatrix(ctm, p.x, p.y));
    }
    return dedupe(pts);
  } finally {
    host.removeChild(path);
  }
}

function dedupe(pts: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 1e-6) out.push(p);
  }
  return out;
}

function combinedMatrix(
  root: DOMMatrix | null,
  el: DOMMatrix | null,
): DOMMatrix | null {
  if (!el) return null;
  if (!root) return el;
  // Point in mm-space = root^-1 * el * pointInUserSpace
  return root.inverse().multiply(el);
}

function applyMatrix(m: DOMMatrix | null, x: number, y: number): Point {
  if (!m) return { x, y };
  return { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

function normaliseColor(value: string): string | null {
  if (!value || value === "none" || value === "transparent") return null;
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a] = m[1].split(",").map((s) => parseFloat(s.trim()));
    if (a === 0) return null;
    return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  }
  if (value.startsWith("#")) {
    if (value.length === 4) {
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toUpperCase();
    }
    return value.slice(0, 7).toUpperCase();
  }
  return null;
}

/**
 * Group rings into shapes. Rings are grouped by colour; within a colour, ring
 * nesting decides outer vs hole (even depth = outer, odd depth = hole).
 */
function buildShapes(rings: RawRing[]): StudioShape[] {
  const byColor = new Map<string, RawRing[]>();
  for (const r of rings) {
    const list = byColor.get(r.color) ?? [];
    list.push(r);
    byColor.set(r.color, list);
  }

  const shapes: StudioShape[] = [];
  for (const [color, group] of byColor) {
    const closedRings = group.filter((r) => r.closed && area(r.points) > 1e-4);
    const openRings = group.filter((r) => !r.closed);

    const polygons = nestRings(closedRings);
    const openPaths = openRings.map((r) => r.points);
    const anyFill = group.some((r) => r.hasFill) && polygons.length > 0;
    const anyStroke =
      group.some((r) => r.hasStroke) ||
      (polygons.length === 0 && openPaths.length > 0);

    if (polygons.length === 0 && openPaths.length === 0) continue;

    shapes.push({
      id: nextId(),
      name: group[0].name,
      polygons,
      openPaths,
      color,
      fill: anyFill,
      stroke: anyStroke || !anyFill,
      fillSettings: {},
      strokeSettings: {},
    });
  }
  return shapes;
}

/** Build Polygons from closed rings using containment nesting. */
function nestRings(rings: RawRing[]): Polygon[] {
  const sorted = rings
    .map((r) => ({ ring: r.points, a: area(r.points) }))
    .sort((x, y) => y.a - x.a);

  const depth = new Array(sorted.length).fill(0);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = 0; j < i; j++) {
      if (ringContains(sorted[j].ring, sorted[i].ring)) depth[i]++;
    }
  }

  const polygons: Polygon[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (depth[i] % 2 !== 0) continue; // hole, attached below
    const outer = sorted[i].ring;
    const holes: Ring[] = [];
    for (let j = 0; j < sorted.length; j++) {
      if (depth[j] === depth[i] + 1 && ringContains(outer, sorted[j].ring)) {
        holes.push(sorted[j].ring);
      }
    }
    polygons.push({ outer, holes });
  }
  return polygons;
}

/** True if ring `a` contains ring `b` (tested via b's first vertex). */
function ringContains(a: Ring, b: Ring): boolean {
  return b.length > 0 && pointInRing(b[0], a);
}
