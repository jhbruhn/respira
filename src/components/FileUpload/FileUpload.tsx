/**
 * FileUpload Component
 *
 * Orchestrates file upload UI with file selection, Pyodide initialization, pattern upload, and validation
 */

import { useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useMachineStore,
  usePatternUploaded,
} from "../../stores/useMachineStore";
import { useMachineUploadStore } from "../../stores/useMachineUploadStore";
import { useMachineCacheStore } from "../../stores/useMachineCacheStore";
import { usePatternStore } from "../../stores/usePatternStore";
import { useUIStore } from "../../stores/useUIStore";
import type { PesPatternData } from "../../formats/import/pesImporter";
import {
  useFileUpload,
  usePatternRotationUpload,
  usePatternValidation,
} from "@/hooks";
import { getDisplayFilename } from "../../utils/displayFilename";
import { PatternInfoSkeleton } from "../SkeletonLoader";
import { PatternInfo } from "../PatternInfo";
import { DocumentTextIcon } from "@heroicons/react/24/solid";
import { createFileService } from "../../platform";
import type { IFileService } from "../../platform/interfaces/IFileService";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FileSelector } from "./FileSelector";
import { PyodideProgress } from "./PyodideProgress";
import { UploadButton } from "./UploadButton";
import { UploadProgress } from "./UploadProgress";
import { BoundsValidator } from "./BoundsValidator";

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
  const displayFileName = getDisplayFilename({
    currentFileName,
    localFileName: fileName,
    resumeFileName,
  });

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

  const isSelectorDisabled =
    isLoading ||
    patternUploaded ||
    isUploading ||
    (uploadProgress > 0 && !patternUploaded);

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
          <FileSelector
            fileService={fileService}
            isLoading={isLoading}
            isDisabled={isSelectorDisabled}
            onFileChange={handleFileChange}
            displayFileName={displayFileName}
            patternUploaded={patternUploaded}
          />

          <UploadButton
            pesData={pesData}
            machineStatus={machineStatus}
            isConnected={isConnected}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            boundsFits={boundsCheck.fits}
            boundsError={boundsCheck.error}
            onUpload={handleUpload}
            patternUploaded={patternUploaded}
          />
        </div>

        <PyodideProgress
          pyodideReady={pyodideReady}
          pyodideProgress={pyodideProgress}
          pyodideLoadingStep={pyodideLoadingStep}
          isFileLoading={isLoading}
        />

        <BoundsValidator
          pesData={pesData}
          machineStatus={machineStatus}
          boundsError={boundsCheck.error}
        />

        <UploadProgress
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </CardContent>
    </Card>
  );
}
