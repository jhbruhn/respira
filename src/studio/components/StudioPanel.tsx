/**
 * Studio panel — generate an embroidery pattern from an imported SVG.
 *
 * The generated pattern is pushed into the shared `usePatternStore` as a normal
 * `PesPatternData`, so the existing canvas preview, hoop validation and
 * Bluetooth upload all work unchanged.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  SparklesIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/solid";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createFileService } from "../../platform";
import { useMachineStore } from "../../stores/useMachineStore";
import { useMachineUploadStore } from "../../stores/useMachineUploadStore";
import { usePatternStore } from "../../stores/usePatternStore";
import { useUIStore } from "../../stores/useUIStore";
import { usePatternRotationUpload } from "@/hooks";
import { canUploadPattern } from "../../utils/machineStateHelpers";
import { patternConverterClient } from "../../formats/import/client";
import { useStudioStore } from "../model/useStudioStore";
import { StudioShapeList } from "./StudioShapeList";
import { StudioSettings } from "./StudioSettings";

const AUTO_PREVIEW_DELAY = 300;

export function StudioPanel() {
  const [fileService] = useState(() => createFileService());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [exporting, setExporting] = useState(false);

  const {
    shapes,
    targetWidthMm,
    docSettings,
    status,
    error,
    importSvg,
    setTargetWidth,
    regenerate,
    getStitchExport,
  } = useStudioStore(
    useShallow((s) => ({
      shapes: s.shapes,
      targetWidthMm: s.targetWidthMm,
      docSettings: s.docSettings,
      status: s.status,
      error: s.error,
      importSvg: s.importSvg,
      setTargetWidth: s.setTargetWidth,
      regenerate: s.regenerate,
      getStitchExport: s.getStitchExport,
    })),
  );

  const setPattern = usePatternStore((s) => s.setPattern);
  const patternOffset = usePatternStore((s) => s.patternOffset);
  const setUploadedPattern = usePatternStore((s) => s.setUploadedPattern);

  const { isConnected, machineStatus } = useMachineStore(
    useShallow((s) => ({
      isConnected: s.isConnected,
      machineStatus: s.machineStatus,
    })),
  );
  const { isUploading, uploadPattern } = useMachineUploadStore(
    useShallow((s) => ({
      isUploading: s.isUploading,
      uploadPattern: s.uploadPattern,
    })),
  );
  const { pyodideReady, initializePyodide } = useUIStore(
    useShallow((s) => ({
      pyodideReady: s.pyodideReady,
      initializePyodide: s.initializePyodide,
    })),
  );

  const { handleUpload } = usePatternRotationUpload({
    uploadPattern,
    setUploadedPattern,
  });

  // Auto-preview: rebuild stitches shortly after any change and push to the canvas.
  useEffect(() => {
    if (shapes.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const pesData = regenerate();
      if (pesData) setPattern(pesData, "studio.pes");
    }, AUTO_PREVIEW_DELAY);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [shapes, docSettings, targetWidthMm, regenerate, setPattern]);

  const handleSvgFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const text = await file.text();
      importSvg(text);
    },
    [importSvg],
  );

  const handleExportPes = useCallback(async () => {
    setExporting(true);
    try {
      if (!pyodideReady) await initializePyodide();
      const exportData = getStitchExport();
      if (!exportData) throw new Error("Nothing to export yet.");
      const bytes = await patternConverterClient.writePes(
        exportData.stitches,
        exportData.colors,
      );
      await fileService.saveFileDialog(bytes, "studio.pes", {
        description: "PES Embroidery",
        extensions: ["pes"],
      });
    } catch (err) {
      alert(
        `Export failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setExporting(false);
    }
  }, [pyodideReady, initializePyodide, getStitchExport, fileService]);

  const handleSendToMachine = useCallback(async () => {
    const pesData = regenerate();
    if (!pesData) return;
    setPattern(pesData, "studio.pes");
    await handleUpload(pesData, "studio.pes", patternOffset, 0);
  }, [regenerate, setPattern, handleUpload, patternOffset]);

  const busy = status === "building" || exporting || isUploading;
  const canSend =
    isConnected && canUploadPattern(machineStatus) && shapes.length > 0;

  return (
    <Card className="p-0 gap-0 border-l-4 border-secondary-600 dark:border-secondary-500">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <SparklesIcon className="w-6 h-6 flex-shrink-0 mt-0.5 text-secondary-600 dark:text-secondary-400" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Studio — SVG to embroidery
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {shapes.length === 0
                ? "Import an SVG to generate a pattern"
                : `${shapes.length} shape${shapes.length > 1 ? "s" : ""} · ${targetWidthMm} mm wide`}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          onChange={(e) => handleSvgFile(e.target.files?.[0] ?? null)}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {shapes.length === 0 ? "Import SVG" : "Replace SVG"}
          </Button>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            Width
            <input
              type="number"
              min={5}
              max={360}
              step={5}
              value={targetWidthMm}
              onChange={(e) => setTargetWidth(parseFloat(e.target.value) || 0)}
              className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-transparent px-1.5 py-1 text-right"
            />
            mm
          </label>
        </div>

        {error && (
          <p className="text-xs text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/20 rounded px-2 py-1.5">
            {error}
          </p>
        )}

        {shapes.length > 0 && (
          <>
            <StudioShapeList shapes={shapes} />
            <StudioSettings settings={docSettings} />

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                disabled={busy}
                onClick={handleExportPes}
                className="w-full"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                )}
                Export .pes
              </Button>
              <Button
                disabled={busy || !canSend}
                onClick={handleSendToMachine}
                className={cn("w-full")}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                )}
                Send to machine
              </Button>
              {!canSend && shapes.length > 0 && (
                <p className="text-[11px] text-gray-500 dark:text-gray-500">
                  {isConnected
                    ? "Machine must be homed and ready to receive a pattern."
                    : "Connect the machine to send directly."}
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
