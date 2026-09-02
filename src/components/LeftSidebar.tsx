import { useShallow } from "zustand/react/shallow";
import { useMachineStore, usePatternUploaded } from "../stores/useMachineStore";
import { usePatternStore } from "../stores/usePatternStore";
import { useUIStore } from "../stores/useUIStore";
import { ConnectionPrompt } from "./ConnectionPrompt";
import { FileUpload } from "./FileUpload";
import { PatternSummaryCard } from "./PatternSummaryCard";
import { ProgressMonitor } from "./ProgressMonitor";
import { StudioPanel } from "../studio/components/StudioPanel";
import { cn } from "@/lib/utils";

export function LeftSidebar() {
  const { isConnected } = useMachineStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
    })),
  );

  const { pesData, uploadedPesData } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      uploadedPesData: state.uploadedPesData,
    })),
  );

  const { sidebarMode, setSidebarMode } = useUIStore(
    useShallow((state) => ({
      sidebarMode: state.sidebarMode,
      setSidebarMode: state.setSidebarMode,
    })),
  );

  // Derived state: pattern is uploaded if machine has pattern info
  const patternUploaded = usePatternUploaded();
  const hasPattern = pesData || uploadedPesData;

  return (
    <div className="flex flex-col gap-4 md:gap-5 lg:gap-6 lg:overflow-hidden">
      {/* Connect Button or Browser Hint - Show when disconnected */}
      {!isConnected && <ConnectionPrompt />}

      {/* Pattern source: PES upload or Studio editor */}
      {!patternUploaded && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-200 dark:bg-gray-800 p-1">
            {(["upload", "studio"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSidebarMode(mode)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  sidebarMode === mode
                    ? "bg-white dark:bg-gray-950 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                )}
              >
                {mode === "upload" ? "Upload PES" : "Studio"}
              </button>
            ))}
          </div>

          {sidebarMode === "upload" ? (
            isConnected ? (
              <FileUpload />
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
                Connect the machine to upload a PES file, or use the Studio tab
                to design and export one offline.
              </p>
            )
          ) : (
            <StudioPanel />
          )}
        </div>
      )}

      {/* Compact Pattern Summary - Show after upload (during sewing stages) */}
      {isConnected && patternUploaded && hasPattern && <PatternSummaryCard />}

      {/* Progress Monitor - Show when pattern is uploaded */}
      {isConnected && patternUploaded && (
        <div className="lg:flex-1 lg:min-h-0">
          <ProgressMonitor />
        </div>
      )}
    </div>
  );
}
