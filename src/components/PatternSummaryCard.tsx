import { useShallow } from "zustand/react/shallow";
import { useMachineStore } from "../stores/useMachineStore";
import { usePatternStore } from "../stores/usePatternStore";
import { canDeletePattern } from "../utils/machineStateHelpers";
import { PatternInfo } from "./PatternInfo";
import { DocumentTextIcon, TrashIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function PatternSummaryCard() {
  // Machine store
  const { machineStatus, isDeleting, deletePattern } = useMachineStore(
    useShallow((state) => ({
      machineStatus: state.machineStatus,
      isDeleting: state.isDeleting,
      deletePattern: state.deletePattern,
    })),
  );

  // Pattern store
  const { pesData, currentFileName } = usePatternStore(
    useShallow((state) => ({
      pesData: state.pesData,
      currentFileName: state.currentFileName,
    })),
  );

  if (!pesData) return null;

  const canDelete = canDeletePattern(machineStatus);
  return (
    <Card className="p-0 gap-0 border-l-4 border-primary-600 dark:border-primary-500">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <DocumentTextIcon className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm">Active Pattern</CardTitle>
            <CardDescription
              className="text-xs truncate"
              title={currentFileName}
            >
              {currentFileName}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4">
        <PatternInfo pesData={pesData} />

        {canDelete && (
          <Button
            onClick={deletePattern}
            disabled={isDeleting}
            variant="outline"
            className="w-full bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300 border-danger-300 dark:border-danger-700 hover:bg-danger-100 dark:hover:bg-danger-900/30"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <TrashIcon className="w-3 h-3" />
                Delete Pattern
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
