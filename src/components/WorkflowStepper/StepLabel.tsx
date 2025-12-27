/**
 * StepLabel Component
 *
 * Renders the text label below each step circle
 */

export interface StepLabelProps {
  label: string;
  isCurrent: boolean;
  isComplete: boolean;
}

export function StepLabel({ label, isCurrent, isComplete }: StepLabelProps) {
  return (
    <div className="mt-1 lg:mt-2 text-center">
      <div
        className={`text-xs font-semibold leading-tight ${
          isCurrent
            ? "text-white"
            : isComplete
              ? "text-success-200 dark:text-success-300"
              : "text-primary-300/70 dark:text-primary-400/70"
        }`}
      >
        {label}
      </div>
    </div>
  );
}
