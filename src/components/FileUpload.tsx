import { useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMachineStore, usePatternUploaded } from "../stores/useMachineStore";
import { useMachineUploadStore } from "../stores/useMachineUploadStore";
import { useMachineCacheStore } from "../stores/useMachineCacheStore";
import { usePatternStore } from "../stores/usePatternStore";
import { useUIStore } from "../stores/useUIStore";
import type { PesPatternData } from "../formats/import/pesImporter";
import {
  canUploadPattern,
  getMachineStateCategory,
} from "../utils/machineStateHelpers";
import { useFileUpload } from "../hooks/useFileUpload";
import { usePatternRotationUpload } from "../hooks/usePatternRotationUpload";
import { usePatternValidation } from "../hooks/usePatternValidation";
import { PatternInfoSkeleton } from "./SkeletonLoader";
import { PatternInfo } from "./PatternInfo";
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/solid";
import { createFileService } from "../platform";
import type { IFileService } from "../platform/interfaces/IFileService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FileUpload() {
  // Machine store
  const { isConnected, machineStatus, machineInfo } = useMachineStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      machineStatus: state.machineStatus,
      machineInfo: state.machineInfo,
    })),
  );

  // Machine upload store
  const { uploadProgress, isUploading, uploadPattern } = useMachineUploadStore(
    useShallow((state) => ({
      uploadProgress: state.uploadProgress,
      isUploading: state.isUploading,
      uploadPattern: state.uploadPattern,
    })),
  );

  // Machine cache store
  const { resumeAvailable, resumeFileName } = useMachineCacheStore(
    useShallow((state) => ({
      resumeAvailable: state.resumeAvailable,
      resumeFileName: state.resumeFileName,
    })),
  );

  // Pattern store
  const {
    pesData: pesDataProp,
    currentFileName,
    patternOffset,
    patternRotation,
    setPattern,
    setUploadedPattern,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      currentFileName: state.currentFileName,
      patternOffset: state.patternOffset,
      patternRotation: state.patternRotation,
      setPattern: state.setPattern,
      setUploadedPattern: state.setUploadedPattern,
    })),
  );

  // Derived state: pattern is uploaded if machine has pattern info
  const patternUploaded = usePatternUploaded();

  // UI store
  const {
    pyodideReady,
    pyodideProgress,
    pyodideLoadingStep,
    initializePyodide,
  } = useUIStore(
    useShallow((state) => ({
      pyodideReady: state.pyodideReady,
      pyodideProgress: state.pyodideProgress,
      pyodideLoadingStep: state.pyodideLoadingStep,
      initializePyodide: state.initializePyodide,
    })),
  );
  const [localPesData, setLocalPesData] = useState<PesPatternData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileService] = useState<IFileService>(() => createFileService());

  // Use prop pesData if available (from cached pattern), otherwise use local state
  const pesData = pesDataProp || localPesData;
  // Use currentFileName from App state, or local fileName, or resumeFileName for display
  const displayFileName = currentFileName || fileName || resumeFileName || "";

  // File upload hook - handles file selection and conversion
  const { isLoading, handleFileChange } = useFileUpload({
    fileService,
    pyodideReady,
    initializePyodide,
    onFileLoaded: useCallback(
      (data: PesPatternData, name: string) => {
        setLocalPesData(data);
        setFileName(name);
        setPattern(data, name);
      },
      [setPattern],
    ),
  });

  // Pattern rotation and upload hook - handles rotation transformation
  const { handleUpload: handlePatternUpload } = usePatternRotationUpload({
    uploadPattern,
    setUploadedPattern,
  });

  // Wrapper to call upload with current pattern data
  const handleUpload = useCallback(async () => {
    if (pesData && displayFileName) {
      await handlePatternUpload(
        pesData,
        displayFileName,
        patternOffset,
        patternRotation,
      );
    }
  }, [
    pesData,
    displayFileName,
    patternOffset,
    patternRotation,
    handlePatternUpload,
  ]);

  // Pattern validation hook - checks if pattern fits in hoop
  const boundsCheck = usePatternValidation({
    pesData,
    machineInfo,
    patternOffset,
    patternRotation,
  });

  const borderColor = pesData
    ? "border-secondary-600 dark:border-secondary-500"
    : "border-gray-400 dark:border-gray-600";
  const iconColor = pesData
    ? "text-secondary-600 dark:text-secondary-400"
    : "text-gray-600 dark:text-gray-400";

  return (
    <Card className={cn("p-0 gap-0 border-l-4", borderColor)}>
      <CardContent className="p-4 rounded-lg">
        <div className="flex items-start gap-3 mb-3">
          <DocumentTextIcon
            className={cn("w-6 h-6 flex-shrink-0 mt-0.5", iconColor)}
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Pattern File
            </h3>
            {pesData && displayFileName ? (
              <p
                className="text-xs text-gray-600 dark:text-gray-400 truncate"
                title={displayFileName}
              >
                {displayFileName}
              </p>
            ) : (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                No pattern loaded
              </p>
            )}
          </div>
        </div>

        {resumeAvailable && resumeFileName && (
          <div className="bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 px-3 py-2 rounded mb-3">
            <p className="text-xs text-success-800 dark:text-success-200">
              <strong>Cached:</strong> "{resumeFileName}"
            </p>
          </div>
        )}

        {isLoading && <PatternInfoSkeleton />}

        {!isLoading && pesData && (
          <div className="mb-3">
            <PatternInfo pesData={pesData} showThreadBlocks />
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input
            type="file"
            accept=".pes"
            onChange={handleFileChange}
            id="file-input"
            className="hidden"
            disabled={
              isLoading ||
              patternUploaded ||
              isUploading ||
              (uploadProgress > 0 && !patternUploaded)
            }
          />
          <Button
            asChild={
              !fileService.hasNativeDialogs() &&
              !(
                isLoading ||
                patternUploaded ||
                isUploading ||
                (uploadProgress > 0 && !patternUploaded)
              )
            }
            onClick={
              fileService.hasNativeDialogs()
                ? () => handleFileChange()
                : undefined
            }
            disabled={
              isLoading ||
              patternUploaded ||
              isUploading ||
              (uploadProgress > 0 && !patternUploaded)
            }
            variant="outline"
            className="flex-[2]"
          >
            {fileService.hasNativeDialogs() ? (
              <>
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : patternUploaded ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Locked</span>
                  </>
                ) : (
                  <>
                    <FolderOpenIcon className="w-3.5 h-3.5" />
                    <span>Choose PES File</span>
                  </>
                )}
              </>
            ) : (
              <label
                htmlFor="file-input"
                className="flex items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : patternUploaded ? (
                  <>
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Locked</span>
                  </>
                ) : (
                  <>
                    <FolderOpenIcon className="w-3.5 h-3.5" />
                    <span>Choose PES File</span>
                  </>
                )}
              </label>
            )}
          </Button>

          {pesData &&
            canUploadPattern(machineStatus) &&
            !patternUploaded &&
            uploadProgress < 100 && (
              <Button
                onClick={handleUpload}
                disabled={!isConnected || isUploading || !boundsCheck.fits}
                className="flex-1"
                aria-label={
                  isUploading
                    ? `Uploading pattern: ${uploadProgress.toFixed(0)}% complete`
                    : boundsCheck.error || "Upload pattern to machine"
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {uploadProgress > 0
                      ? uploadProgress.toFixed(0) + "%"
                      : "Uploading"}
                  </>
                ) : (
                  <>
                    <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                    Upload
                  </>
                )}
              </Button>
            )}
        </div>

        {/* Pyodide initialization progress indicator - shown when initializing or waiting */}
        {!pyodideReady && pyodideProgress > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {isLoading && !pyodideReady
                  ? "Please wait - initializing Python environment..."
                  : pyodideLoadingStep || "Initializing Python environment..."}
              </span>
              <span className="text-xs font-bold text-primary-600 dark:text-primary-400">
                {pyodideProgress.toFixed(0)}%
              </span>
            </div>
            <Progress value={pyodideProgress} className="h-2.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">
              {isLoading && !pyodideReady
                ? "File dialog will open automatically when ready"
                : "This only happens once on first use"}
            </p>
          </div>
        )}

        {/* Error/warning messages with smooth transition - placed after buttons */}
        <div
          className="transition-all duration-200 ease-in-out overflow-hidden"
          style={{
            maxHeight:
              pesData && (boundsCheck.error || !canUploadPattern(machineStatus))
                ? "200px"
                : "0px",
            marginTop:
              pesData && (boundsCheck.error || !canUploadPattern(machineStatus))
                ? "12px"
                : "0px",
          }}
        >
          {pesData && !canUploadPattern(machineStatus) && (
            <Alert className="bg-warning-100 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
              <AlertDescription className="text-warning-800 dark:text-warning-200 text-sm">
                Cannot upload while {getMachineStateCategory(machineStatus)}
              </AlertDescription>
            </Alert>
          )}

          {pesData && boundsCheck.error && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Pattern too large:</strong> {boundsCheck.error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {isUploading && uploadProgress < 100 && (
          <div className="mt-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Uploading
              </span>
              <span className="text-xs font-bold text-secondary-600 dark:text-secondary-400">
                {uploadProgress > 0
                  ? uploadProgress.toFixed(1) + "%"
                  : "Starting..."}
              </span>
            </div>
            <Progress
              value={uploadProgress}
              className="h-2.5 [&>div]:bg-gradient-to-r [&>div]:from-secondary-500 [&>div]:via-secondary-600 [&>div]:to-secondary-700 dark:[&>div]:from-secondary-600 dark:[&>div]:via-secondary-700 dark:[&>div]:to-secondary-800"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
