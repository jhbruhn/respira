/**
 * useClickOutside Hook
 *
 * Detects clicks outside a referenced element and executes a handler function.
 * Useful for closing dropdown menus, popovers, modals, and other overlay UI elements.
 *
 * @param ref - Reference to the element to monitor for outside clicks
 * @param handler - Callback function to execute when outside click is detected
 * @param options - Configuration options
 * @param options.enabled - Whether the listener is active (default: true)
 * @param options.excludeRefs - Array of refs that should not trigger the handler when clicked
 *
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const buttonRef = useRef<HTMLButtonElement>(null);
 *
 * useClickOutside(
 *   dropdownRef,
 *   () => setIsOpen(false),
 *   {
 *     enabled: isOpen,
 *     excludeRefs: [buttonRef] // Don't close when clicking the button
 *   }
 * );
 *
 * return (
 *   <>
 *     <button ref={buttonRef}>Toggle</button>
 *     {isOpen && <div ref={dropdownRef}>Content</div>}
 *   </>
 * );
 * ```
 */

import { useEffect, type RefObject } from "react";

export interface UseClickOutsideOptions {
  enabled?: boolean;
  excludeRefs?: (
    | RefObject<HTMLElement>
    | { current: Record<string, HTMLElement | null> }
  )[];
}

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent) => void,
  options?: UseClickOutsideOptions,
): void {
  const { enabled = true, excludeRefs = [] } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the main ref
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Check if click is on any excluded refs
        const clickedExcluded = excludeRefs.some((excludeRef) => {
          if (!excludeRef.current) return false;

          // Handle object of refs (e.g., { [key: number]: HTMLElement | null })
          if (
            typeof excludeRef.current === "object" &&
            !("nodeType" in excludeRef.current)
          ) {
            return Object.values(excludeRef.current).some((element) =>
              element?.contains(event.target as Node),
            );
          }

          // Handle single ref
          return (excludeRef.current as HTMLElement).contains(
            event.target as Node,
          );
        });

        // Only call handler if click was not on excluded elements
        if (!clickedExcluded) {
          handler(event);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, handler, enabled, excludeRefs]);
}
