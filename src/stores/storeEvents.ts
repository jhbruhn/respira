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
 * Subscribe to pattern deleted event
 * @param callback - Function to call when event is emitted
 * @returns Unsubscribe function
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
