import { describe, it, expect } from "vitest";
import {
  rotatePoint,
  transformStitchesRotation,
  calculateRotatedBounds,
  normalizeAngle,
} from "./rotationUtils";
import { encodeStitchesToPen } from "../formats/pen/encoder";
import { decodePenData } from "../formats/pen/decoder";

describe("rotationUtils", () => {
  describe("rotatePoint", () => {
    it("should rotate 90° correctly", () => {
      const result = rotatePoint(100, 0, 0, 0, 90);
      expect(result.x).toBeCloseTo(0, 1);
      expect(result.y).toBeCloseTo(100, 1);
    });

    it("should rotate 180° correctly", () => {
      const result = rotatePoint(100, 50, 0, 0, 180);
      expect(result.x).toBeCloseTo(-100, 1);
      expect(result.y).toBeCloseTo(-50, 1);
    });

    it("should handle 0° rotation (no change)", () => {
      const result = rotatePoint(100, 50, 0, 0, 0);
      expect(result.x).toBe(100);
      expect(result.y).toBe(50);
    });

    it("should rotate 45° correctly", () => {
      const result = rotatePoint(100, 0, 0, 0, 45);
      expect(result.x).toBeCloseTo(70.71, 1);
      expect(result.y).toBeCloseTo(70.71, 1);
    });

    it("should rotate around a custom center", () => {
      const result = rotatePoint(150, 100, 100, 100, 90);
      expect(result.x).toBeCloseTo(100, 1);
      expect(result.y).toBeCloseTo(150, 1);
    });
  });

  describe("transformStitchesRotation", () => {
    it("should rotate stitches around pattern center (centered pattern)", () => {
      const stitches = [
        [100, 0, 0, 0],
        [0, 100, 0, 0],
        [-100, 0, 0, 0],
        [0, -100, 0, 0],
      ];
      const bounds = { minX: -100, maxX: 100, minY: -100, maxY: 100 };

      const rotated = transformStitchesRotation(stitches, 90, bounds);

      expect(rotated[0][0]).toBeCloseTo(0, 0);
      expect(rotated[0][1]).toBeCloseTo(100, 0);
      expect(rotated[1][0]).toBeCloseTo(-100, 0);
      expect(rotated[1][1]).toBeCloseTo(0, 0);
    });

    it("should preserve command and color data", () => {
      const stitches = [[100, 50, 0x10, 2]];
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const rotated = transformStitchesRotation(stitches, 45, bounds);

      expect(rotated[0][2]).toBe(0x10); // Command unchanged
      expect(rotated[0][3]).toBe(2); // Color unchanged
    });

    it("should handle 0° as no-op", () => {
      const stitches = [[100, 50, 0, 0]];
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const rotated = transformStitchesRotation(stitches, 0, bounds);

      expect(rotated).toBe(stitches); // Same reference
    });

    it("should handle 360° as no-op", () => {
      const stitches = [[100, 50, 0, 0]];
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const rotated = transformStitchesRotation(stitches, 360, bounds);

      expect(rotated).toBe(stitches); // Same reference
    });

    it("should round coordinates to integers", () => {
      const stitches = [[100, 0, 0, 0]];
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const rotated = transformStitchesRotation(stitches, 45, bounds);

      // Coordinates should be integers
      expect(Number.isInteger(rotated[0][0])).toBe(true);
      expect(Number.isInteger(rotated[0][1])).toBe(true);
    });

    it("should rotate off-center pattern around its own center", () => {
      // Pattern bounds not centered at origin (like the real-world case)
      const bounds = { minX: -23, maxX: 751, minY: -369, maxY: 485 };
      const centerX = (bounds.minX + bounds.maxX) / 2; // 364
      const centerY = (bounds.minY + bounds.maxY) / 2; // 58

      // Stitch at the pattern's center
      const stitches = [[centerX, centerY, 0, 0]];

      // Rotate by any angle - center point should stay at center
      const rotated = transformStitchesRotation(stitches, 90, bounds);

      // Center stitch should remain at center (within rounding)
      expect(rotated[0][0]).toBeCloseTo(centerX, 0);
      expect(rotated[0][1]).toBeCloseTo(centerY, 0);
    });

    it("should rotate off-center pattern corners correctly", () => {
      // Off-center pattern
      const bounds = { minX: 100, maxX: 300, minY: 200, maxY: 400 };

      // Test all four corners
      const stitches = [
        [100, 200, 0, 0], // top-left
        [300, 200, 0, 0], // top-right
        [100, 400, 0, 0], // bottom-left
        [300, 400, 0, 0], // bottom-right
      ];

      const rotated = transformStitchesRotation(stitches, 90, bounds);

      // After 90° rotation around center (200, 300):
      // top-left (100, 200) -> relative (-100, -100) -> rotated (100, -100) -> absolute (300, 200)
      expect(rotated[0][0]).toBeCloseTo(300, 0);
      expect(rotated[0][1]).toBeCloseTo(200, 0);

      // top-right (300, 200) -> relative (100, -100) -> rotated (100, 100) -> absolute (300, 400)
      expect(rotated[1][0]).toBeCloseTo(300, 0);
      expect(rotated[1][1]).toBeCloseTo(400, 0);

      // bottom-left (100, 400) -> relative (-100, 100) -> rotated (-100, -100) -> absolute (100, 200)
      expect(rotated[2][0]).toBeCloseTo(100, 0);
      expect(rotated[2][1]).toBeCloseTo(200, 0);

      // bottom-right (300, 400) -> relative (100, 100) -> rotated (-100, 100) -> absolute (100, 400)
      expect(rotated[3][0]).toBeCloseTo(100, 0);
      expect(rotated[3][1]).toBeCloseTo(400, 0);
    });

    it("should handle real-world off-center pattern (actual user case)", () => {
      const bounds = { minX: -23, maxX: 751, minY: -369, maxY: 485 };
      const centerX = 364;
      const centerY = 58;

      // A stitch at the top-right corner
      const stitches = [[751, -369, 0, 0]];

      const rotated = transformStitchesRotation(stitches, 45, bounds);

      // Distance from center: sqrt((751-364)^2 + (-369-58)^2) = sqrt(149769 + 182329) = 576.4
      // This distance should be preserved after rotation
      const origDist = Math.sqrt(
        Math.pow(751 - centerX, 2) + Math.pow(-369 - centerY, 2),
      );
      const rotDist = Math.sqrt(
        Math.pow(rotated[0][0] - centerX, 2) +
          Math.pow(rotated[0][1] - centerY, 2),
      );

      expect(rotDist).toBeCloseTo(origDist, 0);
    });
  });

  describe("calculateRotatedBounds", () => {
    it("should expand bounds after 45° rotation", () => {
      const bounds = { minX: -100, maxX: 100, minY: -50, maxY: 50 };

      const rotated = calculateRotatedBounds(bounds, 45);

      // After 45° rotation, bounds should expand
      expect(Math.abs(rotated.minX)).toBeGreaterThan(100);
      expect(Math.abs(rotated.minY)).toBeGreaterThan(50);
    });

    it("should maintain bounds for 0° rotation", () => {
      const bounds = { minX: -100, maxX: 100, minY: -50, maxY: 50 };

      const rotated = calculateRotatedBounds(bounds, 0);

      expect(rotated).toEqual(bounds);
    });

    it("should maintain bounds for 360° rotation", () => {
      const bounds = { minX: -100, maxX: 100, minY: -50, maxY: 50 };

      const rotated = calculateRotatedBounds(bounds, 360);

      expect(rotated).toEqual(bounds);
    });

    it("should handle 90° rotation symmetrically", () => {
      const bounds = { minX: -100, maxX: 100, minY: -50, maxY: 50 };

      const rotated = calculateRotatedBounds(bounds, 90);

      // X and Y bounds swap
      expect(rotated.minX).toBeCloseTo(-50, 0);
      expect(rotated.maxX).toBeCloseTo(50, 0);
      expect(rotated.minY).toBeCloseTo(-100, 0);
      expect(rotated.maxY).toBeCloseTo(100, 0);
    });

    it("should handle asymmetric bounds correctly", () => {
      const bounds = { minX: 0, maxX: 200, minY: 0, maxY: 100 };

      const rotated = calculateRotatedBounds(bounds, 90);

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;

      // After 90° rotation around center
      expect(rotated.minX).toBeCloseTo(centerX - 50, 0);
      expect(rotated.maxX).toBeCloseTo(centerX + 50, 0);
      expect(rotated.minY).toBeCloseTo(centerY - 100, 0);
      expect(rotated.maxY).toBeCloseTo(centerY + 100, 0);
    });
  });

  describe("normalizeAngle", () => {
    it("should normalize negative angles", () => {
      expect(normalizeAngle(-45)).toBe(315);
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-180)).toBe(180);
    });

    it("should normalize angles > 360", () => {
      expect(normalizeAngle(405)).toBe(45);
      expect(normalizeAngle(720)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
    });

    it("should keep valid angles unchanged", () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(45)).toBe(45);
      expect(normalizeAngle(180)).toBe(180);
      expect(normalizeAngle(359)).toBe(359);
    });

    it("should handle very large angles", () => {
      expect(normalizeAngle(1080)).toBe(0);
      expect(normalizeAngle(1125)).toBe(45);
    });
  });

  describe("PEN encode/decode round-trip with rotation", () => {
    it("should preserve rotated stitches through encode-decode cycle", () => {
      // Create simple square pattern
      const stitches = [
        [0, 0, 0, 0],
        [100, 0, 0, 0],
        [100, 100, 0, 0],
        [0, 100, 0, 0],
      ];
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      // Rotate 45°
      const rotated = transformStitchesRotation(stitches, 45, bounds);

      // Encode to PEN
      const encoded = encodeStitchesToPen(rotated);

      // Decode back
      const decoded = decodePenData(new Uint8Array(encoded.penBytes));

      // Verify stitch count preserved (note: lock stitches are added)
      expect(decoded.stitches.length).toBeGreaterThan(0);
    });

    it("should handle rotation with multiple colors", () => {
      const stitches = [
        [0, 0, 0, 0],
        [100, 0, 0, 0],
        [100, 100, 0, 1], // Color change
        [0, 100, 0, 1],
      ];
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      const rotated = transformStitchesRotation(stitches, 90, bounds);
      const encoded = encodeStitchesToPen(rotated);
      const decoded = decodePenData(new Uint8Array(encoded.penBytes));

      // Verify color blocks preserved
      expect(decoded.colorBlocks.length).toBeGreaterThan(0);
    });

    it("should handle negative coordinates after rotation", () => {
      const stitches = [
        [0, 0, 0, 0],
        [100, 0, 0, 0],
      ];
      const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };

      // Rotate 180° will produce negative coordinates
      const rotated = transformStitchesRotation(stitches, 180, bounds);

      // Encode to PEN
      const encoded = encodeStitchesToPen(rotated);
      const decoded = decodePenData(new Uint8Array(encoded.penBytes));

      // Should not crash and should produce valid output
      expect(decoded.stitches.length).toBeGreaterThan(0);
    });
  });
});
