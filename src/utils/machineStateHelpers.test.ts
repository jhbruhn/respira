import { describe, it, expect } from "vitest";
import { canChooseStartBlock } from "./machineStateHelpers";
import { MachineStatus } from "../types/machine";

describe("canChooseStartBlock", () => {
  it("allows choosing a start block before the first start and while paused", () => {
    for (const status of [
      MachineStatus.IDLE,
      MachineStatus.SEWING_WAIT,
      MachineStatus.MASK_TRACE_COMPLETE,
      MachineStatus.PAUSE,
      MachineStatus.STOP,
      MachineStatus.SEWING_INTERRUPTION,
    ]) {
      expect(canChooseStartBlock(status)).toBe(true);
    }
  });

  it("does not allow it while the machine is busy or finished", () => {
    for (const status of [
      MachineStatus.SEWING,
      MachineStatus.MASK_TRACING,
      MachineStatus.SEWING_DATA_RECEIVE,
      MachineStatus.COLOR_CHANGE_WAIT,
      MachineStatus.SEWING_COMPLETE,
      MachineStatus.None,
    ]) {
      expect(canChooseStartBlock(status)).toBe(false);
    }
  });
});
