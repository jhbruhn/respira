/**
 * WorkflowStepper Component
 *
 * Displays the 8-step embroidery workflow with progress tracking and contextual guidance
 */

import { useState, useRef } from "react";
import { useClickOutside } from "@/hooks";
import { useShallow } from "zustand/react/shallow";
import { useMachineStore, usePatternUploaded } from "../../stores/useMachineStore";
import { usePatternStore } from "../../stores/usePatternStore";
import { WORKFLOW_STEPS } from "../../constants/workflowSteps";
import { getCurrentStep } from "../../utils/workflowStepCalculation";
import { StepCircle } from "./StepCircle";
import { StepLabel } from "./StepLabel";
import { StepPopover } from "./StepPopover";

export function WorkflowStepper() {
  // Machine store
  const { machineStatus, isConnected } = useMachineStore(
    useShallow((state) => ({
      machineStatus: state.machineStatus,
      isConnected: state.isConnected,
    })),
  );

  // Pattern store
  const { pesData } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
    })),
  );

  // Derived state: pattern is uploaded if machine has pattern info
  const patternUploaded = usePatternUploaded();
  const hasPattern = pesData !== null;
  const currentStep = getCurrentStep(
    machineStatus,
    isConnected,
    hasPattern,
    patternUploaded,
  );
  const [showPopover, setShowPopover] = useState(false);
  const [popoverStep, setPopoverStep] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Close popover when clicking outside (exclude step circles)
  useClickOutside<HTMLDivElement>(popoverRef, () => setShowPopover(false), {
    enabled: showPopover,
    excludeRefs: [stepRefs],
  });

  const handleStepClick = (stepId: number) => {
    // Only allow clicking on current step or earlier completed steps
    if (stepId <= currentStep) {
      if (showPopover && popoverStep === stepId) {
        setShowPopover(false);
        setPopoverStep(null);
      } else {
        setPopoverStep(stepId);
        setShowPopover(true);
      }
    }
  };

  return (
    <div
      className="relative max-w-5xl mx-auto mt-2 lg:mt-4"
      role="navigation"
      aria-label="Workflow progress"
    >
      {/* Progress bar background */}
      <div
        className="absolute top-4 lg:top-5 left-0 right-0 h-0.5 lg:h-1 bg-primary-400/20 dark:bg-primary-600/20 rounded-full"
        style={{ left: "16px", right: "16px" }}
      />

      {/* Progress bar fill */}
      <div
        className="absolute top-4 lg:top-5 left-0 h-0.5 lg:h-1 bg-gradient-to-r from-success-500 to-primary-500 dark:from-success-600 dark:to-primary-600 transition-all duration-500 rounded-full"
        style={{
          left: "16px",
          width: `calc(${((currentStep - 1) / (WORKFLOW_STEPS.length - 1)) * 100}% - 16px)`,
        }}
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={WORKFLOW_STEPS.length}
        aria-label={`Step ${currentStep} of ${WORKFLOW_STEPS.length}`}
      />

      {/* Steps */}
      <div className="flex justify-between relative">
        {WORKFLOW_STEPS.map((step) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center"
              style={{ flex: 1 }}
              role="listitem"
              aria-current={isCurrent ? "step" : undefined}
            >
              <StepCircle
                ref={(el: HTMLDivElement | null) => {
                  stepRefs.current[step.id] = el;
                }}
                stepId={step.id}
                label={step.label}
                isComplete={isComplete}
                isCurrent={isCurrent}
                isUpcoming={isUpcoming}
                showPopover={showPopover && popoverStep === step.id}
                onClick={() => handleStepClick(step.id)}
              />

              <StepLabel
                label={step.label}
                isCurrent={isCurrent}
                isComplete={isComplete}
              />
            </div>
          );
        })}
      </div>

      {/* Popover */}
      {showPopover && popoverStep !== null && (
        <StepPopover
          ref={popoverRef}
          stepId={popoverStep}
          machineStatus={machineStatus}
        />
      )}
    </div>
  );
}
