/**
 * Workflow step definitions for the embroidery process
 */

export interface WorkflowStep {
  readonly id: number;
  readonly label: string;
  readonly description: string;
}

export const WORKFLOW_STEPS: readonly WorkflowStep[] = [
  { id: 1, label: "Connect", description: "Connect to machine" },
  { id: 2, label: "Home Machine", description: "Initialize hoop position" },
  { id: 3, label: "Load Pattern", description: "Choose PES file" },
  { id: 4, label: "Upload", description: "Upload to machine" },
  { id: 5, label: "Mask Trace", description: "Trace pattern area" },
  { id: 6, label: "Start Sewing", description: "Begin embroidery" },
  { id: 7, label: "Monitor", description: "Watch progress" },
  { id: 8, label: "Complete", description: "Finish and remove" },
] as const;
