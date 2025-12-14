import { useState, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMachineStore } from '../stores/useMachineStore';
import { usePatternStore } from '../stores/usePatternStore';
import { useUIStore } from '../stores/useUIStore';
import { convertPesToPen, type PesPatternData } from '../formats/import/pesImporter';
import { canUploadPattern, getMachineStateCategory } from '../utils/machineStateHelpers';
import { PatternInfoSkeleton } from './SkeletonLoader';
import { ArrowUpTrayIcon, CheckCircleIcon, DocumentTextIcon, FolderOpenIcon } from '@heroicons/react/24/solid';
import { createFileService } from '../platform';
import type { IFileService } from '../platform/interfaces/IFileService';

export function FileUpload() {
  // Machine store
  const {
    isConnected,
    machineStatus,
    uploadProgress,
    isUploading,
    machineInfo,
    resumeAvailable,
    resumeFileName,
    uploadPattern,
  } = useMachineStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      machineStatus: state.machineStatus,
      uploadProgress: state.uploadProgress,
      isUploading: state.isUploading,
      machineInfo: state.machineInfo,
      resumeAvailable: state.resumeAvailable,
      resumeFileName: state.resumeFileName,
      uploadPattern: state.uploadPattern,
    }))
  );

  // Pattern store
  const {
    pesData: pesDataProp,
    currentFileName,
    patternOffset,
    patternUploaded,
    setPattern,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      currentFileName: state.currentFileName,
      patternOffset: state.patternOffset,
      patternUploaded: state.patternUploaded,
      setPattern: state.setPattern,
    }))
  );

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
    }))
  );
  const [localPesData, setLocalPesData] = useState<PesPatternData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileService] = useState<IFileService>(() => createFileService());

  // Use prop pesData if available (from cached pattern), otherwise use local state
  const pesData = pesDataProp || localPesData;
  // Use currentFileName from App state, or local fileName, or resumeFileName for display
  const displayFileName = currentFileName || fileName || resumeFileName || '';
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = useCallback(
    async (event?: React.ChangeEvent<HTMLInputElement>) => {
      setIsLoading(true);
      try {
        // Wait for Pyodide if it's still loading
        if (!pyodideReady) {
          console.log('[FileUpload] Waiting for Pyodide to finish loading...');
          await initializePyodide();
          console.log('[FileUpload] Pyodide ready');
        }

        let file: File | null = null;

        // In Electron, use native file dialogs
        if (fileService.hasNativeDialogs()) {
          file = await fileService.openFileDialog({ accept: '.pes' });
        } else {
          // In browser, use the input element
          file = event?.target.files?.[0] || null;
        }

        if (!file) {
          setIsLoading(false);
          return;
        }

        const data = await convertPesToPen(file);
        setLocalPesData(data);
        setFileName(file.name);
        setPattern(data, file.name);
      } catch (err) {
        alert(
          `Failed to load PES file: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [fileService, setPattern, pyodideReady, initializePyodide]
  );

  const handleUpload = useCallback(() => {
    if (pesData && displayFileName) {
      uploadPattern(pesData.penData, pesData, displayFileName, patternOffset);
    }
  }, [pesData, displayFileName, uploadPattern, patternOffset]);

  // Check if pattern (with offset) fits within hoop bounds
  const checkPatternFitsInHoop = useCallback(() => {
    if (!pesData || !machineInfo) {
      return { fits: true, error: null };
    }

    const { bounds } = pesData;
    const { maxWidth, maxHeight } = machineInfo;

    // Calculate pattern bounds with offset applied
    const patternMinX = bounds.minX + patternOffset.x;
    const patternMaxX = bounds.maxX + patternOffset.x;
    const patternMinY = bounds.minY + patternOffset.y;
    const patternMaxY = bounds.maxY + patternOffset.y;

    // Hoop bounds (centered at origin)
    const hoopMinX = -maxWidth / 2;
    const hoopMaxX = maxWidth / 2;
    const hoopMinY = -maxHeight / 2;
    const hoopMaxY = maxHeight / 2;

    // Check if pattern exceeds hoop bounds
    const exceedsLeft = patternMinX < hoopMinX;
    const exceedsRight = patternMaxX > hoopMaxX;
    const exceedsTop = patternMinY < hoopMinY;
    const exceedsBottom = patternMaxY > hoopMaxY;

    if (exceedsLeft || exceedsRight || exceedsTop || exceedsBottom) {
      const directions = [];
      if (exceedsLeft) directions.push(`left by ${((hoopMinX - patternMinX) / 10).toFixed(1)}mm`);
      if (exceedsRight) directions.push(`right by ${((patternMaxX - hoopMaxX) / 10).toFixed(1)}mm`);
      if (exceedsTop) directions.push(`top by ${((hoopMinY - patternMinY) / 10).toFixed(1)}mm`);
      if (exceedsBottom) directions.push(`bottom by ${((patternMaxY - hoopMaxY) / 10).toFixed(1)}mm`);

      return {
        fits: false,
        error: `Pattern exceeds hoop bounds: ${directions.join(', ')}. Adjust pattern position in preview.`
      };
    }

    return { fits: true, error: null };
  }, [pesData, machineInfo, patternOffset]);

  const boundsCheck = checkPatternFitsInHoop();

  const borderColor = pesData ? 'border-orange-600 dark:border-orange-500' : 'border-gray-400 dark:border-gray-600';
  const iconColor = pesData ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400';

  return (
    <div className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 ${borderColor}`}>
      <div className="flex items-start gap-3 mb-3">
        <DocumentTextIcon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Pattern File</h3>
          {pesData && displayFileName ? (
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={displayFileName}>
              {displayFileName}
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">No pattern loaded</p>
          )}
        </div>
      </div>

      {resumeAvailable && resumeFileName && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2 rounded mb-3">
          <p className="text-xs text-green-800 dark:text-green-200">
            <strong>Cached:</strong> "{resumeFileName}"
          </p>
        </div>
      )}

      {isLoading && <PatternInfoSkeleton />}

      {!isLoading && pesData && (
        <div className="mb-3">
          <div className="grid grid-cols-3 gap-2 text-xs mb-2">
            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">Size</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
                {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">Stitches</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {pesData.stitchCount.toLocaleString()}
              </span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
              <span className="text-gray-600 dark:text-gray-400 block">Colors / Blocks</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {pesData.uniqueColors.length} / {pesData.threads.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Colors:</span>
            <div className="flex gap-1">
              {pesData.uniqueColors.slice(0, 8).map((color, idx) => {
                // Primary metadata: brand and catalog number
                const primaryMetadata = [
                  color.brand,
                  color.catalogNumber ? `#${color.catalogNumber}` : null
                ].filter(Boolean).join(" ");

                // Secondary metadata: chart and description
                const secondaryMetadata = [
                  color.chart,
                  color.description
                ].filter(Boolean).join(" ");

                const metadata = [primaryMetadata, secondaryMetadata].filter(Boolean).join(" • ");

                const tooltipText = metadata
                  ? `Color ${idx + 1}: ${color.hex} - ${metadata}`
                  : `Color ${idx + 1}: ${color.hex}`;

                return (
                  <div
                    key={idx}
                    className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: color.hex }}
                    title={tooltipText}
                  />
                );
              })}
              {pesData.uniqueColors.length > 8 && (
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 leading-none">
                  +{pesData.uniqueColors.length - 8}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <input
          type="file"
          accept=".pes"
          onChange={handleFileChange}
          id="file-input"
          className="hidden"
          disabled={isLoading || patternUploaded || isUploading}
        />
        <label
          htmlFor={fileService.hasNativeDialogs() ? undefined : "file-input"}
          onClick={fileService.hasNativeDialogs() ? () => handleFileChange() : undefined}
          className={`flex-[2] flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 rounded font-semibold text-sm transition-all ${
            isLoading || patternUploaded || isUploading
              ? 'opacity-50 cursor-not-allowed bg-gray-400 dark:bg-gray-600 text-white'
              : 'cursor-pointer bg-gray-600 dark:bg-gray-700 text-white hover:bg-gray-700 dark:hover:bg-gray-600'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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

        {pesData && canUploadPattern(machineStatus) && !patternUploaded && uploadProgress < 100 && (
          <button
            onClick={handleUpload}
            disabled={!isConnected || isUploading || !boundsCheck.fits}
            className="flex-1 px-3 py-2.5 sm:py-2 bg-blue-600 dark:bg-blue-700 text-white rounded font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isUploading ? `Uploading pattern: ${uploadProgress.toFixed(0)}% complete` : boundsCheck.error || 'Upload pattern to machine'}
          >
            {isUploading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin inline mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {uploadProgress > 0 ? uploadProgress.toFixed(0) + '%' : 'Uploading'}
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-3.5 h-3.5 inline mr-1" />
                Upload
              </>
            )}
          </button>
        )}
      </div>

      {/* Pyodide initialization progress indicator - shown when initializing or waiting */}
      {!pyodideReady && pyodideProgress > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {isLoading && !pyodideReady
                ? 'Please wait - initializing Python environment...'
                : pyodideLoadingStep || 'Initializing Python environment...'}
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {pyodideProgress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden shadow-inner relative">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite] rounded-full"
              style={{ width: `${pyodideProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">
            {isLoading && !pyodideReady
              ? 'File dialog will open automatically when ready'
              : 'This only happens once on first use'}
          </p>
        </div>
      )}

      {/* Error/warning messages with smooth transition - placed after buttons */}
      <div className="transition-all duration-200 ease-in-out overflow-hidden" style={{
        maxHeight: (pesData && (boundsCheck.error || !canUploadPattern(machineStatus))) ? '200px' : '0px',
        marginTop: (pesData && (boundsCheck.error || !canUploadPattern(machineStatus))) ? '12px' : '0px'
      }}>
        {pesData && !canUploadPattern(machineStatus) && (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded border border-yellow-200 dark:border-yellow-800 text-sm">
            Cannot upload while {getMachineStateCategory(machineStatus)}
          </div>
        )}

        {pesData && boundsCheck.error && (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-3 py-2 rounded border border-red-200 dark:border-red-800 text-sm">
            <strong>Pattern too large:</strong> {boundsCheck.error}
          </div>
        )}
      </div>

      {isUploading && uploadProgress < 100 && (
        <div className="mt-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Uploading</span>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
              {uploadProgress > 0 ? uploadProgress.toFixed(1) + '%' : 'Starting...'}
            </span>
          </div>
          <div className="h-2.5 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden shadow-inner relative">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 dark:from-orange-600 dark:via-orange-700 dark:to-orange-800 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite] rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
