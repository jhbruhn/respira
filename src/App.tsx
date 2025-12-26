import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMachineCacheStore } from "./stores/useMachineCacheStore";
import { usePatternStore } from "./stores/usePatternStore";
import { useUIStore } from "./stores/useUIStore";
import { AppHeader } from "./components/AppHeader";
import { LeftSidebar } from "./components/LeftSidebar";
import { PatternCanvas } from "./components/PatternCanvas";
import { PatternCanvasPlaceholder } from "./components/PatternCanvasPlaceholder";
import { BluetoothDevicePicker } from "./components/BluetoothDevicePicker";
import { transformStitchesRotation } from "./utils/rotationUtils";
import { encodeStitchesToPen } from "./formats/pen/encoder";
import { decodePenData } from "./formats/pen/decoder";
import {
  calculatePatternCenter,
  calculateBoundsFromDecodedStitches,
} from "./components/PatternCanvas/patternCanvasHelpers";
import "./App.css";

function App() {
  // Set page title with version
  useEffect(() => {
    document.title = `Respira v${__APP_VERSION__}`;
  }, []);

  // Machine cache store - for auto-loading cached pattern
  const { resumedPattern, resumeFileName } = useMachineCacheStore(
    useShallow((state) => ({
      resumedPattern: state.resumedPattern,
      resumeFileName: state.resumeFileName,
    })),
  );

  // Pattern store - for auto-loading cached pattern
  const {
    pesData,
    uploadedPesData,
    setPattern,
    setUploadedPattern,
    setPatternRotation,
    setPatternOffset,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      uploadedPesData: state.uploadedPesData,
      setPattern: state.setPattern,
      setUploadedPattern: state.setUploadedPattern,
      setPatternRotation: state.setPatternRotation,
      setPatternOffset: state.setPatternOffset,
    })),
  );

  // UI store - for Pyodide initialization
  const { initializePyodide } = useUIStore(
    useShallow((state) => ({
      initializePyodide: state.initializePyodide,
    })),
  );

  // Initialize Pyodide in background on mount (non-blocking thanks to worker)
  useEffect(() => {
    initializePyodide();
  }, [initializePyodide]);

  // Auto-load cached pattern when available
  useEffect(() => {
    // Only auto-load if we have a resumed pattern and haven't already loaded it
    if (resumedPattern && !uploadedPesData && !pesData) {
      if (!resumedPattern.pesData) {
        console.error(
          "[App] ERROR: resumedPattern has no pesData!",
          resumedPattern,
        );
        return;
      }

      console.log(
        "[App] Loading resumed pattern:",
        resumeFileName,
        "Offset:",
        resumedPattern.patternOffset,
        "Rotation:",
        resumedPattern.patternRotation,
        "Has stitches:",
        resumedPattern.pesData.stitches?.length || 0,
        "Has cached uploaded data:",
        !!resumedPattern.uploadedPesData,
      );

      const originalPesData = resumedPattern.pesData;
      const cachedUploadedPesData = resumedPattern.uploadedPesData;
      const rotation = resumedPattern.patternRotation || 0;
      const originalOffset = resumedPattern.patternOffset || { x: 0, y: 0 };

      // Set the original pattern data for editing
      setPattern(originalPesData, resumeFileName || "");

      // Restore the original offset (setPattern resets it to 0,0)
      setPatternOffset(originalOffset.x, originalOffset.y);

      // Set rotation if present
      if (rotation !== 0) {
        setPatternRotation(rotation);
      }

      // Use cached uploadedPesData if available, otherwise recalculate
      if (cachedUploadedPesData) {
        // Use the exact uploaded data from cache
        // Calculate the adjusted offset (same logic as upload)
        if (rotation !== 0) {
          const originalCenter = calculatePatternCenter(originalPesData.bounds);
          const rotatedCenter = calculatePatternCenter(
            cachedUploadedPesData.bounds,
          );
          const centerShiftX = rotatedCenter.x - originalCenter.x;
          const centerShiftY = rotatedCenter.y - originalCenter.y;

          const adjustedOffset = {
            x: originalOffset.x + centerShiftX,
            y: originalOffset.y + centerShiftY,
          };

          setUploadedPattern(
            cachedUploadedPesData,
            adjustedOffset,
            resumeFileName || undefined,
          );
        } else {
          setUploadedPattern(
            cachedUploadedPesData,
            originalOffset,
            resumeFileName || undefined,
          );
        }
      } else if (rotation !== 0) {
        // Fallback: recalculate if no cached uploaded data (shouldn't happen for new uploads)
        console.warn("[App] No cached uploaded data, recalculating rotation");
        const rotatedStitches = transformStitchesRotation(
          originalPesData.stitches,
          rotation,
          originalPesData.bounds,
        );

        const penResult = encodeStitchesToPen(rotatedStitches);
        const penData = new Uint8Array(penResult.penBytes);
        const decoded = decodePenData(penData);
        const rotatedBounds = calculateBoundsFromDecodedStitches(decoded);

        const originalCenter = calculatePatternCenter(originalPesData.bounds);
        const rotatedCenter = calculatePatternCenter(rotatedBounds);
        const centerShiftX = rotatedCenter.x - originalCenter.x;
        const centerShiftY = rotatedCenter.y - originalCenter.y;

        const adjustedOffset = {
          x: originalOffset.x + centerShiftX,
          y: originalOffset.y + centerShiftY,
        };

        const rotatedPesData = {
          ...originalPesData,
          stitches: rotatedStitches,
          penData,
          penStitches: decoded,
          bounds: rotatedBounds,
        };

        setUploadedPattern(
          rotatedPesData,
          adjustedOffset,
          resumeFileName || undefined,
        );
      } else {
        // No rotation - uploaded pattern is same as original
        setUploadedPattern(
          originalPesData,
          originalOffset,
          resumeFileName || undefined,
        );
      }
    }
  }, [
    resumedPattern,
    resumeFileName,
    uploadedPesData,
    pesData,
    setPattern,
    setUploadedPattern,
    setPatternRotation,
    setPatternOffset,
  ]);

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <AppHeader />

      <div className="flex-1 p-4 sm:p-5 lg:p-6 w-full overflow-y-auto lg:overflow-hidden flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-4 md:gap-5 lg:gap-6 lg:overflow-hidden">
          {/* Left Column - Controls */}
          <LeftSidebar />

          {/* Right Column - Pattern Preview */}
          <div className="flex flex-col lg:overflow-hidden lg:h-full">
            {pesData || uploadedPesData ? (
              <PatternCanvas />
            ) : (
              <PatternCanvasPlaceholder />
            )}
          </div>
        </div>

        {/* Bluetooth Device Picker (Electron only) */}
        <BluetoothDevicePicker />
      </div>
    </div>
  );
}

export default App;
