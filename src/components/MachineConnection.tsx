import { useState } from 'react';
import {
  InformationCircleIcon,
  CheckCircleIcon,
  BoltIcon,
  PauseCircleIcon,
  ExclamationTriangleIcon,
  WifiIcon,
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
    idle: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
    info: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
    active: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    waiting: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    complete: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    interrupted: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  };

  // Only show error info when connected AND there's an actual error
  const errorInfo = (isConnected && hasError(machineError)) ? getErrorDetails(machineError) : null;

  return (
    <>
      {!isConnected ? (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-gray-400 dark:border-gray-600">
          <div className="flex items-start gap-3 mb-3">
            <WifiIcon className="w-6 h-6 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Machine</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Ready to connect</p>
            </div>
          </div>

          <button
            onClick={onConnect}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded font-semibold text-xs hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-500 transition-colors cursor-pointer"
          >
            Connect to Machine
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-green-600 dark:border-green-500">
          <div className="flex items-start gap-3 mb-3">
            <WifiIcon className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Machine Info</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {machineInfo?.modelNumber || 'Brother Embroidery Machine'}
              </p>
            </div>
          </div>

          {/* Error/Info Display */}
          {errorInfo && (
            errorInfo.isInformational ? (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <InformationCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-blue-900 dark:text-blue-200 text-xs">{errorInfo.title}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-600 dark:text-red-400 flex-shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-red-900 dark:text-red-200 text-xs mb-1">{errorInfo.title}</div>
                    <div className="text-[10px] text-red-700 dark:text-red-300 font-mono">
                      Error Code: 0x{machineError.toString(16).toUpperCase().padStart(2, '0')}
                    </div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Status Badge */}
          <div className="mb-3">
            <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Status:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs ${statusBadgeColors[stateVisual.color as keyof typeof statusBadgeColors] || statusBadgeColors.info}`}>
              {(() => {
                const Icon = stateIcons[stateVisual.iconName];
                return <Icon className="w-3.5 h-3.5" />;
              })()}
              <span>{machineStatusName}</span>
            </span>
          </div>

          {/* Machine Info */}
          {machineInfo && (
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                <span className="text-gray-600 dark:text-gray-400 block">Max Area</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {(machineInfo.maxWidth / 10).toFixed(1)} × {(machineInfo.maxHeight / 10).toFixed(1)} mm
                </span>
              </div>
              {machineInfo.totalCount !== undefined && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-600 dark:text-gray-400 block">Total Stitches</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {machineInfo.totalCount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleDisconnectClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 text-xs font-medium transition-colors cursor-pointer"
          >
            Disconnect
          </button>
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
    </>
  );
}
