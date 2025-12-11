import { useState, useRef, useEffect } from 'react';
import { CheckCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { MachineStatus } from '../types/machine';
import { getErrorDetails } from '../utils/errorCodeHelpers';

interface WorkflowStepperProps {
  machineStatus: MachineStatus;
  isConnected: boolean;
  hasPattern: boolean;
  patternUploaded: boolean;
  hasError?: boolean;
  errorMessage?: string;
  errorCode?: number;
}

interface Step {
  id: number;
  label: string;
  description: string;
}

const steps: Step[] = [
  { id: 1, label: 'Connect', description: 'Connect to machine' },
  { id: 2, label: 'Home Machine', description: 'Initialize hoop position' },
  { id: 3, label: 'Load Pattern', description: 'Choose PES file' },
  { id: 4, label: 'Upload', description: 'Upload to machine' },
  { id: 5, label: 'Mask Trace', description: 'Trace pattern area' },
  { id: 6, label: 'Start Sewing', description: 'Begin embroidery' },
  { id: 7, label: 'Monitor', description: 'Watch progress' },
  { id: 8, label: 'Complete', description: 'Finish and remove' },
];

// Helper function to get guide content for a step
function getGuideContent(
  stepId: number,
  machineStatus: MachineStatus,
  hasError: boolean,
  errorCode?: number,
  errorMessage?: string
) {
  // Check for errors first
  if (hasError) {
    const errorDetails = getErrorDetails(errorCode);

    if (errorDetails?.isInformational) {
      return {
        type: 'info' as const,
        title: errorDetails.title,
        description: errorDetails.description,
        items: errorDetails.solutions || []
      };
    }

    return {
      type: 'error' as const,
      title: errorDetails?.title || 'Error Occurred',
      description: errorDetails?.description || errorMessage || 'An error occurred. Please check the machine and try again.',
      items: errorDetails?.solutions || [],
      errorCode
    };
  }

  // Return content based on step
  switch (stepId) {
    case 1:
      return {
        type: 'info' as const,
        title: 'Step 1: Connect to Machine',
        description: 'To get started, connect to your Brother embroidery machine via Bluetooth.',
        items: [
          'Make sure your machine is powered on',
          'Enable Bluetooth on your machine',
          'Click the "Connect to Machine" button below'
        ]
      };

    case 2:
      return {
        type: 'info' as const,
        title: 'Step 2: Home Machine',
        description: 'The hoop needs to be removed and an initial homing procedure must be performed.',
        items: [
          'Remove the embroidery hoop from the machine completely',
          'Press the Accept button on the machine',
          'Wait for the machine to complete its initialization (homing)',
          'Once initialization is complete, reattach the hoop',
          'The machine should now recognize the hoop correctly'
        ]
      };

    case 3:
      return {
        type: 'info' as const,
        title: 'Step 3: Load Your Pattern',
        description: 'Choose a PES embroidery file from your computer to preview and upload.',
        items: [
          'Click "Choose PES File" in the Pattern File section',
          'Select your embroidery design (.pes file)',
          'Review the pattern preview on the right',
          'You can drag the pattern to adjust its position'
        ]
      };

    case 4:
      return {
        type: 'info' as const,
        title: 'Step 4: Upload Pattern to Machine',
        description: 'Send your pattern to the embroidery machine to prepare for sewing.',
        items: [
          'Review the pattern preview to ensure it\'s positioned correctly',
          'Check the pattern size matches your hoop',
          'Click "Upload to Machine" when ready',
          'Wait for the upload to complete (this may take a minute)'
        ]
      };

    case 5:
      // Check machine status for substates
      if (machineStatus === MachineStatus.MASK_TRACE_LOCK_WAIT) {
        return {
          type: 'warning' as const,
          title: 'Machine Action Required',
          description: 'The machine is ready to trace the pattern outline.',
          items: [
            'Press the button on your machine to confirm and start the mask trace',
            'Ensure the hoop is properly attached',
            'Make sure the needle area is clear'
          ]
        };
      }
      if (machineStatus === MachineStatus.MASK_TRACING) {
        return {
          type: 'progress' as const,
          title: 'Mask Trace In Progress',
          description: 'The machine is tracing the pattern boundary. Please wait...',
          items: [
            'Watch the machine trace the outline',
            'Verify the pattern fits within your hoop',
            'Do not interrupt the machine'
          ]
        };
      }
      return {
        type: 'info' as const,
        title: 'Step 5: Start Mask Trace',
        description: 'The mask trace helps the machine understand the pattern boundaries.',
        items: [
          'Click "Start Mask Trace" button in the Sewing Progress section',
          'The machine will trace the pattern outline',
          'This ensures the hoop is positioned correctly'
        ]
      };

    case 6:
      return {
        type: 'success' as const,
        title: 'Step 6: Ready to Sew!',
        description: 'The machine is ready to begin embroidering your pattern.',
        items: [
          'Verify your thread colors are correct',
          'Ensure the fabric is properly hooped',
          'Click "Start Sewing" when ready'
        ]
      };

    case 7:
      // Check for substates
      if (machineStatus === MachineStatus.COLOR_CHANGE_WAIT) {
        return {
          type: 'warning' as const,
          title: 'Thread Change Required',
          description: 'The machine needs a different thread color to continue.',
          items: [
            'Check the color blocks section to see which thread is needed',
            'Change to the correct thread color',
            'Press the button on your machine to resume sewing'
          ]
        };
      }
      if (machineStatus === MachineStatus.PAUSE ||
          machineStatus === MachineStatus.STOP ||
          machineStatus === MachineStatus.SEWING_INTERRUPTION) {
        return {
          type: 'warning' as const,
          title: 'Sewing Paused',
          description: 'The embroidery has been paused or interrupted.',
          items: [
            'Check if everything is okay with the machine',
            'Click "Resume Sewing" when ready to continue',
            'The machine will pick up where it left off'
          ]
        };
      }
      return {
        type: 'progress' as const,
        title: 'Step 7: Sewing In Progress',
        description: 'Your embroidery is being stitched. Monitor the progress below.',
        items: [
          'Watch the progress bar and current stitch count',
          'The machine will pause when a color change is needed',
          'Do not leave the machine unattended'
        ]
      };

    case 8:
      return {
        type: 'success' as const,
        title: 'Step 8: Embroidery Complete!',
        description: 'Your embroidery is finished. Great work!',
        items: [
          'Remove the hoop from the machine',
          'Press the Accept button on the machine',
          'Carefully remove your finished embroidery',
          'Trim any jump stitches or loose threads',
          'Click "Delete Pattern" to start a new project'
        ]
      };

    default:
      return null;
  }
}

function getCurrentStep(machineStatus: MachineStatus, isConnected: boolean, hasPattern: boolean, patternUploaded: boolean): number {
  if (!isConnected) return 1;

  // Check if machine needs homing (Initial state)
  if (machineStatus === MachineStatus.Initial) return 2;

  if (!hasPattern) return 3;
  if (!patternUploaded) return 4;

  // After upload, determine step based on machine status
  switch (machineStatus) {
    case MachineStatus.IDLE:
    case MachineStatus.MASK_TRACE_LOCK_WAIT:
    case MachineStatus.MASK_TRACING:
      return 5;

    case MachineStatus.MASK_TRACE_COMPLETE:
    case MachineStatus.SEWING_WAIT:
      return 6;

    case MachineStatus.SEWING:
    case MachineStatus.COLOR_CHANGE_WAIT:
    case MachineStatus.PAUSE:
    case MachineStatus.STOP:
    case MachineStatus.SEWING_INTERRUPTION:
      return 7;

    case MachineStatus.SEWING_COMPLETE:
      return 8;

    default:
      return 5;
  }
}

export function WorkflowStepper({
  machineStatus,
  isConnected,
  hasPattern,
  patternUploaded,
  hasError = false,
  errorMessage,
  errorCode
}: WorkflowStepperProps) {
  const currentStep = getCurrentStep(machineStatus, isConnected, hasPattern, patternUploaded);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverStep, setPopoverStep] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        // Check if click was on a step circle
        const clickedStep = Object.values(stepRefs.current).find(ref =>
          ref?.contains(event.target as Node)
        );
        if (!clickedStep) {
          setShowPopover(false);
        }
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

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
    <div className="relative max-w-5xl mx-auto mt-2 lg:mt-4" role="navigation" aria-label="Workflow progress">
      {/* Progress bar background */}
      <div className="absolute top-4 lg:top-5 left-0 right-0 h-0.5 lg:h-1 bg-blue-400/20 dark:bg-blue-600/20 rounded-full" style={{ left: '16px', right: '16px' }} />

      {/* Progress bar fill */}
      <div
        className="absolute top-4 lg:top-5 left-0 h-0.5 lg:h-1 bg-gradient-to-r from-green-500 to-blue-500 dark:from-green-600 dark:to-blue-600 transition-all duration-500 rounded-full"
        style={{
          left: '16px',
          width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 16px)`
        }}
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-label={`Step ${currentStep} of ${steps.length}`}
      />

      {/* Steps */}
      <div className="flex justify-between relative">
        {steps.map((step) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center"
              style={{ flex: 1 }}
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Step circle */}
              <div
                ref={(el) => { stepRefs.current[step.id] = el; }}
                onClick={() => handleStepClick(step.id)}
                className={`
                  w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 shadow-md
                  ${step.id <= currentStep ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                  ${isComplete ? 'bg-green-500 dark:bg-green-600 border-green-400 dark:border-green-500 text-white shadow-green-500/30 dark:shadow-green-600/30' : ''}
                  ${isCurrent ? 'bg-blue-600 dark:bg-blue-700 border-blue-500 dark:border-blue-600 text-white scale-105 lg:scale-110 shadow-blue-600/40 dark:shadow-blue-700/40 ring-2 ring-blue-300 dark:ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
                  ${isUpcoming ? 'bg-blue-700 dark:bg-blue-800 border-blue-500/30 dark:border-blue-600/30 text-blue-200/70 dark:text-blue-300/70' : ''}
                  ${showPopover && popoverStep === step.id ? 'ring-4 ring-white dark:ring-gray-800' : ''}
                `}
                aria-label={`${step.label}: ${isComplete ? 'completed' : isCurrent ? 'current' : 'upcoming'}. Click for details.`}
                role="button"
                tabIndex={step.id <= currentStep ? 0 : -1}
              >
                {isComplete ? (
                  <CheckCircleIcon className="w-5 h-5 lg:w-6 lg:h-6" aria-hidden="true" />
                ) : (
                  step.id
                )}
              </div>

              {/* Step label */}
              <div className="mt-1 lg:mt-2 text-center">
                <div className={`text-xs font-semibold leading-tight ${
                  isCurrent ? 'text-white' : isComplete ? 'text-green-200 dark:text-green-300' : 'text-blue-300/70 dark:text-blue-400/70'
                }`}>
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Popover */}
      {showPopover && popoverStep !== null && (
        <div
          ref={popoverRef}
          className="absolute top-full mt-4 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-50 animate-fadeIn"
          role="dialog"
          aria-label="Step guidance"
        >
          {(() => {
            const content = getGuideContent(popoverStep, machineStatus, hasError, errorCode, errorMessage);
            if (!content) return null;

            const colorClasses = {
              info: 'bg-blue-50 dark:bg-blue-900/95 border-blue-600 dark:border-blue-500',
              success: 'bg-green-50 dark:bg-green-900/95 border-green-600 dark:border-green-500',
              warning: 'bg-yellow-50 dark:bg-yellow-900/95 border-yellow-600 dark:border-yellow-500',
              error: 'bg-red-50 dark:bg-red-900/95 border-red-600 dark:border-red-500',
              progress: 'bg-cyan-50 dark:bg-cyan-900/95 border-cyan-600 dark:border-cyan-500'
            };

            const iconColorClasses = {
              info: 'text-blue-600 dark:text-blue-400',
              success: 'text-green-600 dark:text-green-400',
              warning: 'text-yellow-600 dark:text-yellow-400',
              error: 'text-red-600 dark:text-red-400',
              progress: 'text-cyan-600 dark:text-cyan-400'
            };

            const textColorClasses = {
              info: 'text-blue-900 dark:text-blue-200',
              success: 'text-green-900 dark:text-green-200',
              warning: 'text-yellow-900 dark:text-yellow-200',
              error: 'text-red-900 dark:text-red-200',
              progress: 'text-cyan-900 dark:text-cyan-200'
            };

            const descColorClasses = {
              info: 'text-blue-800 dark:text-blue-300',
              success: 'text-green-800 dark:text-green-300',
              warning: 'text-yellow-800 dark:text-yellow-300',
              error: 'text-red-800 dark:text-red-300',
              progress: 'text-cyan-800 dark:text-cyan-300'
            };

            const listColorClasses = {
              info: 'text-blue-700 dark:text-blue-300',
              success: 'text-green-700 dark:text-green-300',
              warning: 'text-yellow-700 dark:text-yellow-300',
              error: 'text-red-700 dark:text-red-300',
              progress: 'text-cyan-700 dark:text-cyan-300'
            };

            const Icon = content.type === 'error' ? ExclamationTriangleIcon : InformationCircleIcon;

            return (
              <div className={`${colorClasses[content.type]} border-l-4 p-4 rounded-lg shadow-xl backdrop-blur-sm`}>
                <div className="flex items-start gap-3">
                  <Icon className={`w-6 h-6 ${iconColorClasses[content.type]} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <h3 className={`text-base font-semibold ${textColorClasses[content.type]} mb-2`}>
                      {content.title}
                    </h3>
                    <p className={`text-sm ${descColorClasses[content.type]} mb-3`}>
                      {content.description}
                    </p>
                    {content.items && content.items.length > 0 && (
                      <ul className={`list-disc list-inside text-sm ${listColorClasses[content.type]} space-y-1`}>
                        {content.items.map((item, index) => (
                          <li key={index} className="pl-2" dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        ))}
                      </ul>
                    )}
                    {content.type === 'error' && content.errorCode !== undefined && (
                      <p className={`text-xs ${descColorClasses[content.type]} mt-3 font-mono`}>
                        Error Code: 0x{content.errorCode.toString(16).toUpperCase().padStart(2, '0')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
