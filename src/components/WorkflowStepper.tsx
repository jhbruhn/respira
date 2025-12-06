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
    <div className="relative max-w-5xl mx-auto mt-4">
      {/* Progress bar background */}
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-blue-400/30" style={{ left: '20px', right: '20px' }} />

      {/* Progress bar fill */}
      <div
        className="absolute top-4 left-0 h-0.5 bg-blue-100 transition-all duration-500"
        style={{
          left: '20px',
          width: `calc(${((currentStep - 1) / (steps.length - 1)) * 100}% - 20px)`
        }}
      />

      {/* Steps */}
      <div className="flex justify-between relative">
        {steps.map((step) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center" style={{ flex: 1 }}>
              {/* Step circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2
                  ${isComplete ? 'bg-green-500 border-green-500 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 border-blue-600 text-white scale-110' : ''}
                  ${isUpcoming ? 'bg-blue-700 border-blue-400/30 text-blue-200' : ''}
                `}
              >
                {isComplete ? (
                  <CheckCircleIcon className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>

              {/* Step label */}
              <div className="mt-1.5 text-center">
                <div className={`text-xs font-semibold ${isCurrent ? 'text-white' : isComplete ? 'text-blue-100' : 'text-blue-300'}`}>
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
