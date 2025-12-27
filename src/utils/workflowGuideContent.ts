/**
 * Workflow step guide content
 *
 * Provides contextual guidance for each workflow step based on machine state
 */

import { MachineStatus } from "../types/machine";

export interface GuideContent {
  type: "info" | "warning" | "success" | "error" | "progress";
  title: string;
  description: string;
  items: string[];
}

/**
 * Get guide content for a specific workflow step
 *
 * @param stepId - The workflow step ID (1-8)
 * @param machineStatus - Current machine status for dynamic content
 * @returns Guide content with type, title, description, and items
 */
export function getGuideContent(
  stepId: number,
  machineStatus: MachineStatus,
): GuideContent | null {
  switch (stepId) {
    case 1:
      return {
        type: "info",
        title: "Step 1: Connect to Machine",
        description:
          "To get started, connect to your Brother embroidery machine via Bluetooth.",
        items: [
          "Make sure your machine is powered on",
          "Enable Bluetooth on your machine",
          'Click the "Connect to Machine" button below',
        ],
      };

    case 2:
      return {
        type: "info",
        title: "Step 2: Home Machine",
        description:
          "The hoop needs to be removed and an initial homing procedure must be performed.",
        items: [
          "Remove the embroidery hoop from the machine completely",
          "Press the Accept button on the machine",
          "Wait for the machine to complete its initialization (homing)",
          "Once initialization is complete, reattach the hoop",
          "The machine should now recognize the hoop correctly",
        ],
      };

    case 3:
      return {
        type: "info",
        title: "Step 3: Load Your Pattern",
        description:
          "Choose a PES embroidery file from your computer to preview and upload.",
        items: [
          'Click "Choose PES File" in the Pattern File section',
          "Select your embroidery design (.pes file)",
          "Review the pattern preview on the right",
          "You can drag the pattern to adjust its position",
        ],
      };

    case 4:
      return {
        type: "info",
        title: "Step 4: Upload Pattern to Machine",
        description:
          "Send your pattern to the embroidery machine to prepare for sewing.",
        items: [
          "Review the pattern preview to ensure it's positioned correctly",
          "Check the pattern size matches your hoop",
          'Click "Upload to Machine" when ready',
          "Wait for the upload to complete (this may take a minute)",
        ],
      };

    case 5:
      // Check machine status for substates
      if (machineStatus === MachineStatus.MASK_TRACE_LOCK_WAIT) {
        return {
          type: "warning",
          title: "Machine Action Required",
          description: "The machine is ready to trace the pattern outline.",
          items: [
            "Press the button on your machine to confirm and start the mask trace",
            "Ensure the hoop is properly attached",
            "Make sure the needle area is clear",
          ],
        };
      }
      if (machineStatus === MachineStatus.MASK_TRACING) {
        return {
          type: "progress",
          title: "Mask Trace In Progress",
          description:
            "The machine is tracing the pattern boundary. Please wait...",
          items: [
            "Watch the machine trace the outline",
            "Verify the pattern fits within your hoop",
            "Do not interrupt the machine",
          ],
        };
      }
      return {
        type: "info",
        title: "Step 5: Start Mask Trace",
        description:
          "The mask trace helps the machine understand the pattern boundaries.",
        items: [
          'Click "Start Mask Trace" button in the Sewing Progress section',
          "The machine will trace the pattern outline",
          "This ensures the hoop is positioned correctly",
        ],
      };

    case 6:
      return {
        type: "success",
        title: "Step 6: Ready to Sew!",
        description: "The machine is ready to begin embroidering your pattern.",
        items: [
          "Verify your thread colors are correct",
          "Ensure the fabric is properly hooped",
          'Click "Start Sewing" when ready',
        ],
      };

    case 7:
      // Check for substates
      if (machineStatus === MachineStatus.COLOR_CHANGE_WAIT) {
        return {
          type: "warning",
          title: "Thread Change Required",
          description:
            "The machine needs a different thread color to continue.",
          items: [
            "Check the color blocks section to see which thread is needed",
            "Change to the correct thread color",
            "Press the button on your machine to resume sewing",
          ],
        };
      }
      if (
        machineStatus === MachineStatus.PAUSE ||
        machineStatus === MachineStatus.STOP ||
        machineStatus === MachineStatus.SEWING_INTERRUPTION
      ) {
        return {
          type: "warning",
          title: "Sewing Paused",
          description: "The embroidery has been paused or interrupted.",
          items: [
            "Check if everything is okay with the machine",
            'Click "Resume Sewing" when ready to continue',
            "The machine will pick up where it left off",
          ],
        };
      }
      return {
        type: "progress",
        title: "Step 7: Sewing In Progress",
        description:
          "Your embroidery is being stitched. Monitor the progress below.",
        items: [
          "Watch the progress bar and current stitch count",
          "The machine will pause when a color change is needed",
          "Do not leave the machine unattended",
        ],
      };

    case 8:
      return {
        type: "success",
        title: "Step 8: Embroidery Complete!",
        description: "Your embroidery is finished. Great work!",
        items: [
          "Remove the hoop from the machine",
          "Press the Accept button on the machine",
          "Carefully remove your finished embroidery",
          "Trim any jump stitches or loose threads",
          'Click "Delete Pattern" to start a new project',
        ],
      };

    default:
      return null;
  }
}
