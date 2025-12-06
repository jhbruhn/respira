import { useState, useCallback } from 'react';
import { convertPesToPen, type PesPatternData } from '../utils/pystitchConverter';
import { MachineStatus } from '../types/machine';
import { canUploadPattern, getMachineStateCategory } from '../utils/machineStateHelpers';

interface FileUploadProps {
  isConnected: boolean;
  machineStatus: MachineStatus;
  uploadProgress: number;
  onPatternLoaded: (pesData: PesPatternData) => void;
  onUpload: (penData: Uint8Array, pesData: PesPatternData, fileName: string, patternOffset?: { x: number; y: number }) => void;
  pyodideReady: boolean;
  patternOffset: { x: number; y: number };
  patternUploaded: boolean;
  resumeAvailable: boolean;
  resumeFileName: string | null;
  pesData: PesPatternData | null;
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
}: FileUploadProps) {
  const [localPesData, setLocalPesData] = useState<PesPatternData | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Use prop pesData if available (from cached pattern), otherwise use local state
  const pesData = pesDataProp || localPesData;
  const displayFileName = resumeFileName || fileName;
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
        onPatternLoaded(data);
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
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300">Pattern File</h2>

      <div>
        {resumeAvailable && resumeFileName && (
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded mb-4">
            <p className="text-sm text-green-800">
              <strong>Loaded cached pattern:</strong> "{resumeFileName}"
            </p>
          </div>
        )}

        {patternUploaded && (
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded mb-4">
            <p className="text-sm text-blue-800">
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
        <label htmlFor="file-input" className={`inline-block px-6 py-3 bg-gray-600 text-white rounded font-semibold text-sm transition-all ${!pyodideReady || isLoading || patternUploaded ? 'opacity-50 cursor-not-allowed grayscale-[0.3]' : 'cursor-pointer hover:bg-gray-700 hover:shadow-md'}`}>
          {isLoading ? 'Loading...' : !pyodideReady ? 'Initializing...' : patternUploaded ? 'Pattern Locked' : 'Choose PES File'}
        </label>

        {pesData && (
          <div className="mt-4">
            <h3 className="text-base font-semibold my-4">Pattern Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">File Name:</span>
                <span className="font-semibold text-gray-900">{displayFileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Pattern Size:</span>
                <span className="font-semibold text-gray-900">
                  {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
                  {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Thread Colors:</span>
                <span className="font-semibold text-gray-900">{pesData.colorCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Total Stitches:</span>
                <span className="font-semibold text-gray-900">{pesData.stitchCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {pesData && canUploadPattern(machineStatus) && (
          <button
            onClick={handleUpload}
            disabled={!isConnected || uploadProgress > 0}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3] cursor-pointer"
          >
            {uploadProgress > 0
              ? `Uploading... ${uploadProgress.toFixed(0)}%`
              : 'Upload to Machine'}
          </button>
        )}

        {pesData && !canUploadPattern(machineStatus) && (
          <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded border border-yellow-200 my-4 font-medium">
            Cannot upload pattern while machine is {getMachineStateCategory(machineStatus)}
          </div>
        )}

        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="h-3 bg-gray-300 rounded-md overflow-hidden my-4 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-700 transition-all duration-300 ease-out relative overflow-hidden after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:animate-[shimmer_2s_infinite]"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
