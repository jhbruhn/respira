import { useState, useCallback } from 'react';
import { convertPesToPen, type PesPatternData } from '../utils/pystitchConverter';
import { MachineStatus } from '../types/machine';
import { canUploadPattern, getMachineStateCategory } from '../utils/machineStateHelpers';
import { PatternInfoSkeleton } from './SkeletonLoader';
import { ArrowUpTrayIcon, CheckCircleIcon, DocumentTextIcon, FolderOpenIcon } from '@heroicons/react/24/solid';
import { createFileService } from '../platform';
import type { IFileService } from '../platform/interfaces/IFileService';

interface FileUploadProps {
  isConnected: boolean;
  machineStatus: MachineStatus;
  uploadProgress: number;
  onPatternLoaded: (pesData: PesPatternData, fileName: string) => void;
  onUpload: (penData: Uint8Array, pesData: PesPatternData, fileName: string, patternOffset?: { x: number; y: number }) => void;
  pyodideReady: boolean;
  patternOffset: { x: number; y: number };
  patternUploaded: boolean;
  resumeAvailable: boolean;
  resumeFileName: string | null;
  pesData: PesPatternData | null;
  currentFileName: string;
  isUploading?: boolean;
}

export function FileUpload({
  isConnected,
  machineStatus,
  uploadProgress,
  onPatternLoaded,
  onUpload,
  pyodideReady,
  patternOffset,
  patternUploaded,
  resumeAvailable,
  resumeFileName,
  pesData: pesDataProp,
  currentFileName,
  isUploading = false,
}: FileUploadProps) {
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
      if (!pyodideReady) {
        alert('Python environment is still loading. Please wait...');
        return;
      }

      setIsLoading(true);
      try {
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
        onPatternLoaded(data, file.name);
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
    [fileService, onPatternLoaded, pyodideReady]
  );

  const handleUpload = useCallback(() => {
    if (pesData && displayFileName) {
      onUpload(pesData.penData, pesData, displayFileName, patternOffset);
    }
  }, [pesData, displayFileName, onUpload, patternOffset]);

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
          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
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
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-400">Colors:</span>
            <div className="flex gap-1">
              {pesData.threads.slice(0, 8).map((thread, idx) => (
                <div
                  key={idx}
                  className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: thread.hex }}
                  title={`Thread ${idx + 1}: ${thread.hex}`}
                />
              ))}
              {pesData.colorCount > 8 && (
                <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 flex items-center justify-center text-[7px] font-bold text-gray-600 dark:text-gray-300">
                  +{pesData.colorCount - 8}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pesData && !canUploadPattern(machineStatus) && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded border border-yellow-200 dark:border-yellow-800 mb-3 text-xs">
          Cannot upload while {getMachineStateCategory(machineStatus)}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="file"
          accept=".pes"
          onChange={handleFileChange}
          id="file-input"
          className="hidden"
          disabled={!pyodideReady || isLoading || patternUploaded || isUploading}
        />
        <label
          htmlFor={fileService.hasNativeDialogs() ? undefined : "file-input"}
          onClick={fileService.hasNativeDialogs() ? () => handleFileChange() : undefined}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded font-semibold text-xs transition-all ${
            !pyodideReady || isLoading || patternUploaded || isUploading
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
          ) : !pyodideReady ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Initializing...</span>
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
            disabled={!isConnected || isUploading}
            className="px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded font-semibold text-xs hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isUploading ? `Uploading pattern: ${uploadProgress.toFixed(0)}% complete` : 'Upload pattern to machine'}
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
