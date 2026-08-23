/**
 * Planar homography (perspective transform) utilities — pure TypeScript, no
 * dependencies. Used to register a photo of the hooped fabric into the machine's
 * 0.1mm hoop-center coordinate space from 4+ point correspondences.
 *
 * A homography is a 3×3 matrix H (row-major, 9 numbers) mapping a 2D point
 * `p = (x, y)` to `p' = (X, Y)` via homogeneous coordinates:
 *
 *     [X*w]   [ h0 h1 h2 ] [x]
 *     [Y*w] = [ h3 h4 h5 ] [y]
 *     [ w ]   [ h6 h7 h8 ] [1]
 *
 *     X = (h0*x + h1*y + h2) / (h6*x + h7*y + h8)
 *     Y = (h3*x + h4*y + h5) / (h6*x + h7*y + h8)
 */

export type Mat3 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Pt {
  x: number;
  y: number;
}

/** Apply a homography to a point (with perspective divide). */
export function applyHomography(H: Mat3, p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return {
    x: (H[0] * p.x + H[1] * p.y + H[2]) / w,
    y: (H[3] * p.x + H[4] * p.y + H[5]) / w,
  };
}

/** Multiply two 3×3 matrices: returns A · B. */
export function multiplyMat3(a: Mat3, b: Mat3): Mat3 {
  const out = new Array(9).fill(0) as Mat3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[r * 3 + k] * b[k * 3 + c];
      }
      out[r * 3 + c] = sum;
    }
  }
  return out;
}

/** Invert a 3×3 matrix. Throws if singular. */
export function invertMat3(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) {
    throw new Error("Matrix is singular and cannot be inverted");
  }
  const invDet = 1 / det;
  return [
    A * invDet,
    (c * h - b * i) * invDet,
    (b * f - c * e) * invDet,
    B * invDet,
    (a * i - c * g) * invDet,
    (c * d - a * f) * invDet,
    C * invDet,
    (b * g - a * h) * invDet,
    (a * e - b * d) * invDet,
  ];
}

/**
 * Solve a dense linear system `M x = v` (M is n×n, row-major) via Gaussian
 * elimination with partial pivoting. Returns x, or throws if M is singular.
 */
function solveLinear(M: number[], v: number[], n: number): number[] {
  // Augmented matrix
  const a: number[][] = [];
  for (let r = 0; r < n; r++) {
    a.push([...M.slice(r * n, r * n + n), v[r]]);
  }

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) {
      throw new Error("Singular system while solving homography");
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];

    // Eliminate below
    for (let r = col + 1; r < n; r++) {
      const factor = a[r][col] / a[col][col];
      for (let k = col; k <= n; k++) {
        a[r][k] -= factor * a[col][k];
      }
    }
  }

  // Back-substitution
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = a[r][n];
    for (let k = r + 1; k < n; k++) sum -= a[r][k] * x[k];
    x[r] = sum / a[r][r];
  }
  return x;
}

/**
 * Compute the homography mapping `src` points to `dst` points using the Direct
 * Linear Transform. Requires ≥ 4 correspondences (exact for 4, least-squares
 * for more). h8 is fixed to 1.
 *
 * Each correspondence (x,y) → (X,Y) contributes two rows:
 *   [ x  y  1  0  0  0  -X*x  -X*y ] · h = X
 *   [ 0  0  0  x  y  1  -Y*x  -Y*y ] · h = Y
 * where h = [h0..h7]. For N > 4 we solve the normal equations AᵀA h = Aᵀb.
 */
export function computeHomography(src: Pt[], dst: Pt[]): Mat3 {
  if (src.length !== dst.length) {
    throw new Error("src and dst must have the same length");
  }
  if (src.length < 4) {
    throw new Error("At least 4 point correspondences are required");
  }

  const rows: number[][] = [];
  const rhs: number[] = [];
  for (let i = 0; i < src.length; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    rows.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    rhs.push(X);
    rows.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    rhs.push(Y);
  }

  // Normal equations: (AᵀA) h = Aᵀ b, an 8×8 system.
  const n = 8;
  const AtA = new Array(n * n).fill(0);
  const Atb = new Array(n).fill(0);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const bval = rhs[r];
    for (let i = 0; i < n; i++) {
      Atb[i] += row[i] * bval;
      for (let j = 0; j < n; j++) {
        AtA[i * n + j] += row[i] * row[j];
      }
    }
  }

  const h = solveLinear(AtA, Atb, n);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
