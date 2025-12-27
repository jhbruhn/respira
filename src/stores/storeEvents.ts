/**
 * Store Events
 *
 * Zustand-based event store for cross-store communication without tight coupling.
 * Uses Zustand's built-in subscription system to emit and react to events.
 */

import { create } from "zustand";

interface EventState {
  // Event counters - incrementing these triggers subscriptions
  patternDeletedCount: number;

  // Actions to emit events
  emitPatternDeleted: () => void;
}

/**
 * Event store using Zustand for cross-store communication.
 * Stores can emit events by calling actions, and subscribe to events using Zustand's subscribe.
 */
export const useEventStore = create<EventState>((set) => ({
  patternDeletedCount: 0,

  emitPatternDeleted: () => {
    set((state) => ({ patternDeletedCount: state.patternDeletedCount + 1 }));
  },
}));

/**
 * Subscribe to the pattern deleted event.
 *
 * The subscription remains active until the returned unsubscribe function is called.
 * If the unsubscribe function is not called, the listener will persist for the
 * lifetime of the event store (typically the lifetime of the application).
 *
 * Call the returned unsubscribe function when the listener is no longer needed,
 * especially for short-lived components or non-module-level subscriptions.
 *
 * @param callback - Function to call when the event is emitted.
 * @returns Unsubscribe function that removes the listener when invoked.
 */
export const onPatternDeleted = (callback: () => void): (() => void) => {
  let prevCount = useEventStore.getState().patternDeletedCount;

  return useEventStore.subscribe((state) => {
    if (state.patternDeletedCount !== prevCount) {
      prevCount = state.patternDeletedCount;
      callback();
    }
  });
};
