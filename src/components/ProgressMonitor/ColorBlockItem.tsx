/**
 * ColorBlockItem Component
 *
 * Renders an individual color block card with thread metadata, stitch count, status icon, and progress
 */

import { forwardRef } from "react";
import {
  CheckCircleIcon,
  ArrowRightIcon,
  CircleStackIcon,
} from "@heroicons/react/24/solid";
import { Progress } from "@/components/ui/progress";
import { formatThreadMetadata } from "../../utils/threadMetadata";
import type { ColorBlock } from "./types";

interface ColorBlockItemProps {
  block: ColorBlock;
  index: number;
  currentStitch: number;
  isCurrent: boolean;
  isCompleted: boolean;
}

export const ColorBlockItem = forwardRef<HTMLDivElement, ColorBlockItemProps>(
  ({ block, index, currentStitch, isCurrent, isCompleted }, ref) => {
    // Calculate progress within current block
    let blockProgress = 0;
    if (isCurrent) {
      blockProgress =
        ((currentStitch - block.startStitch) / block.stitchCount) * 100;
    } else if (isCompleted) {
      blockProgress = 100;
    }

    const hasMetadata =
      block.threadBrand ||
      block.threadChart ||
      block.threadDescription ||
      block.threadCatalogNumber;

    return (
      <div
        key={index}
        ref={isCurrent ? ref : null}
        className={`p-2.5 rounded-lg border-2 transition-all duration-300 ${
          isCompleted
            ? "border-success-600 bg-success-50 dark:bg-success-900/20"
            : isCurrent
              ? "border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700"
              : "border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 opacity-70"
        }`}
        role="listitem"
        aria-label={`Thread ${block.colorIndex + 1}, ${block.stitchCount} stitches, ${isCompleted ? "completed" : isCurrent ? "in progress" : "pending"}`}
      >
        <div className="flex items-center gap-2.5">
          {/* Color swatch */}
          <div
            className="w-7 h-7 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-md flex-shrink-0"
            style={{
              backgroundColor: block.threadHex,
            }}
            title={`Thread color: ${block.threadHex}`}
            aria-label={`Thread color ${block.threadHex}`}
          />

          {/* Thread info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-xs text-gray-900 dark:text-gray-100">
              Thread {block.colorIndex + 1}
              {hasMetadata && (
                <span className="font-normal text-gray-600 dark:text-gray-400">
                  {" "}
                  ({formatThreadMetadata(block)})
                </span>
              )}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {block.stitchCount.toLocaleString()} stitches
            </div>
          </div>

          {/* Status icon */}
          {isCompleted ? (
            <CheckCircleIcon
              className="w-5 h-5 text-success-600 flex-shrink-0"
              aria-label="Completed"
            />
          ) : isCurrent ? (
            <ArrowRightIcon
              className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 animate-pulse"
              aria-label="In progress"
            />
          ) : (
            <CircleStackIcon
              className="w-5 h-5 text-gray-400 flex-shrink-0"
              aria-label="Pending"
            />
          )}
        </div>

        {/* Progress bar for current block */}
        {isCurrent && (
          <Progress
            value={blockProgress}
            className="mt-2 h-1.5 [&>div]:bg-gray-600 dark:[&>div]:bg-gray-500"
            aria-label={`${Math.round(blockProgress)}% complete`}
          />
        )}
      </div>
    );
  },
);

ColorBlockItem.displayName = "ColorBlockItem";
