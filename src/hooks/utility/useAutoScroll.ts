/**
 * useAutoScroll Hook
 *
 * Automatically scrolls an element into view when a dependency changes.
 * Useful for keeping the current item visible in scrollable lists.
 *
 * @param dependency - The value to watch for changes (e.g., current index)
 * @param options - Scroll behavior options
 * @returns RefObject to attach to the element that should be scrolled into view
 *
 * @example
 * ```tsx
 * const currentItemRef = useAutoScroll(currentIndex, {
 *   behavior: "smooth",
 *   block: "nearest"
 * });
 *
 * return (
 *   <div ref={isCurrent ? currentItemRef : null}>
 *     Current Item
 *   </div>
 * );
 * ```
 */

import { useEffect, useRef, type RefObject } from "react";

export interface UseAutoScrollOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

export function useAutoScroll<T extends HTMLElement = HTMLElement>(
  dependency: unknown,
  options?: UseAutoScrollOptions,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: options?.behavior || "smooth",
        block: options?.block || "nearest",
        inline: options?.inline,
      });
    }
  }, [dependency, options?.behavior, options?.block, options?.inline]);

  return ref;
}
