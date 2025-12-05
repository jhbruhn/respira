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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={onCancel}>
      <div
        className={`bg-white rounded-lg shadow-2xl max-w-lg w-[90%] m-4 ${variant === 'danger' ? 'border-t-4 border-red-600' : 'border-t-4 border-yellow-500'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
      >
        <div className="p-6 border-b border-gray-300">
          <h3 id="dialog-title" className="m-0 text-xl font-semibold">{title}</h3>
        </div>
        <div className="p-6">
          <p id="dialog-message" className="m-0 leading-relaxed text-gray-900">{message}</p>
        </div>
        <div className="p-4 px-6 flex gap-3 justify-end border-t border-gray-300">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-gray-600 text-white rounded font-semibold text-sm hover:bg-gray-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]"
            autoFocus
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={variant === 'danger' ? 'px-6 py-3 bg-red-600 text-white rounded font-semibold text-sm hover:bg-red-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]' : 'px-6 py-3 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale-[0.3]'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
