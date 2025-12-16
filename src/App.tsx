import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMachineStore } from './stores/useMachineStore';
import { usePatternStore } from './stores/usePatternStore';
import { useUIStore } from './stores/useUIStore';
import { FileUpload } from './components/FileUpload';
import { PatternCanvas } from './components/PatternCanvas';
import { ProgressMonitor } from './components/ProgressMonitor';
import { WorkflowStepper } from './components/WorkflowStepper';
import { PatternSummaryCard } from './components/PatternSummaryCard';
import { BluetoothDevicePicker } from './components/BluetoothDevicePicker';
import { getErrorDetails } from './utils/errorCodeHelpers';
import { getStateVisualInfo } from './utils/machineStateHelpers';
import { CheckCircleIcon, BoltIcon, PauseCircleIcon, ExclamationTriangleIcon, ArrowPathIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { isBluetoothSupported } from './utils/bluetoothSupport';
import './App.css';

function App() {
  // Set page title with version
  useEffect(() => {
    document.title = `Respira v${__APP_VERSION__}`;
  }, []);
  // Machine store
  const {
    isConnected,
    machineInfo,
    machineStatus,
    machineStatusName,
    machineError,
    patternInfo,
    error: machineErrorMessage,
    isPairingError,
    isCommunicating: isPolling,
    resumeFileName,
    resumedPattern,
    connect,
    disconnect,
  } = useMachineStore(
    useShallow((state) => ({
      isConnected: state.isConnected,
      machineInfo: state.machineInfo,
      machineStatus: state.machineStatus,
      machineStatusName: state.machineStatusName,
      machineError: state.machineError,
      patternInfo: state.patternInfo,
      error: state.error,
      isPairingError: state.isPairingError,
      isCommunicating: state.isCommunicating,
      resumeFileName: state.resumeFileName,
      resumedPattern: state.resumedPattern,
      connect: state.connect,
      disconnect: state.disconnect,
    }))
  );

  // Pattern store
  const {
    pesData,
    patternUploaded,
    setPattern,
    setPatternOffset,
    setPatternUploaded,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      patternUploaded: state.patternUploaded,
      setPattern: state.setPattern,
      setPatternOffset: state.setPatternOffset,
      setPatternUploaded: state.setPatternUploaded,
    }))
  );

  // UI store
  const {
    pyodideError,
    showErrorPopover,
    initializePyodide,
    setErrorPopover,
  } = useUIStore(
    useShallow((state) => ({
      pyodideError: state.pyodideError,
      showErrorPopover: state.showErrorPopover,
      initializePyodide: state.initializePyodide,
      setErrorPopover: state.setErrorPopover,
    }))
  );

  const errorPopoverRef = useRef<HTMLDivElement>(null);
  const errorButtonRef = useRef<HTMLButtonElement>(null);

  // Initialize Pyodide in background on mount (non-blocking thanks to worker)
  useEffect(() => {
    initializePyodide();
  }, [initializePyodide]);

  // Close error popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        errorPopoverRef.current &&
        !errorPopoverRef.current.contains(event.target as Node) &&
        errorButtonRef.current &&
        !errorButtonRef.current.contains(event.target as Node)
      ) {
        setErrorPopover(false);
      }
    };

    if (showErrorPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showErrorPopover, setErrorPopover]);

  // Auto-load cached pattern when available
  if (resumedPattern && !pesData) {
    console.log('[App] Loading resumed pattern:', resumeFileName, 'Offset:', resumedPattern.patternOffset);
    setPattern(resumedPattern.pesData, resumeFileName || '');
    // Restore the cached pattern offset
    if (resumedPattern.patternOffset) {
      setPatternOffset(resumedPattern.patternOffset.x, resumedPattern.patternOffset.y);
    }
  }


  // Track pattern uploaded state based on machine status
  if (!isConnected) {
    if (patternUploaded) {
      setPatternUploaded(false);
    }
  } else {
    // Pattern is uploaded if machine has pattern info
    const shouldBeUploaded = patternInfo !== null;
    if (patternUploaded !== shouldBeUploaded) {
      setPatternUploaded(shouldBeUploaded);
    }
  }

  // Get state visual info for header status badge
  const stateVisual = getStateVisualInfo(machineStatus);
  const stateIcons = {
    ready: CheckCircleIcon,
    active: BoltIcon,
    waiting: PauseCircleIcon,
    complete: CheckCircleIcon,
    interrupted: PauseCircleIcon,
    error: ExclamationTriangleIcon,
  };
  const StatusIcon = stateIcons[stateVisual.iconName];

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 dark:from-blue-700 dark:via-blue-800 dark:to-blue-900 px-4 sm:px-6 lg:px-8 py-3 shadow-lg border-b-2 border-blue-900/20 dark:border-blue-800/30 flex-shrink-0">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 lg:gap-8 items-center">
          {/* Machine Connection Status - Responsive width column */}
          <div className="flex items-center gap-3 w-full lg:w-[280px]">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50" style={{ visibility: isConnected ? 'visible' : 'hidden' }}></div>
            <div className="w-2.5 h-2.5 bg-gray-400 rounded-full -ml-2.5" style={{ visibility: !isConnected ? 'visible' : 'hidden' }}></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg lg:text-xl font-bold text-white leading-tight">Respira</h1>
                {isConnected && machineInfo?.serialNumber && (
                  <span
                    className="text-xs text-blue-200 cursor-help"
                    title={`Serial: ${machineInfo.serialNumber}${
                      machineInfo.macAddress
                        ? `\nMAC: ${machineInfo.macAddress}`
                        : ''
                    }${
                      machineInfo.totalCount !== undefined
                        ? `\nTotal stitches: ${machineInfo.totalCount.toLocaleString()}`
                        : ''
                    }${
                      machineInfo.serviceCount !== undefined
                        ? `\nStitches since service: ${machineInfo.serviceCount.toLocaleString()}`
                        : ''
                    }`}
                  >
                    • {machineInfo.serialNumber}
                  </span>
                )}
                {isPolling && (
                  <ArrowPathIcon className="w-3.5 h-3.5 text-blue-200 animate-spin" title="Auto-refreshing status" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 min-h-[32px]">
                {isConnected ? (
                  <>
                    <button
                      onClick={disconnect}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded text-sm font-medium bg-white/10 hover:bg-red-600 text-blue-100 hover:text-white border border-white/20 hover:border-red-600 cursor-pointer transition-all flex-shrink-0"
                      title="Disconnect from machine"
                      aria-label="Disconnect from machine"
                    >
                      <XMarkIcon className="w-3 h-3" />
                      Disconnect
                    </button>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded text-sm font-semibold bg-white/20 text-white border border-white/30 flex-shrink-0">
                      <StatusIcon className="w-3 h-3" />
                      {machineStatusName}
                    </span>
                  </>
                ) : (
                  <p className="text-xs text-blue-200">Not Connected</p>
                )}

                {/* Error indicator - always render to prevent layout shift */}
                <div className="relative">
                  <button
                    ref={errorButtonRef}
                    onClick={() => setErrorPopover(!showErrorPopover)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:py-1 rounded text-sm font-medium bg-red-500/90 hover:bg-red-600 text-white border border-red-400 transition-all flex-shrink-0 ${
                      (machineErrorMessage || pyodideError)
                        ? 'cursor-pointer animate-pulse hover:animate-none'
                        : 'invisible pointer-events-none'
                    }`}
                    title="Click to view error details"
                    aria-label="View error details"
                    disabled={!(machineErrorMessage || pyodideError)}
                  >
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>
                      {(() => {
                        if (pyodideError) return 'Python Error';
                        if (isPairingError) return 'Pairing Required';

                        const errorMsg = machineErrorMessage || '';

                        // Categorize by error message content
                        if (errorMsg.toLowerCase().includes('bluetooth') || errorMsg.toLowerCase().includes('connection')) {
                          return 'Connection Error';
                        }
                        if (errorMsg.toLowerCase().includes('upload')) {
                          return 'Upload Error';
                        }
                        if (errorMsg.toLowerCase().includes('pattern')) {
                          return 'Pattern Error';
                        }
                        if (machineError !== undefined) {
                          return `Machine Error`;
                        }

                        // Default fallback
                        return 'Error';
                      })()}
                    </span>
                  </button>

                  {/* Error popover */}
                  {showErrorPopover && (machineErrorMessage || pyodideError) && (
              <div
                ref={errorPopoverRef}
                className="absolute top-full mt-2 left-0 w-[600px] z-50 animate-fadeIn"
                role="dialog"
                aria-label="Error details"
              >
                {(() => {
                  const errorDetails = getErrorDetails(machineError);
                  const isPairingErr = isPairingError;
                  const errorMsg = pyodideError || machineErrorMessage || '';
                  const isInfo = isPairingErr || errorDetails?.isInformational;

                  const bgColor = isInfo
                    ? 'bg-blue-50 dark:bg-blue-900/95 border-blue-600 dark:border-blue-500'
                    : 'bg-red-50 dark:bg-red-900/95 border-red-600 dark:border-red-500';

                  const iconColor = isInfo
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-red-600 dark:text-red-400';

                  const textColor = isInfo
                    ? 'text-blue-900 dark:text-blue-200'
                    : 'text-red-900 dark:text-red-200';

                  const descColor = isInfo
                    ? 'text-blue-800 dark:text-blue-300'
                    : 'text-red-800 dark:text-red-300';

                  const listColor = isInfo
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300';

                  const Icon = isInfo ? InformationCircleIcon : ExclamationTriangleIcon;
                  const title = errorDetails?.title || (isPairingErr ? 'Pairing Required' : 'Error');

                  return (
                    <div className={`${bgColor} border-l-4 p-4 rounded-lg shadow-xl backdrop-blur-sm`}>
                      <div className="flex items-start gap-3">
                        <Icon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1">
                          <h3 className={`text-base font-semibold ${textColor} mb-2`}>
                            {title}
                          </h3>
                          <p className={`text-sm ${descColor} mb-3`}>
                            {errorDetails?.description || errorMsg}
                          </p>
                          {errorDetails?.solutions && errorDetails.solutions.length > 0 && (
                            <>
                              <h4 className={`text-sm font-semibold ${textColor} mb-2`}>
                                {isInfo ? 'Steps:' : 'How to Fix:'}
                              </h4>
                              <ol className={`list-decimal list-inside text-sm ${listColor} space-y-1.5`}>
                                {errorDetails.solutions.map((solution, index) => (
                                  <li key={index} className="pl-2">{solution}</li>
                                ))}
                              </ol>
                            </>
                          )}
                          {machineError !== undefined && !errorDetails?.isInformational && (
                            <p className={`text-xs ${descColor} mt-3 font-mono`}>
                              Error Code: 0x{machineError.toString(16).toUpperCase().padStart(2, '0')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow Stepper - Flexible width column */}
          <div>
            <WorkflowStepper />
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-5 lg:p-6 w-full overflow-y-auto lg:overflow-hidden flex flex-col">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-4 md:gap-5 lg:gap-6 lg:overflow-hidden">
          {/* Left Column - Controls */}
          <div className="flex flex-col gap-4 md:gap-5 lg:gap-6 lg:overflow-hidden">
            {/* Connect Button or Browser Hint - Show when disconnected */}
            {!isConnected && (
              <>
                {isBluetoothSupported() ? (
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-gray-400 dark:border-gray-600">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-6 h-6 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Get Started</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Connect to your embroidery machine</p>
                      </div>
                    </div>
                    <button
                      onClick={connect}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 bg-blue-600 dark:bg-blue-700 text-white rounded font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 transition-colors cursor-pointer"
                    >
                      Connect to Machine
                    </button>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg shadow-md border-l-4 border-amber-500 dark:border-amber-600">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100 mb-2">Browser Not Supported</h3>
                        <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                          Your browser doesn't support Web Bluetooth, which is required to connect to your embroidery machine.
                        </p>
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Please try one of these options:</p>
                          <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1.5 ml-4 list-disc">
                            <li>Use a supported browser (Chrome, Edge, or Opera)</li>
                            <li>
                              Download the Desktop app from{' '}
                              <a
                                href="https://github.com/jhbruhn/respira/releases/latest"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-50 transition-colors"
                              >
                                GitHub Releases
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Pattern File - Show during upload stage (before pattern is uploaded) */}
            {isConnected && !patternUploaded && (
              <FileUpload />
            )}

            {/* Compact Pattern Summary - Show after upload (during sewing stages) */}
            {isConnected && patternUploaded && pesData && (
              <PatternSummaryCard />
            )}

            {/* Progress Monitor - Show when pattern is uploaded */}
            {isConnected && patternUploaded && (
              <div className="lg:flex-1 lg:min-h-0">
                <ProgressMonitor />
              </div>
            )}
          </div>

          {/* Right Column - Pattern Preview */}
          <div className="flex flex-col lg:overflow-hidden lg:h-full">
            {pesData ? (
              <PatternCanvas />
            ) : (
              <div className="lg:h-full bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-fadeIn flex flex-col">
                <h2 className="text-base lg:text-lg font-semibold mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600 dark:text-white flex-shrink-0">Pattern Preview</h2>
                <div className="h-[400px] sm:h-[500px] lg:flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 relative overflow-hidden">
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
                    <h3 className="text-gray-700 dark:text-gray-200 text-base lg:text-lg font-semibold mb-2">No Pattern Loaded</h3>
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
          </div>
        </div>

        {/* Bluetooth Device Picker (Electron only) */}
        <BluetoothDevicePicker />
      </div>
    </div>
  );
}

export default App;
