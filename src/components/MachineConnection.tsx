import { useState } from 'react';
import {
  InformationCircleIcon,
  CheckCircleIcon,
  BoltIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
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

  // Map icon names to Heroicons
  const stateIcons = {
    ready: CheckCircleIcon,
    active: BoltIcon,
    waiting: PauseCircleIcon,
    complete: CheckCircleIcon,
    interrupted: PauseCircleIcon,
    error: ExclamationTriangleIcon,
  };

  const statusBadgeColors = {
    idle: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700',
    info: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700',
    active: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    waiting: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
    complete: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700',
    interrupted: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700',
  };

  // Only show error info when connected AND there's an actual error
  const errorInfo = (isConnected && hasError(machineError)) ? getErrorDetails(machineError) : null;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-gray-300 dark:border-gray-600">
        <h2 className="text-xl font-semibold dark:text-white">Machine Connection</h2>
        <div className="flex items-center gap-3">
          {isConnected && isPolling && (
            <span className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" title="Auto-refreshing" aria-label="Auto-refreshing machine status"></span>
          )}
          {isConnected && (
            <button
              onClick={handleDisconnectClick}
              className="px-3 py-1.5 bg-gray-600 dark:bg-gray-700 text-white rounded-lg font-semibold text-xs hover:bg-gray-700 dark:hover:bg-gray-600 active:bg-gray-800 dark:active:bg-gray-500 hover:shadow-md active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              aria-label="Disconnect from embroidery machine"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {!isConnected ? (
        <div className="flex gap-3 mt-4 flex-wrap">
          <button
            onClick={onConnect}
            className="px-6 py-2.5 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            aria-label="Connect to embroidery machine"
          >
            Connect to Machine
          </button>
        </div>
      ) : (
        <div>
          {/* Error/Info Display */}
          {errorInfo && (
            errorInfo.isInformational ? (
              // Informational messages (like initialization steps)
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-blue-900 dark:text-blue-200 text-sm">{errorInfo.title}</div>
                  </div>
                </div>
              </div>
            ) : (
              // Regular errors shown as errors
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 text-lg flex-shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-red-900 dark:text-red-200 text-sm mb-1">{errorInfo.title}</div>
                    <div className="text-xs text-red-700 dark:text-red-300 font-mono">
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
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm ${statusBadgeColors[stateVisual.color as keyof typeof statusBadgeColors] || statusBadgeColors.info}`}>
                {(() => {
                  const Icon = stateIcons[stateVisual.iconName];
                  return <Icon className="w-4 h-4" />;
                })()}
                <span>{machineStatusName}</span>
              </span>
            </div>
          </div>

          {/* Machine Info */}
          {machineInfo && (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">Serial Number:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{machineInfo.serialNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">Max Area:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {(machineInfo.maxWidth / 10).toFixed(1)} × {(machineInfo.maxHeight / 10).toFixed(1)} mm
                </span>
              </div>
              {machineInfo.totalCount !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600 dark:text-gray-400">Total Stitches:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {machineInfo.totalCount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
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
