import { useState, useCallback } from 'react';
import { convertPesToPen, type PesPatternData } from '../utils/pystitchConverter';
import { MachineStatus } from '../types/machine';
import { canUploadPattern, getMachineStateCategory } from '../utils/machineStateHelpers';
import { PatternInfoSkeleton } from './SkeletonLoader';
import { ArrowUpTrayIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

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

  // Use prop pesData if available (from cached pattern), otherwise use local state
  const pesData = pesDataProp || localPesData;
  // Use currentFileName from App state, or local fileName, or resumeFileName for display
  const displayFileName = currentFileName || fileName || resumeFileName || '';
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!pyodideReady) {
        alert('Python environment is still loading. Please wait...');
        return;
      }

      setIsLoading(true);
      try {
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
    [onPatternLoaded, pyodideReady]
  );

  const handleUpload = useCallback(() => {
    if (pesData && displayFileName) {
      onUpload(pesData.penData, pesData, displayFileName, patternOffset);
    }
  }, [pesData, displayFileName, onUpload, patternOffset]);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600 dark:text-white">Pattern File</h2>

      <div>
        {resumeAvailable && resumeFileName && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 rounded mb-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Loaded cached pattern:</strong> "{resumeFileName}"
            </p>
          </div>
        )}

        {patternUploaded && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 rounded mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Pattern uploaded successfully!</strong> The pattern is now locked and cannot be changed.
              To upload a different pattern, you must first complete or delete the current one.
            </p>
          </div>
        )}

        <input
          type="file"
          accept=".pes"
          onChange={handleFileChange}
          id="file-input"
          className="hidden"
          disabled={!pyodideReady || isLoading || patternUploaded}
        />
        <label
          htmlFor="file-input"
          className={`inline-flex items-center gap-2 px-6 py-3 bg-gray-600 dark:bg-gray-700 text-white rounded-lg font-semibold text-sm transition-all ${
            !pyodideReady || isLoading || patternUploaded
              ? 'opacity-50 cursor-not-allowed grayscale-[0.3]'
              : 'cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-600 hover:shadow-lg active:scale-[0.98]'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading Pattern...</span>
            </>
          ) : !pyodideReady ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Initializing...</span>
            </>
          ) : patternUploaded ? (
            <>
              <CheckCircleIcon className="w-5 h-5" />
              <span>Pattern Locked</span>
            </>
          ) : (
            <span>Choose PES File</span>
          )}
        </label>

        {isLoading && <PatternInfoSkeleton />}

        {!isLoading && pesData && (
          <div className="mt-4 animate-fadeIn">
            <h3 className="text-base font-semibold my-4 dark:text-white">Pattern Information</h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 p-4 rounded-lg space-y-3 border border-gray-200 dark:border-gray-600 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">File Name:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-right max-w-[200px] truncate" title={displayFileName}>
                  {displayFileName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">Pattern Size:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
                  {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">Thread Colors:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{pesData.colorCount}</span>
                  <div className="flex gap-1">
                    {pesData.threads.slice(0, 5).map((thread, idx) => (
                      <div
                        key={idx}
                        className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                        style={{ backgroundColor: thread.hex }}
                        title={`Thread ${idx + 1}: ${thread.hex}`}
                      />
                    ))}
                    {pesData.colorCount > 5 && (
                      <div className="w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600 border border-gray-400 dark:border-gray-500 flex items-center justify-center text-[8px] font-bold text-gray-600 dark:text-gray-300">
                        +{pesData.colorCount - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700 dark:text-gray-300">Total Stitches:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{pesData.stitchCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {pesData && canUploadPattern(machineStatus) && !patternUploaded && uploadProgress < 100 && (
          <button
            onClick={handleUpload}
            disabled={!isConnected || isUploading}
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-none disabled:active:scale-100"
            aria-label={isUploading ? `Uploading pattern: ${uploadProgress.toFixed(0)}% complete` : 'Upload pattern to machine'}
          >
            {isUploading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Uploading... {uploadProgress > 0 ? uploadProgress.toFixed(0) + '%' : ''}</span>
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-5 h-5" />
                <span>Upload to Machine</span>
              </>
            )}
          </button>
        )}

        {pesData && !canUploadPattern(machineStatus) && (
          <div className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded-lg border border-yellow-200 dark:border-yellow-800 my-4 font-medium animate-fadeIn">
            Cannot upload pattern while machine is {getMachineStateCategory(machineStatus)}
          </div>
        )}

        {isUploading && uploadProgress < 100 && (
          <div className="mt-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading to Machine</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{uploadProgress > 0 ? uploadProgress.toFixed(1) + '%' : 'Starting...'}</span>
            </div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden shadow-inner relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite] rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">Please wait while your pattern is being transferred...</p>
          </div>
        )}
      </div>
    </div>
  );
}
