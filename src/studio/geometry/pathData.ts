/**
 * Minimal SVG path-data tokenizer and normaliser.
 *
 * Dependency-free. Parses a `d` attribute, converts every command to its
 * absolute form, and splits the result into independent subpaths (each starting
 * with an absolute `M`). Arc commands are converted to cubic Béziers so a single
 * downstream sampler can handle everything.
 *
 * This is intentionally small: it supports the full command set but assumes
 * reasonably well-formed input (as produced by Inkscape / Illustrator / most
 * design tools). Malformed data throws.
 */

export interface AbsCommand {
  /** Absolute command letter: one of M L C Q A Z (H/V/S/T folded into L/C/Q). */
  cmd: "M" | "L" | "C" | "Q" | "A" | "Z";
  /** Numeric arguments in absolute coordinates. Empty for Z. */
  args: number[];
}

const NUMBER_RE = /-?\d*\.?\d+(?:[eE][-+]?\d+)?/g;

const ARG_COUNT: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

interface RawCommand {
  cmd: string;
  args: number[];
}

/** Split a `d` string into `{cmd, args}` records, expanding repeated arg groups. */
function tokenize(d: string): RawCommand[] {
  const out: RawCommand[] = [];
  const cmdRe = /[MmLlHhVvCcSsQqTtAaZz]/g;
  let match: RegExpExecArray | null;
  const marks: Array<{ letter: string; index: number }> = [];
  while ((match = cmdRe.exec(d)) !== null) {
    marks.push({ letter: match[0], index: match.index });
  }
  for (let i = 0; i < marks.length; i++) {
    const { letter, index } = marks[i];
    const end = i + 1 < marks.length ? marks[i + 1].index : d.length;
    const body = d.slice(index + 1, end);
    const nums = (body.match(NUMBER_RE) || []).map(Number);
    const upper = letter.toUpperCase();
    const per = ARG_COUNT[upper];
    if (per === 0) {
      out.push({ cmd: letter, args: [] });
      continue;
    }
    if (nums.length === 0 || nums.length % per !== 0) {
      throw new Error(`Bad SVG path: "${letter}" with ${nums.length} args`);
    }
    for (let k = 0; k < nums.length; k += per) {
      // A repeated "M" group after the first becomes an implicit "L" (SVG spec).
      const effective =
        upper === "M" && k > 0 ? (letter === "m" ? "l" : "L") : letter;
      out.push({ cmd: effective, args: nums.slice(k, k + per) });
    }
  }
  return out;
}

/** Convert an SVG elliptical arc to a series of cubic Bézier segments. */
function arcToCubics(
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  phiDeg: number,
  largeArc: number,
  sweep: number,
  x2: number,
  y2: number,
): number[][] {
  // Based on the SVG implementation notes (F.6.5). Produces [c1x,c1y,c2x,c2y,ex,ey] groups.
  if (rx === 0 || ry === 0) return [[x1, y1, x2, y2, x2, y2]];
  const phi = (phiDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  let rxAbs = Math.abs(rx);
  let ryAbs = Math.abs(ry);
  const lambda = (x1p * x1p) / (rxAbs * rxAbs) + (y1p * y1p) / (ryAbs * ryAbs);
  if (lambda > 1) {
    const s = Math.sqrt(lambda);
    rxAbs *= s;
    ryAbs *= s;
  }
  const sign = largeArc === sweep ? -1 : 1;
  const num =
    rxAbs * rxAbs * ryAbs * ryAbs -
    rxAbs * rxAbs * y1p * y1p -
    ryAbs * ryAbs * x1p * x1p;
  const den = rxAbs * rxAbs * y1p * y1p + ryAbs * ryAbs * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num / den));
  const cxp = (co * (rxAbs * y1p)) / ryAbs;
  const cyp = (co * -(ryAbs * x1p)) / rxAbs;
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) a = -a;
    return a;
  };
  const theta1 = angle(1, 0, (x1p - cxp) / rxAbs, (y1p - cyp) / ryAbs);
  let dTheta = angle(
    (x1p - cxp) / rxAbs,
    (y1p - cyp) / ryAbs,
    (-x1p - cxp) / rxAbs,
    (-y1p - cyp) / ryAbs,
  );
  if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
  if (sweep && dTheta < 0) dTheta += 2 * Math.PI;

  const segments = Math.max(1, Math.ceil(Math.abs(dTheta) / (Math.PI / 2)));
  const delta = dTheta / segments;
  const t = (4 / 3) * Math.tan(delta / 4);
  const cubics: number[][] = [];
  let angleStart = theta1;
  let startX = x1;
  let startY = y1;
  for (let i = 0; i < segments; i++) {
    const angleEnd = angleStart + delta;
    const cosS = Math.cos(angleStart);
    const sinS = Math.sin(angleStart);
    const cosE = Math.cos(angleEnd);
    const sinE = Math.sin(angleEnd);
    const endX = cosPhi * rxAbs * cosE - sinPhi * ryAbs * sinE + cx;
    const endY = sinPhi * rxAbs * cosE + cosPhi * ryAbs * sinE + cy;
    const c1x = startX + t * (cosPhi * rxAbs * -sinS - sinPhi * ryAbs * cosS);
    const c1y = startY + t * (sinPhi * rxAbs * -sinS + cosPhi * ryAbs * cosS);
    const c2x = endX - t * (cosPhi * rxAbs * -sinE - sinPhi * ryAbs * cosE);
    const c2y = endY - t * (sinPhi * rxAbs * -sinE + cosPhi * ryAbs * cosE);
    cubics.push([c1x, c1y, c2x, c2y, endX, endY]);
    angleStart = angleEnd;
    startX = endX;
    startY = endY;
  }
  return cubics;
}

