import { useState } from 'react';
import type { MachineInfo } from '../types/machine';
import { MachineStatus } from '../types/machine';
import { ConfirmDialog } from './ConfirmDialog';
import { shouldConfirmDisconnect, getStateVisualInfo } from '../utils/machineStateHelpers';
import { hasError, getErrorMessage } from '../utils/errorCodeHelpers';

interface MachineConnectionProps {
  isConnected: boolean;
  machineInfo: MachineInfo | null;
  machineStatus: MachineStatus;
  machineStatusName: string;
  machineError: number;
  isPolling: boolean;
  resumeAvailable: boolean;
  resumeFileName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}

export function MachineConnection({
  isConnected,
  machineInfo,
  machineStatus,
  machineStatusName,
  machineError,
  isPolling,
  resumeAvailable,
  resumeFileName,
  onConnect,
  onDisconnect,
  onRefresh,
}: MachineConnectionProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const handleDisconnectClick = () => {
    if (shouldConfirmDisconnect(machineStatus)) {
      setShowDisconnectConfirm(true);
    } else {
      onDisconnect();
    }
  };

  const handleConfirmDisconnect = () => {
    setShowDisconnectConfirm(false);
    onDisconnect();
  };

  const stateVisual = getStateVisualInfo(machineStatus);

  const statusBadgeColors = {
    idle: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    info: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    active: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    waiting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    complete: 'bg-green-100 text-green-800 border-green-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    interrupted: 'bg-red-100 text-red-800 border-red-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-gray-300">Machine Connection</h2>

      {!isConnected ? (
        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={onConnect} className="px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
            Connect to Machine
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-100 rounded">
            <span className={`flex items-center gap-2 px-4 py-2 rounded font-semibold text-sm border ${statusBadgeColors[stateVisual.color as keyof typeof statusBadgeColors] || statusBadgeColors.info}`}>
              <span className="text-lg leading-none">{stateVisual.icon}</span>
              <span className="uppercase tracking-wide">{machineStatusName}</span>
            </span>
            {isPolling && (
              <span className="text-blue-600 text-xs animate-pulse" title="Polling machine status">●</span>
            )}
            {hasError(machineError) && (
              <span className="bg-red-100 text-red-900 px-4 py-2 rounded font-semibold text-sm">{getErrorMessage(machineError)}</span>
            )}
          </div>

          {machineInfo && (
            <div>
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="font-medium text-gray-600">Model:</span>
                <span className="font-semibold">{machineInfo.modelNumber}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="font-medium text-gray-600">Serial:</span>
                <span className="font-semibold">{machineInfo.serialNumber}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="font-medium text-gray-600">Software:</span>
                <span className="font-semibold">{machineInfo.softwareVersion}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-300">
                <span className="font-medium text-gray-600">Max Area:</span>
                <span className="font-semibold">
                  {(machineInfo.maxWidth / 10).toFixed(1)} x{' '}
                  {(machineInfo.maxHeight / 10).toFixed(1)} mm
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-medium text-gray-600">MAC:</span>
                <span className="font-semibold">{machineInfo.macAddress}</span>
              </div>
            </div>
          )}

          {resumeAvailable && resumeFileName && (
            <div className="bg-green-100 text-green-800 px-4 py-3 rounded border border-green-200 my-4 font-medium">
              Loaded cached pattern: "{resumeFileName}"
            </div>
          )}

          <div className="flex gap-3 mt-4 flex-wrap">
            <button onClick={onRefresh} className="px-6 py-3 bg-gray-600 text-white rounded font-semibold text-sm hover:bg-gray-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
              Refresh Status
            </button>
            <button onClick={handleDisconnectClick} className="px-6 py-3 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]">
              Disconnect
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        title="Confirm Disconnect"
        message={`The machine is currently ${machineStatusName.toLowerCase()}. Disconnecting may interrupt the operation. Are you sure you want to disconnect?`}
        confirmText="Disconnect Anyway"
        cancelText="Cancel"
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
