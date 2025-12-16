import { useShallow } from 'zustand/react/shallow';
import { useMachineStore } from '../stores/useMachineStore';
import { usePatternStore } from '../stores/usePatternStore';
import { canDeletePattern } from '../utils/machineStateHelpers';
import { PatternInfo } from './PatternInfo';
import { DocumentTextIcon, TrashIcon } from '@heroicons/react/24/solid';

export function PatternSummaryCard() {
  // Machine store
  const {
    machineStatus,
    isDeleting,
    deletePattern,
  } = useMachineStore(
    useShallow((state) => ({
      machineStatus: state.machineStatus,
      isDeleting: state.isDeleting,
      deletePattern: state.deletePattern,
    }))
  );

  // Pattern store
  const {
    pesData,
    currentFileName,
  } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      currentFileName: state.currentFileName,
    }))
  );

  if (!pesData) return null;

  const canDelete = canDeletePattern(machineStatus);
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-l-4 border-blue-600 dark:border-blue-500">
      <div className="flex items-start gap-3 mb-3">
        <DocumentTextIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Active Pattern</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={currentFileName}>
            {currentFileName}
          </p>
        </div>
      </div>

      <PatternInfo pesData={pesData} />

      {canDelete && (
        <button
          onClick={deletePattern}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 sm:py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded border border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isDeleting ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            </>
          ) : (
            <>
              <TrashIcon className="w-3 h-3" />
              Delete Pattern
            </>
          )}
        </button>
      )}
    </div>
  );
}
