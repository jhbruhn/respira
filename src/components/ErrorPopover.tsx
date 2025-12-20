import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { getErrorDetails } from "../utils/errorCodeHelpers";
import { PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ErrorPopoverContentProps {
  machineError?: number;
  isPairingError: boolean;
  errorMessage?: string | null;
  pyodideError?: string | null;
}

export function ErrorPopoverContent({
  machineError,
  isPairingError,
  errorMessage,
  pyodideError,
}: ErrorPopoverContentProps) {
  const errorDetails = getErrorDetails(machineError);
  const isPairingErr = isPairingError;
  const errorMsg = pyodideError || errorMessage || "";
  const isInfo = isPairingErr || errorDetails?.isInformational;

  const bgColor = isInfo
    ? "bg-info-50 dark:bg-info-900/95 border-info-600 dark:border-info-500"
    : "bg-danger-50 dark:bg-danger-900/95 border-danger-600 dark:border-danger-500";

  const iconColor = isInfo
    ? "text-info-600 dark:text-info-400"
    : "text-danger-600 dark:text-danger-400";

  const textColor = isInfo
    ? "text-info-900 dark:text-info-200"
    : "text-danger-900 dark:text-danger-200";

  const descColor = isInfo
    ? "text-info-800 dark:text-info-300"
    : "text-danger-800 dark:text-danger-300";

  const listColor = isInfo
    ? "text-info-700 dark:text-info-300"
    : "text-danger-700 dark:text-danger-300";

  const Icon = isInfo ? InformationCircleIcon : ExclamationTriangleIcon;
  const title =
    errorDetails?.title || (isPairingErr ? "Pairing Required" : "Error");

  return (
    <PopoverContent
      className={cn("w-[600px] border-l-4 p-4 backdrop-blur-sm", bgColor)}
      align="start"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-6 h-6 flex-shrink-0 mt-0.5", iconColor)} />
        <div className="flex-1">
          <h3 className={cn("text-base font-semibold mb-2", textColor)}>
            {title}
          </h3>
          <p className={cn("text-sm mb-3", descColor)}>
            {errorDetails?.description || errorMsg}
          </p>
          {errorDetails?.solutions && errorDetails.solutions.length > 0 && (
            <>
              <h4 className={cn("text-sm font-semibold mb-2", textColor)}>
                {isInfo ? "Steps:" : "How to Fix:"}
              </h4>
              <ol
                className={cn(
                  "list-decimal list-inside text-sm space-y-1.5",
                  listColor,
                )}
              >
                {errorDetails.solutions.map((solution, index) => (
                  <li key={index} className="pl-2">
                    {solution}
                  </li>
                ))}
              </ol>
            </>
          )}
          {machineError !== undefined && !errorDetails?.isInformational && (
            <p className={cn("text-xs mt-3 font-mono", descColor)}>
              Error Code: 0x
              {machineError.toString(16).toUpperCase().padStart(2, "0")}
            </p>
          )}
        </div>
      </div>
    </PopoverContent>
  );
}
