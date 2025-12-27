/**
 * ColorBlockList Component
 *
 * Container for the scrollable list of color blocks
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { ColorBlockItem } from "./ColorBlockItem";
import type { ColorBlock } from "./types";

interface ColorBlockListProps {
  colorBlocks: ColorBlock[];
  currentStitch: number;
  currentBlockIndex: number;
  currentBlockRef: React.RefObject<HTMLDivElement | null>;
}

export function ColorBlockList({
  colorBlocks,
  currentStitch,
  currentBlockIndex,
  currentBlockRef,
}: ColorBlockListProps) {
  if (colorBlocks.length === 0) return null;

  return (
    <div className="mb-3 lg:flex-1 lg:min-h-0 flex flex-col">
      <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 flex-shrink-0">
        Color Blocks
      </h4>
      <ScrollArea className="lg:flex-1 lg:h-0">
        <div className="flex flex-col gap-2 pr-4">
          {colorBlocks.map((block, index) => {
            const isCompleted = currentStitch >= block.endStitch;
            const isCurrent = index === currentBlockIndex;

            return (
              <ColorBlockItem
                key={index}
                ref={isCurrent ? currentBlockRef : null}
                block={block}
                index={index}
                currentStitch={currentStitch}
                isCurrent={isCurrent}
                isCompleted={isCompleted}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
