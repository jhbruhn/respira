import { forwardRef } from 'react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { getErrorDetails } from '../utils/errorCodeHelpers';

interface ErrorPopoverProps {
  machineError?: number;
  isPairingError: boolean;
  errorMessage?: string | null;
  pyodideError?: string | null;
}

export const ErrorPopover = forwardRef<HTMLDivElement, ErrorPopoverProps>(
  ({ machineError, isPairingError, errorMessage, pyodideError }, ref) => {
    const errorDetails = getErrorDetails(machineError);
    const isPairingErr = isPairingError;
    const errorMsg = pyodideError || errorMessage || '';
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
      <div
        ref={ref}
        className="absolute top-full mt-2 left-0 w-[600px] z-50 animate-fadeIn"
        role="dialog"
        aria-label="Error details"
      >
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
      </div>
    );
  }
);

ErrorPopover.displayName = 'ErrorPopover';
