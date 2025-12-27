/**
 * usePrevious Hook
 *
 * Returns the previous value of a state or prop
 * Useful for comparing current vs previous values in effects
 *
 * This implementation updates the ref in an effect instead of during render,
 * which is compatible with React Concurrent Mode and Strict Mode.
 *
 * Note: The ref read on return is safe because it's only returning the previous value
 * (from the last render), not the current value being passed in. This is the standard
 * pattern for usePrevious hooks.
 */

import { useEffect, useRef } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}
