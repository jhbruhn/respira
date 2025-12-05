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
}

export function FileUpload({
  isConnected,
  machineStatus,
  uploadProgress,
  onPatternLoaded,
  onUpload,
  pyodideReady,
  patternOffset,
}: FileUploadProps) {
  const [pesData, setPesData] = useState<PesPatternData | null>(null);
  const [fileName, setFileName] = useState<string>('');
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
        setPesData(data);
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
    if (pesData && fileName) {
      onUpload(pesData.penData, pesData, fileName, patternOffset);
    }
  }, [pesData, fileName, onUpload, patternOffset]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300">Pattern File</h2>

      <div>
        <input
          type="file"
          accept=".pes"
          onChange={handleFileChange}
          id="file-input"
          className="hidden"
          disabled={!pyodideReady || isLoading}
        />
        <label htmlFor="file-input" className={`inline-block px-6 py-3 bg-gray-600 text-white rounded font-semibold text-sm cursor-pointer transition-all ${!pyodideReady || isLoading ? 'opacity-50 cursor-not-allowed grayscale-[0.3]' : 'hover:bg-gray-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}`}>
          {isLoading ? 'Loading...' : !pyodideReady ? 'Initializing...' : 'Choose PES File'}
        </label>

        {pesData && (
          <div className="mt-4">
            <h3 className="text-base font-semibold my-4">Pattern Details</h3>
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="font-medium text-gray-600">Total Stitches:</span>
              <span className="font-semibold">{pesData.stitchCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="font-medium text-gray-600">Colors:</span>
              <span className="font-semibold">{pesData.colorCount}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-300">
              <span className="font-medium text-gray-600">Size:</span>
              <span className="font-semibold">
                {((pesData.bounds.maxX - pesData.bounds.minX) / 10).toFixed(1)} x{' '}
                {((pesData.bounds.maxY - pesData.bounds.minY) / 10).toFixed(1)} mm
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-medium text-gray-600">Bounds:</span>
              <span className="font-semibold">
                ({pesData.bounds.minX}, {pesData.bounds.minY}) to (
                {pesData.bounds.maxX}, {pesData.bounds.maxY})
              </span>
            </div>
          </div>
        )}

        {pesData && canUploadPattern(machineStatus) && (
          <button
            onClick={handleUpload}
            disabled={!isConnected || uploadProgress > 0}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]"
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
