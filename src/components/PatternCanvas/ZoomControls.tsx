/**
 * ZoomControls Component
 *
 * Provides zoom and pan controls for the pattern canvas
 * Includes zoom in/out, reset zoom, and center pattern buttons
 */

import {
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onCenterPattern: () => void;
  canCenterPattern: boolean;
}

export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onCenterPattern,
  canCenterPattern,
}: ZoomControlsProps) {
  return (
    <div className="absolute bottom-2 sm:bottom-5 right-2 sm:right-5 flex gap-1.5 sm:gap-2 items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shadow-lg z-10">
      <Button
        variant="outline"
        size="icon"
        className="w-7 h-7 sm:w-8 sm:h-8"
        onClick={onCenterPattern}
        disabled={!canCenterPattern}
        title="Center Pattern in Hoop"
      >
        <ArrowsPointingInIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="w-7 h-7 sm:w-8 sm:h-8"
        onClick={onZoomIn}
        title="Zoom In"
      >
        <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>
      <span className="min-w-[40px] sm:min-w-[50px] text-center text-sm font-semibold text-gray-900 dark:text-gray-100 select-none">
        {Math.round(scale * 100)}%
      </span>
      <Button
        variant="outline"
        size="icon"
        className="w-7 h-7 sm:w-8 sm:h-8"
        onClick={onZoomOut}
        title="Zoom Out"
      >
        <MinusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="w-7 h-7 sm:w-8 sm:h-8 ml-1"
        onClick={onZoomReset}
        title="Reset Zoom"
      >
        <ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />
      </Button>
    </div>
  );
}
