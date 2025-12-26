import { useShallow } from "zustand/react/shallow";
import { useMachineStore, usePatternUploaded } from "../stores/useMachineStore";
import { usePatternStore } from "../stores/usePatternStore";
import { ConnectionPrompt } from "./ConnectionPrompt";
import { FileUpload } from "./FileUpload";
import { PatternSummaryCard } from "./PatternSummaryCard";
import { ProgressMonitor } from "./ProgressMonitor";

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

  // Derived state: pattern is uploaded if machine has pattern info
  const patternUploaded = usePatternUploaded();
  const hasPattern = pesData || uploadedPesData;

  return (
    <div className="flex flex-col gap-4 md:gap-5 lg:gap-6 lg:overflow-hidden">
      {/* Connect Button or Browser Hint - Show when disconnected */}
      {!isConnected && <ConnectionPrompt />}

      {/* Pattern File - Show during upload stage (before pattern is uploaded) */}
      {isConnected && !patternUploaded && <FileUpload />}

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
