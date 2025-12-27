import { getErrorDetails } from "../utils/errorCodeHelpers";
import { PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardList,
  InfoCardListItem,
} from "./InfoCard";

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

  const variant = isInfo ? "info" : "error";
  const title =
    errorDetails?.title || (isPairingErr ? "Pairing Required" : "Error");

  return (
    <PopoverContent className="w-[600px] p-0" align="start">
      <InfoCard variant={variant} className="rounded-lg shadow-none border-0">
        <InfoCardTitle variant={variant}>{title}</InfoCardTitle>
        <InfoCardDescription variant={variant}>
          {errorDetails?.description || errorMsg}
        </InfoCardDescription>
        {errorDetails?.solutions && errorDetails.solutions.length > 0 && (
          <>
            <h4
              className={cn(
                "text-sm font-semibold mb-2",
                variant === "info"
                  ? "text-info-900 dark:text-info-200"
                  : "text-danger-900 dark:text-danger-200",
              )}
            >
              {isInfo ? "Steps:" : "How to Fix:"}
            </h4>
            <InfoCardList variant={variant} ordered>
              {errorDetails.solutions.map((solution, index) => (
                <InfoCardListItem key={index}>{solution}</InfoCardListItem>
              ))}
            </InfoCardList>
          </>
        )}
        {machineError !== undefined && !errorDetails?.isInformational && (
          <p
            className={cn(
              "text-xs mt-3 font-mono",
              variant === "info"
                ? "text-info-800 dark:text-info-300"
                : "text-danger-800 dark:text-danger-300",
            )}
          >
            Error Code: 0x
            {machineError.toString(16).toUpperCase().padStart(2, "0")}
          </p>
        )}
      </InfoCard>
    </PopoverContent>
  );
}
