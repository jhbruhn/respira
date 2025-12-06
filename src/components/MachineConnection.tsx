import { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/solid';
import type { MachineInfo } from '../types/machine';
import { MachineStatus } from '../types/machine';
import { ConfirmDialog } from './ConfirmDialog';
import { shouldConfirmDisconnect, getStateVisualInfo } from '../utils/machineStateHelpers';
import { hasError, getErrorDetails } from '../utils/errorCodeHelpers';

interface MachineConnectionProps {
  isConnected: boolean;
  machineInfo: MachineInfo | null;
  machineStatus: MachineStatus;
  machineStatusName: string;
  machineError: number;
  isPolling: boolean;
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
  onConnect,
  onDisconnect,
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

  // Only show error info when connected AND there's an actual error
  const errorInfo = (isConnected && hasError(machineError)) ? getErrorDetails(machineError) : null;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-300">
        <h2 className="text-xl font-semibold">Machine Connection</h2>
        {isConnected && isPolling && (
          <span className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Auto-refreshing
          </span>
        )}
      </div>

      {!isConnected ? (
        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={onConnect} className="px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3] cursor-pointer">
            Connect to Machine
          </button>
        </div>
      ) : (
        <div>
          {/* Error/Info Display */}
          {errorInfo && (
            errorInfo.isInformational ? (
              // Informational messages (like initialization steps)
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-blue-900 text-sm">{errorInfo.title}</div>
                  </div>
                </div>
              </div>
            ) : (
              // Regular errors shown as errors
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 text-lg flex-shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-red-900 text-sm mb-1">{errorInfo.title}</div>
                    <div className="text-xs text-red-700 font-mono">
                      Error Code: 0x{machineError.toString(16).toUpperCase().padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Machine Status */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Status:</span>
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm ${statusBadgeColors[stateVisual.color as keyof typeof statusBadgeColors] || statusBadgeColors.info}`}>
                <span className="text-base leading-none">{stateVisual.icon}</span>
                <span>{machineStatusName}</span>
              </span>
            </div>
          </div>

          {/* Machine Info */}
          {machineInfo && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600">Model:</span>
                <span className="font-semibold text-gray-900">{machineInfo.modelNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600">Max Area:</span>
                <span className="font-semibold text-gray-900">
                  {(machineInfo.maxWidth / 10).toFixed(1)} × {(machineInfo.maxHeight / 10).toFixed(1)} mm
                </span>
              </div>
            </div>
          )}

          {/* Disconnect Button */}
          <div className="flex gap-3 mt-4">
            <button onClick={handleDisconnectClick} className="w-full px-6 py-3 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700 transition-all hover:shadow-md cursor-pointer">
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
