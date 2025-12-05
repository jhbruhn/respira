import { useState, useEffect, useCallback } from 'react';
import { useBrotherMachine } from './hooks/useBrotherMachine';
import { MachineConnection } from './components/MachineConnection';
import { FileUpload } from './components/FileUpload';
import { PatternCanvas } from './components/PatternCanvas';
import { ProgressMonitor } from './components/ProgressMonitor';
import type { PesPatternData } from './utils/pystitchConverter';
import { pyodideLoader } from './utils/pyodideLoader';
import './App.css';

function App() {
  const machine = useBrotherMachine();
  const [pesData, setPesData] = useState<PesPatternData | null>(null);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [pyodideError, setPyodideError] = useState<string | null>(null);
  const [patternOffset, setPatternOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
      console.log('[App] Loading resumed pattern:', machine.resumeFileName);
      setPesData(machine.resumedPattern);
    }
  }, [machine.resumedPattern, pesData, machine.resumeFileName]);

  const handlePatternLoaded = useCallback((data: PesPatternData) => {
    setPesData(data);
    // Reset pattern offset when new pattern is loaded
    setPatternOffset({ x: 0, y: 0 });
  }, []);

  const handlePatternOffsetChange = useCallback((offsetX: number, offsetY: number) => {
    setPatternOffset({ x: offsetX, y: offsetY });
    console.log('[App] Pattern offset changed:', { x: offsetX, y: offsetY });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white px-8 py-6 border-b border-gray-300 shadow-md">
        <h1 className="text-3xl font-semibold mb-2">Brother Embroidery Machine Controller</h1>
        {machine.error && (
          <div className="bg-red-100 text-red-900 px-4 py-3 rounded border border-red-200 mt-4">{machine.error}</div>
        )}
        {pyodideError && (
          <div className="bg-red-100 text-red-900 px-4 py-3 rounded border border-red-200 mt-4">Python Error: {pyodideError}</div>
        )}
        {!pyodideReady && !pyodideError && (
          <div className="bg-blue-100 text-blue-900 px-4 py-3 rounded border border-blue-200 mt-4">Initializing Python environment...</div>
        )}
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 p-6 max-w-[1600px] w-full mx-auto">
        <div className="flex flex-col gap-6">
          <MachineConnection
            isConnected={machine.isConnected}
            machineInfo={machine.machineInfo}
            machineStatus={machine.machineStatus}
            machineStatusName={machine.machineStatusName}
            machineError={machine.machineError}
            isPolling={machine.isPolling}
            resumeAvailable={machine.resumeAvailable}
            resumeFileName={machine.resumeFileName}
            onConnect={machine.connect}
            onDisconnect={machine.disconnect}
            onRefresh={machine.refreshStatus}
          />

          <FileUpload
            isConnected={machine.isConnected}
            machineStatus={machine.machineStatus}
            uploadProgress={machine.uploadProgress}
            onPatternLoaded={handlePatternLoaded}
            onUpload={machine.uploadPattern}
            pyodideReady={pyodideReady}
            patternOffset={patternOffset}
          />

          <ProgressMonitor
            machineStatus={machine.machineStatus}
            patternInfo={machine.patternInfo}
            sewingProgress={machine.sewingProgress}
            pesData={pesData}
            onStartMaskTrace={machine.startMaskTrace}
            onStartSewing={machine.startSewing}
            onResumeSewing={machine.resumeSewing}
            onDeletePattern={machine.deletePattern}
          />
        </div>

        <div className="flex flex-col">
          <PatternCanvas
            pesData={pesData}
            sewingProgress={machine.sewingProgress}
            machineInfo={machine.machineInfo}
            onPatternOffsetChange={handlePatternOffsetChange}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
