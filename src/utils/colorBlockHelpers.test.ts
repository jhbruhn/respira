import { describe, it, expect } from "vitest";
import {
  calculateColorBlocks,
  findCurrentBlockIndex,
} from "./colorBlockHelpers";
import type { PesPatternData } from "../formats/import/client";

describe("colorBlockHelpers", () => {
  describe("calculateColorBlocks", () => {
    it("should return empty array when displayPattern is null", () => {
      const result = calculateColorBlocks(null);
      expect(result).toEqual([]);
    });

    it("should return empty array when penStitches is undefined", () => {
      const pattern = {
        penStitches: undefined,
      } as unknown as PesPatternData;

      const result = calculateColorBlocks(pattern);
      expect(result).toEqual([]);
    });

    it("should calculate color blocks from PEN data", () => {
      const pattern: Partial<PesPatternData> = {
        threads: [
          {
            color: 1,
            hex: "#FF0000",
            brand: "Brother",
            catalogNumber: "001",
            description: "Red",
            chart: "A",
          },
          {
            color: 2,
            hex: "#00FF00",
            brand: "Brother",
            catalogNumber: "002",
            description: "Green",
            chart: "B",
          },
        ],
        penStitches: {
          colorBlocks: [
            {
              startStitchIndex: 0,
              endStitchIndex: 100,
              colorIndex: 0,
              startStitch: 0,
              endStitch: 100,
            },
            {
              startStitchIndex: 100,
              endStitchIndex: 250,
              colorIndex: 1,
              startStitch: 100,
              endStitch: 250,
            },
          ],
          stitches: [],
          bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        },
      };

      const result = calculateColorBlocks(pattern as PesPatternData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        colorIndex: 0,
        threadHex: "#FF0000",
        threadCatalogNumber: "001",
        threadBrand: "Brother",
        threadDescription: "Red",
        threadChart: "A",
        startStitch: 0,
        endStitch: 100,
        stitchCount: 100,
      });
      expect(result[1]).toEqual({
        colorIndex: 1,
        threadHex: "#00FF00",
        threadCatalogNumber: "002",
        threadBrand: "Brother",
        threadDescription: "Green",
        threadChart: "B",
        startStitch: 100,
        endStitch: 250,
        stitchCount: 150,
      });
    });

    it("should use fallback values when thread data is missing", () => {
      const pattern: Partial<PesPatternData> = {
        threads: [],
        penStitches: {
          colorBlocks: [
            {
              startStitchIndex: 0,
              endStitchIndex: 50,
              colorIndex: 0,
              startStitch: 0,
              endStitch: 50,
            },
          ],
          stitches: [],
          bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        },
      };

      const result = calculateColorBlocks(pattern as PesPatternData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        colorIndex: 0,
        threadHex: "#000000", // Fallback for missing thread
        threadCatalogNumber: null,
        threadBrand: null,
        threadDescription: null,
        threadChart: null,
        startStitch: 0,
        endStitch: 50,
        stitchCount: 50,
      });
    });

    it("should handle null thread metadata fields", () => {
      const pattern: Partial<PesPatternData> = {
        threads: [
          {
            color: 1,
            hex: "#0000FF",
            brand: null,
            catalogNumber: null,
            description: null,
            chart: null,
          },
        ],
        penStitches: {
          colorBlocks: [
            {
              startStitchIndex: 0,
              endStitchIndex: 30,
              colorIndex: 0,
              startStitch: 0,
              endStitch: 30,
            },
          ],
          stitches: [],
          bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
        },
      };

      const result = calculateColorBlocks(pattern as PesPatternData);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        colorIndex: 0,
        threadHex: "#0000FF",
        threadCatalogNumber: null,
        threadBrand: null,
        threadDescription: null,
        threadChart: null,
        startStitch: 0,
        endStitch: 30,
        stitchCount: 30,
      });
    });
  });

  describe("findCurrentBlockIndex", () => {
    const colorBlocks = [
      {
        colorIndex: 0,
        threadHex: "#FF0000",
        threadCatalogNumber: "001",
        threadBrand: "Brother",
        threadDescription: "Red",
        threadChart: "A",
        startStitch: 0,
        endStitch: 100,
        stitchCount: 100,
      },
      {
        colorIndex: 1,
        threadHex: "#00FF00",
        threadCatalogNumber: "002",
        threadBrand: "Brother",
        threadDescription: "Green",
        threadChart: "B",
        startStitch: 100,
        endStitch: 250,
        stitchCount: 150,
      },
      {
        colorIndex: 2,
        threadHex: "#0000FF",
        threadCatalogNumber: "003",
        threadBrand: "Brother",
        threadDescription: "Blue",
        threadChart: "C",
        startStitch: 250,
        endStitch: 400,
        stitchCount: 150,
      },
    ];

    it("should find block containing stitch at start boundary", () => {
      expect(findCurrentBlockIndex(colorBlocks, 0)).toBe(0);
      expect(findCurrentBlockIndex(colorBlocks, 100)).toBe(1);
      expect(findCurrentBlockIndex(colorBlocks, 250)).toBe(2);
    });

    it("should find block containing stitch in middle", () => {
      expect(findCurrentBlockIndex(colorBlocks, 50)).toBe(0);
      expect(findCurrentBlockIndex(colorBlocks, 150)).toBe(1);
      expect(findCurrentBlockIndex(colorBlocks, 300)).toBe(2);
    });

    it("should return -1 for stitch before first block", () => {
      expect(findCurrentBlockIndex(colorBlocks, -1)).toBe(-1);
    });

    it("should return -1 for stitch at or after last block end", () => {
      expect(findCurrentBlockIndex(colorBlocks, 400)).toBe(-1);
      expect(findCurrentBlockIndex(colorBlocks, 500)).toBe(-1);
    });

    it("should return -1 for empty color blocks array", () => {
      expect(findCurrentBlockIndex([], 50)).toBe(-1);
    });

    it("should find block with single color block", () => {
      const singleBlock = [colorBlocks[0]];
      expect(findCurrentBlockIndex(singleBlock, 0)).toBe(0);
      expect(findCurrentBlockIndex(singleBlock, 50)).toBe(0);
      expect(findCurrentBlockIndex(singleBlock, 99)).toBe(0);
      expect(findCurrentBlockIndex(singleBlock, 100)).toBe(-1);
    });
  });
});
