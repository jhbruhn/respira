/**
 * StepPopover Component
 *
 * Renders the guidance popover with dynamic content based on step and machine status
 */

import { forwardRef } from "react";
import {
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { MachineStatus } from "../../types/machine";
import { getGuideContent } from "../../utils/workflowGuideContent";

export interface StepPopoverProps {
  stepId: number;
  machineStatus: MachineStatus;
}

export const StepPopover = forwardRef<HTMLDivElement, StepPopoverProps>(
  ({ stepId, machineStatus }, ref) => {
    const content = getGuideContent(stepId, machineStatus);
    if (!content) return null;

    const colorClasses = {
      info: "bg-info-50 dark:bg-info-900/95 border-info-600 dark:border-info-500",
      success:
        "bg-success-50 dark:bg-success-900/95 border-success-600 dark:border-success-500",
      warning:
        "bg-warning-50 dark:bg-warning-900/95 border-warning-600 dark:border-warning-500",
      error:
        "bg-danger-50 dark:bg-danger-900/95 border-danger-600 dark:border-danger-500",
      progress:
        "bg-info-50 dark:bg-info-900/95 border-info-600 dark:border-info-500",
    };

    const iconColorClasses = {
      info: "text-info-600 dark:text-info-400",
      success: "text-success-600 dark:text-success-400",
      warning: "text-warning-600 dark:text-warning-400",
      error: "text-danger-600 dark:text-danger-400",
      progress: "text-info-600 dark:text-info-400",
    };

    const textColorClasses = {
      info: "text-info-900 dark:text-info-200",
      success: "text-success-900 dark:text-success-200",
      warning: "text-warning-900 dark:text-warning-200",
      error: "text-danger-900 dark:text-danger-200",
      progress: "text-info-900 dark:text-info-200",
    };

    const descColorClasses = {
      info: "text-info-800 dark:text-info-300",
      success: "text-success-800 dark:text-success-300",
      warning: "text-warning-800 dark:text-warning-300",
      error: "text-danger-800 dark:text-danger-300",
      progress: "text-info-800 dark:text-info-300",
    };

    const listColorClasses = {
      info: "text-blue-700 dark:text-blue-300",
      success: "text-green-700 dark:text-green-300",
      warning: "text-yellow-700 dark:text-yellow-300",
      error: "text-red-700 dark:text-red-300",
      progress: "text-cyan-700 dark:text-cyan-300",
    };

    const Icon =
      content.type === "warning"
        ? ExclamationTriangleIcon
        : InformationCircleIcon;

    return (
      <div
        ref={ref}
        className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-50 animate-fadeIn"
        role="dialog"
        aria-label="Step guidance"
      >
        <div
          className={`${colorClasses[content.type]} border-l-4 p-4 rounded-lg shadow-xl backdrop-blur-sm`}
        >
          <div className="flex items-start gap-3">
            <Icon
              className={`w-6 h-6 ${iconColorClasses[content.type]} flex-shrink-0 mt-0.5`}
            />
            <div className="flex-1">
              <h3
                className={`text-base font-semibold ${textColorClasses[content.type]} mb-2`}
              >
                {content.title}
              </h3>
              <p className={`text-sm ${descColorClasses[content.type]} mb-3`}>
                {content.description}
              </p>
              {content.items && content.items.length > 0 && (
                <ul
                  className={`list-disc list-inside text-sm ${listColorClasses[content.type]} space-y-1`}
                >
                  {content.items.map((item, index) => (
                    <li
                      key={index}
                      className="pl-2"
                      dangerouslySetInnerHTML={{
                        __html: item.replace(
                          /\*\*(.*?)\*\*/g,
                          "<strong>$1</strong>",
                        ),
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

StepPopover.displayName = "StepPopover";
