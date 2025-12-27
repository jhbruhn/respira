/**
 * usePrevious Hook
 *
 * Returns the previous value of a state or prop
 * Useful for comparing current vs previous values in effects
 *
 * Note: This uses ref access during render, which is safe for this specific use case.
 * The pattern is recommended by React for tracking previous values.
 */

import { useRef } from "react";

/* eslint-disable react-hooks/refs */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<{ value: T; prev: T | undefined }>({
    value,
    prev: undefined,
  });

  const current = ref.current.value;

  if (value !== current) {
    ref.current = {
      value,
      prev: current,
    };
  }

  return ref.current.prev;
}
/* eslint-enable react-hooks/refs */
