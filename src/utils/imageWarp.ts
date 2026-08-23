/**
 * Perspective-warp a photo of the hooped fabric into the machine's hoop-center
 * coordinate space, producing an axis-aligned bitmap that can be dropped onto
 * the Konva canvas like the `Hoop` rect.
 *
 * The warp is an inverse (destination-driven) resample: for every output pixel
 * we know its hoop coordinate, map it back into the source photo via H⁻¹, and
 * bilinearly sample. Runs once per photo load (not per frame), so a CPU loop is
 * plenty fast and far simpler/more predictable than a WebGL path.
 */

import { invertMat3, type Mat3 } from "./homography";
import { HOOP_VIEW_HALF } from "../constants/hoopGeometry";

/** The warped bitmap covers hoop x,y ∈ [-WARP_HALF, WARP_HALF] (0.1mm units). */
export const WARP_HALF = HOOP_VIEW_HALF;

/**
 * @param image  Decoded source photo.
 * @param H      Homography mapping source image px → hoop 0.1mm coords.
 * @param outputSize  Side length (px) of the square output bitmap.
 * @returns A canvas covering the inner hoop opening, transparent where the photo
 *          does not cover, ready to use as a Konva `<Image image={...}>` source.
 */
export function warpImageToHoop(
  image: HTMLImageElement,
  H: Mat3,
  outputSize = 1000,
): HTMLCanvasElement {
  const sw = image.naturalWidth;
  const sh = image.naturalHeight;

  // Read the source pixels once.
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = sw;
  srcCanvas.height = sh;
  const sctx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!sctx) throw new Error("Could not get 2D context for source image");
  sctx.drawImage(image, 0, 0);
  const src = sctx.getImageData(0, 0, sw, sh).data;

  const Hinv = invertMat3(H);

  const out = document.createElement("canvas");
  out.width = outputSize;
  out.height = outputSize;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Could not get 2D context for output canvas");
  const dstImage = octx.createImageData(outputSize, outputSize);
  const dst = dstImage.data;

  const half = HOOP_VIEW_HALF;
  const span = 2 * half;

  for (let py = 0; py < outputSize; py++) {
    const hoopY = -half + ((py + 0.5) / outputSize) * span;
    for (let px = 0; px < outputSize; px++) {
      const hoopX = -half + ((px + 0.5) / outputSize) * span;

      // hoop coord → source image px (perspective divide)
      const w = Hinv[6] * hoopX + Hinv[7] * hoopY + Hinv[8];
      const u = (Hinv[0] * hoopX + Hinv[1] * hoopY + Hinv[2]) / w;
      const v = (Hinv[3] * hoopX + Hinv[4] * hoopY + Hinv[5]) / w;

      const di = (py * outputSize + px) * 4;

      if (u < 0 || v < 0 || u > sw - 1 || v > sh - 1) {
        dst[di + 3] = 0; // outside the photo → transparent
        continue;
      }

      // Bilinear sample
      const x0 = Math.floor(u);
      const y0 = Math.floor(v);
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = u - x0;
      const fy = v - y0;
      const i00 = (y0 * sw + x0) * 4;
      const i10 = (y0 * sw + x1) * 4;
      const i01 = (y1 * sw + x0) * 4;
      const i11 = (y1 * sw + x1) * 4;

      for (let c = 0; c < 3; c++) {
        const top = src[i00 + c] + (src[i10 + c] - src[i00 + c]) * fx;
        const bot = src[i01 + c] + (src[i11 + c] - src[i01 + c]) * fx;
        dst[di + c] = top + (bot - top) * fy;
      }
      dst[di + 3] = 255;
    }
  }

  octx.putImageData(dstImage, 0, 0);
  return out;
}
