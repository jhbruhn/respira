import { useShallow } from "zustand/react/shallow";
import { useMachineStore } from "../stores/useMachineStore";
import { isBluetoothSupported } from "../utils/bluetoothSupport";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ConnectionPrompt() {
  const { connect } = useMachineStore(
    useShallow((state) => ({
      connect: state.connect,
    })),
  );

  if (isBluetoothSupported()) {
    return (
      <Card className="p-0 gap-0 border-l-4 border-gray-400 dark:border-gray-600">
        <CardContent className="p-4 rounded-lg">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-6 h-6 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Get Started
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Connect to your embroidery machine
              </p>
            </div>
          </div>
          <Button onClick={connect} className="w-full">
            Connect to Machine
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert className="bg-warning-50 dark:bg-warning-900/20 border-l-4 border-warning-500 dark:border-warning-600">
      <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
      <AlertDescription className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-warning-900 dark:text-warning-100 mb-2">
            Browser Not Supported
          </h3>
          <p className="text-sm text-warning-800 dark:text-warning-200">
            Your browser doesn't support Web Bluetooth, which is required to
            connect to your embroidery machine.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-warning-900 dark:text-warning-100">
            Please try one of these options:
          </p>
          <ul className="text-sm text-warning-800 dark:text-warning-200 space-y-1.5 ml-4 list-disc">
            <li>Use a supported browser (Chrome, Edge, or Opera)</li>
            <li>
              Download the Desktop app from{" "}
              <a
                href="https://github.com/jhbruhn/respira/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline hover:text-warning-900 dark:hover:text-warning-50 transition-colors"
              >
                GitHub Releases
              </a>
            </li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}
