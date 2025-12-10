import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { MachineStatus } from '../types/machine';

interface WorkflowStepperProps {
  machineStatus: MachineStatus;
  isConnected: boolean;
  hasPattern: boolean;
  patternUploaded: boolean;
}

interface Step {
  id: number;
  label: string;
  description: string;
}

const steps: Step[] = [
  { id: 1, label: 'Connect', description: 'Connect to machine' },
  { id: 2, label: 'Load Pattern', description: 'Choose PES file' },
  { id: 3, label: 'Upload', description: 'Upload to machine' },
  { id: 4, label: 'Mask Trace', description: 'Trace pattern area' },
  { id: 5, label: 'Start Sewing', description: 'Begin embroidery' },
  { id: 6, label: 'Monitor', description: 'Watch progress' },
  { id: 7, label: 'Complete', description: 'Finish and remove' },
];

function getCurrentStep(machineStatus: MachineStatus, isConnected: boolean, hasPattern: boolean, patternUploaded: boolean): number {
  if (!isConnected) return 1;
  if (!hasPattern) return 2;
  if (!patternUploaded) return 3;

  // After upload, determine step based on machine status
  switch (machineStatus) {
    case MachineStatus.IDLE:
    case MachineStatus.MASK_TRACE_LOCK_WAIT:
    case MachineStatus.MASK_TRACING:
      return 4;

    case MachineStatus.MASK_TRACE_COMPLETE:
    case MachineStatus.SEWING_WAIT:
      return 5;

    case MachineStatus.SEWING:
    case MachineStatus.COLOR_CHANGE_WAIT:
    case MachineStatus.PAUSE:
    case MachineStatus.STOP:
    case MachineStatus.SEWING_INTERRUPTION:
      return 6;

    case MachineStatus.SEWING_COMPLETE:
      return 7;

    default:
      return 4;
  }
}

export function WorkflowStepper({ machineStatus, isConnected, hasPattern, patternUploaded }: WorkflowStepperProps) {
  const currentStep = getCurrentStep(machineStatus, isConnected, hasPattern, patternUploaded);

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
                className={`
                  w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 shadow-md
                  ${isComplete ? 'bg-green-500 dark:bg-green-600 border-green-400 dark:border-green-500 text-white shadow-green-500/30 dark:shadow-green-600/30' : ''}
                  ${isCurrent ? 'bg-blue-600 dark:bg-blue-700 border-blue-500 dark:border-blue-600 text-white scale-105 lg:scale-110 shadow-blue-600/40 dark:shadow-blue-700/40 ring-2 ring-blue-300 dark:ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
                  ${isUpcoming ? 'bg-blue-700 dark:bg-blue-800 border-blue-500/30 dark:border-blue-600/30 text-blue-200/70 dark:text-blue-300/70' : ''}
                `}
                aria-label={`${step.label}: ${isComplete ? 'completed' : isCurrent ? 'current' : 'upcoming'}`}
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
    </div>
  );
}
