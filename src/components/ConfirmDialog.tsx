import { useEffect, useCallback } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) {
  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-[1000]" onClick={onCancel}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-lg w-[90%] m-4 ${variant === 'danger' ? 'border-t-4 border-danger-600 dark:border-danger-500' : 'border-t-4 border-warning-500 dark:border-warning-600'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
      >
        <div className="p-6 border-b border-gray-300 dark:border-gray-600">
          <h3 id="dialog-title" className="m-0 text-base lg:text-lg font-semibold dark:text-white">{title}</h3>
        </div>
        <div className="p-6">
          <p id="dialog-message" className="m-0 leading-relaxed text-gray-900 dark:text-gray-100">{message}</p>
        </div>
        <div className="p-4 px-6 flex gap-3 justify-end border-t border-gray-300 dark:border-gray-600">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-gray-600 dark:bg-gray-700 text-white rounded-lg font-semibold text-sm hover:bg-gray-700 dark:hover:bg-gray-600 active:bg-gray-800 dark:active:bg-gray-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            autoFocus
            aria-label="Cancel action"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={
              variant === 'danger'
                ? 'px-6 py-2.5 bg-danger-600 dark:bg-danger-700 text-white rounded-lg font-semibold text-sm hover:bg-danger-700 dark:hover:bg-danger-600 active:bg-danger-800 dark:active:bg-danger-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-danger-300 dark:focus:ring-danger-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
                : 'px-6 py-2.5 bg-primary-600 dark:bg-primary-700 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 dark:hover:bg-primary-600 active:bg-primary-800 dark:active:bg-primary-500 hover:shadow-lg active:scale-[0.98] transition-all duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
            }
            aria-label={`Confirm: ${confirmText}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