/**
 * Parse a `d` attribute into subpaths of absolute M/L/C/Q/Z commands.
 * Each returned array is one subpath and always begins with an `M`.
 */
export function parsePathSubpaths(d: string): AbsCommand[][] {
  const raw = tokenize(d);
  const subpaths: AbsCommand[][] = [];
  let current: AbsCommand[] = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  // Reflection control points for S/T.
  let prevCubicCtrl: [number, number] | null = null;
  let prevQuadCtrl: [number, number] | null = null;

  const flush = () => {
    if (current.length > 0) subpaths.push(current);
    current = [];
  };

  for (const { cmd, args } of raw) {
    const rel = cmd === cmd.toLowerCase() && cmd !== cmd.toUpperCase();
    const up = cmd.toUpperCase();
    const ax = (i: number) => (rel ? cx + args[i] : args[i]);
    const ay = (i: number) => (rel ? cy + args[i] : args[i]);

    switch (up) {
      case "M": {
        flush();
        cx = ax(0);
        cy = ay(1);
        startX = cx;
        startY = cy;
        current.push({ cmd: "M", args: [cx, cy] });
        prevCubicCtrl = prevQuadCtrl = null;
        break;
      }
      case "L": {
        cx = ax(0);
        cy = ay(1);
        current.push({ cmd: "L", args: [cx, cy] });
        prevCubicCtrl = prevQuadCtrl = null;
        break;
      }
      case "H": {
        cx = rel ? cx + args[0] : args[0];
        current.push({ cmd: "L", args: [cx, cy] });
        prevCubicCtrl = prevQuadCtrl = null;
        break;
      }
      case "V": {
        cy = rel ? cy + args[0] : args[0];
        current.push({ cmd: "L", args: [cx, cy] });
        prevCubicCtrl = prevQuadCtrl = null;
        break;
      }
      case "C": {
        const c1x = ax(0);
        const c1y = ay(1);
        const c2x = ax(2);
        const c2y = ay(3);
        cx = ax(4);
        cy = ay(5);
        current.push({ cmd: "C", args: [c1x, c1y, c2x, c2y, cx, cy] });
        prevCubicCtrl = [c2x, c2y];
        prevQuadCtrl = null;
        break;
      }
      case "S": {
        const rcx = prevCubicCtrl ? 2 * cx - prevCubicCtrl[0] : cx;
        const rcy = prevCubicCtrl ? 2 * cy - prevCubicCtrl[1] : cy;
        const c2x = ax(0);
        const c2y = ay(1);
        cx = ax(2);
        cy = ay(3);
        current.push({ cmd: "C", args: [rcx, rcy, c2x, c2y, cx, cy] });
        prevCubicCtrl = [c2x, c2y];
        prevQuadCtrl = null;
        break;
      }
      case "Q": {
        const qcx = ax(0);
        const qcy = ay(1);
        cx = ax(2);
        cy = ay(3);
        current.push({ cmd: "Q", args: [qcx, qcy, cx, cy] });
        prevQuadCtrl = [qcx, qcy];
        prevCubicCtrl = null;
        break;
      }
      case "T": {
        const qcx: number = prevQuadCtrl ? 2 * cx - prevQuadCtrl[0] : cx;
        const qcy: number = prevQuadCtrl ? 2 * cy - prevQuadCtrl[1] : cy;
        cx = ax(0);
        cy = ay(1);
        current.push({ cmd: "Q", args: [qcx, qcy, cx, cy] });
        prevQuadCtrl = [qcx, qcy];
        prevCubicCtrl = null;
        break;
      }
      case "A": {
        const rx = args[0];
        const ry = args[1];
        const rot = args[2];
        const large = args[3];
        const sweep = args[4];
        const ex = rel ? cx + args[5] : args[5];
        const ey = rel ? cy + args[6] : args[6];
        for (const seg of arcToCubics(
          cx,
          cy,
          rx,
          ry,
          rot,
          large,
          sweep,
          ex,
          ey,
        )) {
          current.push({ cmd: "C", args: seg });
        }
        cx = ex;
        cy = ey;
        prevCubicCtrl = prevQuadCtrl = null;
        break;
      }
      case "Z": {
        current.push({ cmd: "Z", args: [] });
        cx = startX;
        cy = startY;
        prevCubicCtrl = prevQuadCtrl = null;
        break;
      }
      default:
        throw new Error(`Unsupported SVG path command: ${cmd}`);
    }
  }
  flush();
  return subpaths;
}

/** Serialise absolute commands back to a `d` string. */
export function serializeCommands(cmds: AbsCommand[]): string {
  return cmds
    .map((c) =>
      c.cmd === "Z" ? "Z" : `${c.cmd}${c.args.map((n) => round(n)).join(" ")}`,
    )
    .join(" ");
}

function round(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
