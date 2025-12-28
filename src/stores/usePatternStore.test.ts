import { describe, it, expect, beforeEach } from "vitest";
import {
  usePatternStore,
  selectPatternCenter,
  selectUploadedPatternCenter,
  selectRotatedBounds,
  selectRotationCenterShift,
} from "./usePatternStore";
import type { PesPatternData } from "../formats/import/pesImporter";

// Mock pattern data for testing
const createMockPesData = (
  bounds = {
    minX: -100,
    maxX: 100,
    minY: -50,
    maxY: 50,
  },
): PesPatternData => ({
  stitches: [[0, 0, 0, 0]],
  threads: [],
  uniqueColors: [],
  penData: new Uint8Array(),
  penStitches: {
    stitches: [],
    colorBlocks: [],
    bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  },
  colorCount: 1,
  stitchCount: 1,
  bounds,
});

describe("usePatternStore selectors", () => {
  beforeEach(() => {
    // Reset store state before each test
    const state = usePatternStore.getState();
    state.setPattern(createMockPesData(), "test.pes");
    state.resetPatternOffset();
    state.resetRotation();
    state.clearUploadedPattern();
  });

  describe("selectPatternCenter", () => {
    it("should return null when no pattern is loaded", () => {
      // Clear the pattern
      usePatternStore.setState({ pesData: null });

      const center = selectPatternCenter(usePatternStore.getState());
      expect(center).toBeNull();
    });

    it("should calculate center correctly for symmetric bounds", () => {
      const state = usePatternStore.getState();
      const center = selectPatternCenter(state);

      expect(center).not.toBeNull();
      expect(center!.x).toBe(0); // (minX + maxX) / 2 = (-100 + 100) / 2 = 0
      expect(center!.y).toBe(0); // (minY + maxY) / 2 = (-50 + 50) / 2 = 0
    });

    it("should calculate center correctly for asymmetric bounds", () => {
      const pesData = createMockPesData({
        minX: 0,
        maxX: 200,
        minY: 0,
        maxY: 100,
      });
      usePatternStore.setState({ pesData });

      const state = usePatternStore.getState();
      const center = selectPatternCenter(state);

      expect(center).not.toBeNull();
      expect(center!.x).toBe(100); // (0 + 200) / 2
      expect(center!.y).toBe(50); // (0 + 100) / 2
    });
  });

  describe("selectUploadedPatternCenter", () => {
    it("should return null when no uploaded pattern", () => {
      const state = usePatternStore.getState();
      const center = selectUploadedPatternCenter(state);

      expect(center).toBeNull();
    });

    it("should calculate center of uploaded pattern", () => {
      const uploadedData = createMockPesData({
        minX: 50,
        maxX: 150,
        minY: 25,
        maxY: 75,
      });
      usePatternStore
        .getState()
        .setUploadedPattern(uploadedData, { x: 0, y: 0 });

      const state = usePatternStore.getState();
      const center = selectUploadedPatternCenter(state);

      expect(center).not.toBeNull();
      expect(center!.x).toBe(100); // (50 + 150) / 2
      expect(center!.y).toBe(50); // (25 + 75) / 2
    });
  });

  describe("selectRotatedBounds", () => {
    it("should return original bounds when no rotation", () => {
      const state = usePatternStore.getState();
      const result = selectRotatedBounds(state);

      expect(result).not.toBeNull();
      expect(result!.bounds).toEqual({
        minX: -100,
        maxX: 100,
        minY: -50,
        maxY: 50,
      });
      expect(result!.center).toEqual({ x: 0, y: 0 });
    });

    it("should return null when no pattern", () => {
      usePatternStore.setState({ pesData: null });
      const state = usePatternStore.getState();
      const result = selectRotatedBounds(state);

      expect(result).toBeNull();
    });

    it("should calculate rotated bounds for 90 degree rotation", () => {
      usePatternStore.getState().setPatternRotation(90);
      const state = usePatternStore.getState();
      const result = selectRotatedBounds(state);

      expect(result).not.toBeNull();
      // After 90° rotation, X and Y bounds should swap
      expect(result!.bounds.minX).toBeCloseTo(-50, 0);
      expect(result!.bounds.maxX).toBeCloseTo(50, 0);
      expect(result!.bounds.minY).toBeCloseTo(-100, 0);
      expect(result!.bounds.maxY).toBeCloseTo(100, 0);
    });

    it("should expand bounds for 45 degree rotation", () => {
      usePatternStore.getState().setPatternRotation(45);
      const state = usePatternStore.getState();
      const result = selectRotatedBounds(state);

      expect(result).not.toBeNull();
      // After 45° rotation, bounds should expand
      expect(Math.abs(result!.bounds.minX)).toBeGreaterThan(100);
      expect(Math.abs(result!.bounds.minY)).toBeGreaterThan(50);
    });
  });

  describe("selectRotationCenterShift", () => {
    it("should return zero shift when no rotation", () => {
      const state = usePatternStore.getState();
      const rotatedBounds = state.pesData!.bounds;
      const shift = selectRotationCenterShift(state, rotatedBounds);

      expect(shift).toEqual({ x: 0, y: 0 });
    });

    it("should return null when no pattern", () => {
      usePatternStore.setState({ pesData: null });
      const state = usePatternStore.getState();
      const shift = selectRotationCenterShift(state, {
        minX: 0,
        maxX: 100,
        minY: 0,
        maxY: 100,
      });

      expect(shift).toBeNull();
    });

    it("should calculate center shift for asymmetric pattern", () => {
      const pesData = createMockPesData({
        minX: 0,
        maxX: 200,
        minY: 0,
        maxY: 100,
      });
      usePatternStore.setState({ pesData });
      usePatternStore.getState().setPatternRotation(90);

      const state = usePatternStore.getState();
      const rotatedBounds = selectRotatedBounds(state)!.bounds;
      const shift = selectRotationCenterShift(state, rotatedBounds);

      expect(shift).not.toBeNull();
      // Original center: (100, 50)
      // After 90° rotation around center, new center should be slightly different
      // due to the asymmetric bounds
      expect(shift!.x).toBeCloseTo(0, 0);
      expect(shift!.y).toBeCloseTo(0, 0);
    });
  });
});
