/**
 * StepCircle Component
 *
 * Renders a circular step indicator with number or checkmark icon
 */

import { forwardRef } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export interface StepCircleProps {
  stepId: number;
  label: string;
  isComplete: boolean;
  isCurrent: boolean;
  isUpcoming: boolean;
  showPopover: boolean;
  onClick: () => void;
}

export const StepCircle = forwardRef<HTMLDivElement, StepCircleProps>(
  (
    { stepId, label, isComplete, isCurrent, isUpcoming, showPopover, onClick },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`
          w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 shadow-md
          ${isComplete || isCurrent ? "cursor-pointer hover:scale-110" : "cursor-not-allowed"}
          ${isComplete ? "bg-success-500 dark:bg-success-600 border-success-400 dark:border-success-500 text-white shadow-success-500/30 dark:shadow-success-600/30" : ""}
          ${isCurrent ? "bg-primary-600 dark:bg-primary-700 border-primary-500 dark:border-primary-600 text-white scale-105 lg:scale-110 shadow-primary-600/40 dark:shadow-primary-700/40 ring-2 ring-primary-300 dark:ring-primary-500 ring-offset-2 dark:ring-offset-gray-900" : ""}
          ${isUpcoming ? "bg-primary-700 dark:bg-primary-800 border-primary-500/30 dark:border-primary-600/30 text-primary-200/70 dark:text-primary-300/70" : ""}
          ${showPopover ? "ring-4 ring-white dark:ring-gray-800" : ""}
        `}
        aria-label={`${label}: ${isComplete ? "completed" : isCurrent ? "current" : "upcoming"}. Click for details.`}
        role="button"
        tabIndex={isComplete || isCurrent ? 0 : -1}
      >
        {isComplete ? (
          <CheckCircleIcon
            className="w-5 h-5 lg:w-6 lg:h-6"
            aria-hidden="true"
          />
        ) : (
          stepId
        )}
      </div>
    );
  },
);

StepCircle.displayName = "StepCircle";
