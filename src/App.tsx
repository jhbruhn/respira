import { useState, useEffect, useCallback } from 'react';
import { useBrotherMachine } from './hooks/useBrotherMachine';
import { MachineConnection } from './components/MachineConnection';
import { FileUpload } from './components/FileUpload';
import { PatternCanvas } from './components/PatternCanvas';
import { ProgressMonitor } from './components/ProgressMonitor';
import { WorkflowStepper } from './components/WorkflowStepper';
import { NextStepGuide } from './components/NextStepGuide';
import type { PesPatternData } from './utils/pystitchConverter';
import { pyodideLoader } from './utils/pyodideLoader';
import { MachineStatus } from './types/machine';
import { hasError } from './utils/errorCodeHelpers';
import './App.css';

function App() {
  const machine = useBrotherMachine();
  const [pesData, setPesData] = useState<PesPatternData | null>(null);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);
  const [patternOffset, setPatternOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [patternUploaded, setPatternUploaded] = useState(false);
  const [currentFileName, setCurrentFileName] = useState<string>(''); // Track current pattern filename

  // Initialize Pyodide on mount
  useEffect(() => {
    pyodideLoader
      .initialize()
      .then(() => {
        setPyodideReady(true);
        console.log('[App] Pyodide initialized successfully');
      })
      .catch((err) => {
        setPyodideError(err instanceof Error ? err.message : 'Failed to initialize Python environment');
        console.error('[App] Failed to initialize Pyodide:', err);
      });
  }, []);

  // Auto-load cached pattern when available
  useEffect(() => {
    if (machine.resumedPattern && !pesData) {
      console.log('[App] Loading resumed pattern:', machine.resumeFileName, 'Offset:', machine.resumedPattern.patternOffset);
      setPesData(machine.resumedPattern.pesData);
      // Restore the cached pattern offset
      if (machine.resumedPattern.patternOffset) {
        setPatternOffset(machine.resumedPattern.patternOffset);
      }
      // Preserve the filename from cache
      if (machine.resumeFileName) {
        setCurrentFileName(machine.resumeFileName);
      }
    }
  }, [machine.resumedPattern, pesData, machine.resumeFileName]);

  const handlePatternLoaded = useCallback((data: PesPatternData, fileName: string) => {
    setPesData(data);
    setCurrentFileName(fileName);
    // Reset pattern offset when new pattern is loaded
    setPatternOffset({ x: 0, y: 0 });
    setPatternUploaded(false);
  }, []);

  const handlePatternOffsetChange = useCallback((offsetX: number, offsetY: number) => {
    setPatternOffset({ x: offsetX, y: offsetY });
    console.log('[App] Pattern offset changed:', { x: offsetX, y: offsetY });
  }, []);

  const handleUpload = useCallback(async (penData: Uint8Array, pesData: PesPatternData, fileName: string, patternOffset?: { x: number; y: number }) => {
    await machine.uploadPattern(penData, pesData, fileName, patternOffset);
    setPatternUploaded(true);
  }, [machine]);

  const handleDeletePattern = useCallback(async () => {
    await machine.deletePattern();
    setPatternUploaded(false);
    // NOTE: We intentionally DON'T clear setPesData(null) here
    // so the pattern remains visible in the canvas for re-editing and re-uploading
  }, [machine]);

  // Track pattern uploaded state based on machine status
  useEffect(() => {
    if (!machine.isConnected) {
      setPatternUploaded(false);
      return;
    }

    // Pattern is uploaded if machine has pattern info
    if (machine.patternInfo !== null) {
      setPatternUploaded(true);
    } else {
      // No pattern info means no pattern on machine
      setPatternUploaded(false);
    }
  }, [machine.machineStatus, machine.patternInfo, machine.isConnected]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-blue-700 dark:via-blue-800 dark:to-blue-900 px-8 py-3 shadow-lg border-b-2 border-blue-900/20 dark:border-blue-800/30">
        <div className="max-w-[1600px] mx-auto flex items-center gap-8">
          <h1 className="text-xl font-bold text-white whitespace-nowrap">SKiTCH Controller</h1>

          {/* Workflow Stepper - Integrated in header when connected */}
          {machine.isConnected && (
            <div className="flex-1">
              <WorkflowStepper
                machineStatus={machine.machineStatus}
                isConnected={machine.isConnected}
                hasPattern={pesData !== null}
                patternUploaded={patternUploaded}
              />
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 p-6 max-w-[1600px] w-full mx-auto">
        {/* Global errors */}
        {machine.error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 px-6 py-4 rounded-lg border-l-4 border-red-600 dark:border-red-500 mb-6 shadow-md hover:shadow-lg transition-shadow animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <strong className="font-semibold">Error:</strong> {machine.error}
              </div>
            </div>
          </div>
        )}
        {pyodideError && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 px-6 py-4 rounded-lg border-l-4 border-red-600 dark:border-red-500 mb-6 shadow-md hover:shadow-lg transition-shadow animate-fadeIn">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <strong className="font-semibold">Python Error:</strong> {pyodideError}
              </div>
            </div>
          </div>
        )}
        {!pyodideReady && !pyodideError && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 px-6 py-4 rounded-lg border-l-4 border-blue-600 dark:border-blue-500 mb-6 shadow-md animate-fadeIn">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-medium">Initializing Python environment...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
          {/* Left Column - Controls */}
          <div className="flex flex-col gap-6">
            {/* Next Step Guide - Always visible */}
            <NextStepGuide
              machineStatus={machine.machineStatus}
              isConnected={machine.isConnected}
              hasPattern={pesData !== null}
              patternUploaded={patternUploaded}
              hasError={hasError(machine.machineError)}
              errorMessage={machine.error || undefined}
              errorCode={machine.machineError}
            />

            {/* Machine Connection - Always visible */}
            <MachineConnection
              isConnected={machine.isConnected}
              machineInfo={machine.machineInfo}
              machineStatus={machine.machineStatus}
              machineStatusName={machine.machineStatusName}
              machineError={machine.machineError}
              isPolling={machine.isPolling}
              onConnect={machine.connect}
              onDisconnect={machine.disconnect}
              onRefresh={machine.refreshStatus}
            />

            {/* Pattern File - Only show when connected */}
            {machine.isConnected && (
              <FileUpload
                isConnected={machine.isConnected}
                machineStatus={machine.machineStatus}
                uploadProgress={machine.uploadProgress}
                onPatternLoaded={handlePatternLoaded}
                onUpload={handleUpload}
                pyodideReady={pyodideReady}
                patternOffset={patternOffset}
                patternUploaded={patternUploaded}
                resumeAvailable={machine.resumeAvailable}
                resumeFileName={machine.resumeFileName}
                pesData={pesData}
                currentFileName={currentFileName}
                isUploading={machine.isUploading}
              />
            )}
          </div>

          {/* Right Column - Pattern Preview */}
          <div className="flex flex-col gap-6">
            {pesData ? (
              <PatternCanvas
                pesData={pesData}
                sewingProgress={machine.sewingProgress}
                machineInfo={machine.machineInfo}
                initialPatternOffset={patternOffset}
                onPatternOffsetChange={handlePatternOffsetChange}
                patternUploaded={patternUploaded}
                isUploading={machine.uploadProgress > 0 && machine.uploadProgress < 100}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-fadeIn">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600 dark:text-white">Pattern Preview</h2>
                <div className="flex items-center justify-center h-[600px] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 relative overflow-hidden">
                  {/* Decorative background pattern */}
                  <div className="absolute inset-0 opacity-5 dark:opacity-10">
                    <div className="absolute top-10 left-10 w-32 h-32 border-4 border-gray-400 dark:border-gray-500 rounded-full"></div>
                    <div className="absolute bottom-10 right-10 w-40 h-40 border-4 border-gray-400 dark:border-gray-500 rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-gray-400 dark:border-gray-500 rounded-full"></div>
                  </div>

                  <div className="text-center relative z-10">
                    <div className="relative inline-block mb-6">
                      <svg className="w-28 h-28 mx-auto text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-gray-700 dark:text-gray-200 text-xl font-semibold mb-2">No Pattern Loaded</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 max-w-sm mx-auto">
                      Connect to your machine and choose a PES embroidery file to see your design preview
                    </p>
                    <div className="flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-500">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full"></div>
                        <span>Drag to Position</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 dark:bg-green-500 rounded-full"></div>
                        <span>Zoom & Pan</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-purple-400 dark:bg-purple-500 rounded-full"></div>
                        <span>Real-time Preview</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Monitor - Wide section below pattern preview */}
            {machine.isConnected && patternUploaded && (
              <ProgressMonitor
                machineStatus={machine.machineStatus}
                patternInfo={machine.patternInfo}
                sewingProgress={machine.sewingProgress}
                pesData={pesData}
                onStartMaskTrace={machine.startMaskTrace}
                onStartSewing={machine.startSewing}
                onResumeSewing={machine.resumeSewing}
                onDeletePattern={handleDeletePattern}
                isDeleting={machine.isDeleting}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
