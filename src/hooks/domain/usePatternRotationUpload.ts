import { useCallback } from "react";
import type { PesPatternData } from "../formats/import/pesImporter";
import { transformStitchesRotation } from "../utils/rotationUtils";
import { encodeStitchesToPen } from "../formats/pen/encoder";
import { decodePenData } from "../formats/pen/decoder";
import {
  calculatePatternCenter,
  calculateBoundsFromDecodedStitches,
} from "../components/PatternCanvas/patternCanvasHelpers";

export interface UsePatternRotationUploadParams {
  uploadPattern: (
    penData: Uint8Array,
    uploadedPesData: PesPatternData,
    fileName: string,
    patternOffset?: { x: number; y: number },
    patternRotation?: number,
    originalPesData?: PesPatternData,
  ) => Promise<void>;
  setUploadedPattern: (
    pesData: PesPatternData,
    offset: { x: number; y: number },
    fileName?: string,
  ) => void;
}

export interface UsePatternRotationUploadReturn {
  handleUpload: (
    pesData: PesPatternData,
    displayFileName: string,
    patternOffset: { x: number; y: number },
    patternRotation: number,
  ) => Promise<void>;
}

/**
 * Custom hook for handling pattern rotation transformation and upload
 *
 * Manages the complex rotation logic including:
 * - Stitch transformation with rotation
 * - PEN encoding/decoding for coordinate rounding
 * - Center shift calculation to maintain visual position
 * - Upload orchestration with proper caching
 *
 * @param params - Upload and store functions
 * @returns Upload handler function
 */
export function usePatternRotationUpload({
  uploadPattern,
  setUploadedPattern,
}: UsePatternRotationUploadParams): UsePatternRotationUploadReturn {
  const handleUpload = useCallback(
    async (
      pesData: PesPatternData,
      displayFileName: string,
      patternOffset: { x: number; y: number },
      patternRotation: number,
    ) => {
      let penDataToUpload = pesData.penData;
      let pesDataForUpload = pesData;

      // Apply rotation if needed
      if (patternRotation && patternRotation !== 0) {
        // Transform stitches
        const rotatedStitches = transformStitchesRotation(
          pesData.stitches,
          patternRotation,
          pesData.bounds,
        );

        // Encode to PEN (this will round coordinates)
        const penResult = encodeStitchesToPen(rotatedStitches);
        penDataToUpload = new Uint8Array(penResult.penBytes);

        // Decode back to get the ACTUAL pattern (after PEN rounding)
        const decoded = decodePenData(penDataToUpload);

        // Calculate bounds from the DECODED stitches (the actual data that will be rendered)
        const rotatedBounds = calculateBoundsFromDecodedStitches(decoded);

        // Calculate the center of the rotated pattern
        const originalCenter = calculatePatternCenter(pesData.bounds);
        const rotatedCenter = calculatePatternCenter(rotatedBounds);
        const centerShiftX = rotatedCenter.x - originalCenter.x;
        const centerShiftY = rotatedCenter.y - originalCenter.y;

        // CRITICAL: Adjust position to compensate for the center shift!
        // In Konva, visual position = (x - offsetX, y - offsetY).
        // Original visual pos: (x - originalCenter.x, y - originalCenter.y)
        // New visual pos: (newX - rotatedCenter.x, newY - rotatedCenter.y)
        // For same visual position: newX = x + (rotatedCenter.x - originalCenter.x)
        // So we need to add (rotatedCenter - originalCenter) to the position.
        const adjustedOffset = {
          x: patternOffset.x + centerShiftX,
          y: patternOffset.y + centerShiftY,
        };

        // Create rotated PesPatternData for upload
        pesDataForUpload = {
          ...pesData,
          stitches: rotatedStitches,
          penData: penDataToUpload,
          penStitches: decoded,
          bounds: rotatedBounds,
        };

        // Save uploaded pattern to store for preview BEFORE starting upload
        // This allows the preview to show immediately when isUploading becomes true
        setUploadedPattern(pesDataForUpload, adjustedOffset);

        // Upload the pattern with offset
        // IMPORTANT: Pass original unrotated pesData for caching, rotated pesData for upload
        await uploadPattern(
          penDataToUpload,
          pesDataForUpload,
          displayFileName,
          adjustedOffset,
          patternRotation,
          pesData, // Original unrotated pattern for caching
        );

        return;
      }

      // No rotation case
      // Save uploaded pattern to store BEFORE starting upload
      setUploadedPattern(pesDataForUpload, patternOffset);

      // Upload the pattern
      await uploadPattern(
        penDataToUpload,
        pesDataForUpload,
        displayFileName,
        patternOffset,
        0, // No rotation
        // No need to pass originalPesData since it's the same as pesDataForUpload
      );
    },
    [uploadPattern, setUploadedPattern],
  );

  return {
    handleUpload,
  };
}
