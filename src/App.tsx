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
    }
  }, [machine.resumedPattern, pesData, machine.resumeFileName]);

  const handlePatternLoaded = useCallback((data: PesPatternData) => {
    setPesData(data);
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
    setPesData(null);
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-3 shadow-lg">
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
          <div className="bg-red-100 text-red-900 px-6 py-4 rounded-lg border-l-4 border-red-600 mb-6 shadow-md">
            <strong>Error:</strong> {machine.error}
          </div>
        )}
        {pyodideError && (
          <div className="bg-red-100 text-red-900 px-6 py-4 rounded-lg border-l-4 border-red-600 mb-6 shadow-md">
            <strong>Python Error:</strong> {pyodideError}
          </div>
        )}
        {!pyodideReady && !pyodideError && (
          <div className="bg-blue-100 text-blue-900 px-6 py-4 rounded-lg border-l-4 border-blue-600 mb-6 shadow-md">
            Initializing Python environment...
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
              />
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300">Pattern Preview</h2>
                <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-center">
                    <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600 text-lg mb-2">No Pattern Loaded</p>
                    <p className="text-gray-500 text-sm">Connect to your machine and choose a PES file to begin</p>
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
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
