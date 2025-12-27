/**
 * UploadButton Component
 *
 * Renders upload button with progress, conditionally shown based on machine state
 */

import { ArrowUpTrayIcon } from "@heroicons/react/24/solid";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MachineStatus } from "../../types/machine";
import { canUploadPattern } from "../../utils/machineStateHelpers";
import type { PesPatternData } from "../../formats/import/pesImporter";

interface UploadButtonProps {
  pesData: PesPatternData | null;
  machineStatus: MachineStatus;
  isConnected: boolean;
  isUploading: boolean;
  uploadProgress: number;
  boundsFits: boolean;
  boundsError: string | null;
  onUpload: () => Promise<void>;
  patternUploaded: boolean;
}

export function UploadButton({
  pesData,
  machineStatus,
  isConnected,
  isUploading,
  uploadProgress,
  boundsFits,
  boundsError,
  onUpload,
  patternUploaded,
}: UploadButtonProps) {
  const shouldShow =
    pesData &&
    canUploadPattern(machineStatus) &&
    !patternUploaded &&
    uploadProgress < 100;

  if (!shouldShow) return null;

  return (
    <Button
      onClick={onUpload}
      disabled={!isConnected || isUploading || !boundsFits}
      className="flex-1"
      aria-label={
        isUploading
          ? `Uploading pattern: ${uploadProgress.toFixed(0)}% complete`
          : boundsError || "Upload pattern to machine"
      }
    >
      {isUploading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {uploadProgress > 0 ? uploadProgress.toFixed(0) + "%" : "Uploading"}
        </>
      ) : (
        <>
          <ArrowUpTrayIcon className="w-3.5 h-3.5" />
          Upload
        </>
      )}
    </Button>
  );
}
