import { describe, it, expect } from "vitest";
import {
  applyHomography,
  computeHomography,
  invertMat3,
  multiplyMat3,
  type Mat3,
  type Pt,
} from "./homography";

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

function close(a: number, b: number, eps = 1e-6) {
  expect(Math.abs(a - b)).toBeLessThan(eps);
}

describe("applyHomography", () => {
  it("identity maps a point to itself", () => {
    const p = applyHomography(IDENTITY, { x: 3, y: -7 });
    close(p.x, 3);
    close(p.y, -7);
  });

  it("applies an affine translate+scale", () => {
    const H: Mat3 = [2, 0, 5, 0, 3, -1, 0, 0, 1];
    const p = applyHomography(H, { x: 4, y: 2 });
    close(p.x, 13); // 2*4 + 5
    close(p.y, 5); //  3*2 - 1
  });
});

describe("invertMat3 / multiplyMat3", () => {
  it("H · H⁻¹ = I", () => {
    const H: Mat3 = [1.2, 0.1, 30, -0.05, 0.9, -10, 0.0002, -0.0001, 1];
    const prod = multiplyMat3(H, invertMat3(H));
    for (let i = 0; i < 9; i++) close(prod[i], IDENTITY[i], 1e-9);
  });
});

describe("computeHomography", () => {
  it("recovers an exact perspective transform from 4 correspondences", () => {
    const H: Mat3 = [1.15, 0.08, 42, -0.06, 1.05, -18, 0.0003, -0.00015, 1];
    const src: Pt[] = [
      { x: 10, y: 20 },
      { x: 300, y: 25 },
      { x: 290, y: 260 },
      { x: 15, y: 250 },
    ];
    const dst = src.map((p) => applyHomography(H, p));

    const recovered = computeHomography(src, dst);
    // Normalize by h8 (already 1) and compare mapping behaviour on new points.
    for (const p of [
      { x: 100, y: 100 },
      { x: 200, y: 50 },
      { x: 50, y: 200 },
    ]) {
      const expected = applyHomography(H, p);
      const got = applyHomography(recovered, p);
      close(got.x, expected.x, 1e-4);
      close(got.y, expected.y, 1e-4);
    }
  });

  it("maps 4 image corners onto hoop-space coordinates", () => {
    // Simulate: a photo where the marker centers were clicked (px), mapping to
    // known hoop-space coords (0.1mm units).
    const src: Pt[] = [
      { x: 283, y: 232 }, // top
      { x: 810, y: 440 }, // right
      { x: 645, y: 968 }, // bottom
      { x: 270, y: 762 }, // left
    ];
    const dst: Pt[] = [
      { x: -347.5, y: -767.5 },
      { x: 767.5, y: -347.5 },
      { x: 347.5, y: 767.5 },
      { x: -767.5, y: 347.5 },
    ];
    const H = computeHomography(src, dst);
    for (let i = 0; i < src.length; i++) {
      const got = applyHomography(H, src[i]);
      close(got.x, dst[i].x, 1e-3);
      close(got.y, dst[i].y, 1e-3);
    }
  });

  it("supports an over-determined (16-point) least-squares fit", () => {
    const H: Mat3 = [1.1, 0.05, 12, -0.03, 1.02, -8, 0.0001, -0.00005, 1];
    const src: Pt[] = [];
    for (let i = 0; i < 16; i++) {
      src.push({ x: 20 + (i % 4) * 90, y: 20 + Math.floor(i / 4) * 90 });
    }
    const dst = src.map((p) => applyHomography(H, p));
    const recovered = computeHomography(src, dst);
    const test = applyHomography(recovered, { x: 175, y: 175 });
    const expected = applyHomography(H, { x: 175, y: 175 });
    close(test.x, expected.x, 1e-3);
    close(test.y, expected.y, 1e-3);
  });
});
