import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useMachinePolling } from "./useMachinePolling";
import { MachineStatus } from "../../types/machine";

describe("useMachinePolling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should start polling when startPolling is called", async () => {
    const onStatusRefresh = vi.fn().mockResolvedValue(undefined);
    const onProgressRefresh = vi.fn().mockResolvedValue(undefined);
    const onServiceCountRefresh = vi.fn().mockResolvedValue(undefined);
    const onPatternInfoRefresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMachinePolling({
        machineStatus: MachineStatus.READY,
        patternInfo: null,
        onStatusRefresh,
        onProgressRefresh,
        onServiceCountRefresh,
        onPatternInfoRefresh,
        shouldCheckResumablePattern: () => false,
      }),
    );

    expect(result.current.isPolling).toBe(false);

    act(() => {
      result.current.startPolling();
    });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(true);
    });
  });

  it("should stop polling when stopPolling is called", async () => {
    const onStatusRefresh = vi.fn().mockResolvedValue(undefined);
    const onProgressRefresh = vi.fn().mockResolvedValue(undefined);
    const onServiceCountRefresh = vi.fn().mockResolvedValue(undefined);
    const onPatternInfoRefresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMachinePolling({
        machineStatus: MachineStatus.READY,
        patternInfo: null,
        onStatusRefresh,
        onProgressRefresh,
        onServiceCountRefresh,
        onPatternInfoRefresh,
        shouldCheckResumablePattern: () => false,
      }),
    );

    act(() => {
      result.current.startPolling();
    });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(true);
    });

    act(() => {
      result.current.stopPolling();
    });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });
  });

  it("should initialize polling correctly for SEWING state", async () => {
    const onStatusRefresh = vi.fn().mockResolvedValue(undefined);
    const onProgressRefresh = vi.fn().mockResolvedValue(undefined);
    const onServiceCountRefresh = vi.fn().mockResolvedValue(undefined);
    const onPatternInfoRefresh = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useMachinePolling({
        machineStatus: MachineStatus.SEWING,
        patternInfo: null,
        onStatusRefresh,
        onProgressRefresh,
        onServiceCountRefresh,
        onPatternInfoRefresh,
        shouldCheckResumablePattern: () => false,
      }),
    );

    act(() => {
      result.current.startPolling();
    });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(true);
    });

    act(() => {
      result.current.stopPolling();
    });

    await waitFor(() => {
      expect(result.current.isPolling).toBe(false);
    });
  });

  it("should initialize polling for different machine states", async () => {
    const createMocks = () => ({
      onStatusRefresh: vi.fn().mockResolvedValue(undefined),
      onProgressRefresh: vi.fn().mockResolvedValue(undefined),
      onServiceCountRefresh: vi.fn().mockResolvedValue(undefined),
      onPatternInfoRefresh: vi.fn().mockResolvedValue(undefined),
    });

    // Test COLOR_CHANGE_WAIT state
    const mocks1 = createMocks();
    const { result: result1 } = renderHook(() =>
      useMachinePolling({
        machineStatus: MachineStatus.COLOR_CHANGE_WAIT,
        patternInfo: null,
        ...mocks1,
        shouldCheckResumablePattern: () => false,
      }),
    );
    act(() => {
      result1.current.startPolling();
    });
    await waitFor(() => {
      expect(result1.current.isPolling).toBe(true);
    });
    act(() => {
      result1.current.stopPolling();
    });

    // Test READY state
    const mocks2 = createMocks();
    const { result: result2 } = renderHook(() =>
      useMachinePolling({
        machineStatus: MachineStatus.READY,
        patternInfo: null,
        ...mocks2,
        shouldCheckResumablePattern: () => false,
      }),
    );
    act(() => {
      result2.current.startPolling();
    });
    await waitFor(() => {
      expect(result2.current.isPolling).toBe(true);
    });
    act(() => {
      result2.current.stopPolling();
    });
  });
});
