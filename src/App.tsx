import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMachineStore } from './stores/useMachineStore';
import { usePatternStore } from './stores/usePatternStore';
import { useUIStore } from './stores/useUIStore';
import { AppHeader } from './components/AppHeader';
import { LeftSidebar } from './components/LeftSidebar';
import { PatternCanvas } from './components/PatternCanvas';
import { PatternPreviewPlaceholder } from './components/PatternPreviewPlaceholder';
import { BluetoothDevicePicker } from './components/BluetoothDevicePicker';
import './App.css';

function App() {
  // Set page title with version
  useEffect(() => {
    document.title = `Respira v${__APP_VERSION__}`;
  }, []);

  // Machine store - for auto-loading cached pattern
  const {
    resumedPattern,
    resumeFileName,
  } = useMachineStore(
    useShallow((state) => ({
      resumedPattern: state.resumedPattern,
      resumeFileName: state.resumeFileName,
    }))
  );

  // Pattern store - for auto-loading cached pattern
  const {
    pesData,
    setPattern,
    setPatternOffset,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      setPattern: state.setPattern,
      setPatternOffset: state.setPatternOffset,
    }))
  );

  // UI store - for Pyodide initialization
  const {
    initializePyodide,
  } = useUIStore(
    useShallow((state) => ({
      initializePyodide: state.initializePyodide,
    }))
  );

  // Initialize Pyodide in background on mount (non-blocking thanks to worker)
  useEffect(() => {
    initializePyodide();
  }, [initializePyodide]);

  // Auto-load cached pattern when available
  useEffect(() => {
    if (resumedPattern && !pesData) {
      console.log('[App] Loading resumed pattern:', resumeFileName, 'Offset:', resumedPattern.patternOffset);
      setPattern(resumedPattern.pesData, resumeFileName || '');
      // Restore the cached pattern offset
      if (resumedPattern.patternOffset) {
        setPatternOffset(resumedPattern.patternOffset.x, resumedPattern.patternOffset.y);
      }
    }
  }, [resumedPattern, resumeFileName, pesData, setPattern, setPatternOffset]);

  return (
    <div className="h-screen flex flex-col bg-gray-300 dark:bg-gray-900 overflow-hidden">
      <AppHeader />

      <div className="flex-1 p-4 sm:p-5 lg:p-6 w-full overflow-y-auto lg:overflow-hidden flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-4 md:gap-5 lg:gap-6 lg:overflow-hidden">
          {/* Left Column - Controls */}
          <LeftSidebar />

          {/* Right Column - Pattern Preview */}
          <div className="flex flex-col lg:overflow-hidden lg:h-full">
            {pesData ? <PatternCanvas /> : <PatternPreviewPlaceholder />}
          </div>
        </div>

        {/* Bluetooth Device Picker (Electron only) */}
        <BluetoothDevicePicker />
      </div>
    </div>
  );
}

export default App;
