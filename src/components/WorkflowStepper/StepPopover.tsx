/**
 * StepPopover Component
 *
 * Renders the guidance popover with dynamic content based on step and machine status
 */

import { forwardRef } from "react";
import { MachineStatus } from "../../types/machine";
import { getGuideContent } from "../../utils/workflowGuideContent";
import {
  InfoCard,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardList,
  InfoCardListItem,
} from "@/components/ui/info-card";

export interface StepPopoverProps {
  stepId: number;
  machineStatus: MachineStatus;
}

export const StepPopover = forwardRef<HTMLDivElement, StepPopoverProps>(
  ({ stepId, machineStatus }, ref) => {
    const content = getGuideContent(stepId, machineStatus);
    if (!content) return null;

    // Map content type to InfoCard variant
    const variantMap = {
      info: "info",
      success: "success",
      warning: "warning",
      error: "error",
      progress: "info",
    } as const;

    const variant = variantMap[content.type];

    return (
      <div
        ref={ref}
        className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-50 animate-fadeIn"
        role="dialog"
        aria-label="Step guidance"
      >
        <InfoCard variant={variant} className="shadow-xl">
          <InfoCardTitle variant={variant}>{content.title}</InfoCardTitle>
          <InfoCardDescription variant={variant}>
            {content.description}
          </InfoCardDescription>
          {content.items && content.items.length > 0 && (
            <InfoCardList variant={variant}>
              {content.items.map((item, index) => {
                // Parse **text** markdown syntax into React elements safely
                const parts = item.split(/(\*\*.*?\*\*)/);
                return (
                  <InfoCardListItem key={index}>
                    {parts.map((part, i) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={i}>{part.slice(2, -2)}</strong>;
                      }
                      return part;
                    })}
                  </InfoCardListItem>
                );
              })}
            </InfoCardList>
          )}
        </InfoCard>
      </div>
    );
  },
);

StepPopover.displayName = "StepPopover";
