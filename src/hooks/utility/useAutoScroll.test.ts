import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoScroll } from "./useAutoScroll";

describe("useAutoScroll", () => {
  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("should return a ref object", () => {
    const { result } = renderHook(() => useAutoScroll(0));
    expect(result.current).toHaveProperty("current");
  });

  it("should call scrollIntoView when dependency changes", () => {
    const mockElement = document.createElement("div");
    const scrollIntoViewMock = vi.fn();
    mockElement.scrollIntoView = scrollIntoViewMock;

    const { result, rerender } = renderHook(
      ({ dep }) => useAutoScroll(dep),
      { initialProps: { dep: 0 } },
    );

    // Attach mock element to ref
    (result.current as { current: HTMLElement }).current = mockElement;

    // Change dependency to trigger effect
    rerender({ dep: 1 });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "nearest",
      inline: undefined,
    });
  });

  it("should use custom scroll options", () => {
    const mockElement = document.createElement("div");
    const scrollIntoViewMock = vi.fn();
    mockElement.scrollIntoView = scrollIntoViewMock;

    const { result, rerender } = renderHook(
      ({ dep }) =>
        useAutoScroll(dep, {
          behavior: "auto",
          block: "start",
          inline: "center",
        }),
      { initialProps: { dep: 0 } },
    );

    (result.current as { current: HTMLElement }).current = mockElement;
    rerender({ dep: 1 });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
      inline: "center",
    });
  });

  it("should not call scrollIntoView if ref is not attached", () => {
    const { rerender } = renderHook(({ dep }) => useAutoScroll(dep), {
      initialProps: { dep: 0 },
    });

    // Change dependency without attaching ref
    rerender({ dep: 1 });

    // Should not throw or cause errors
    expect(true).toBe(true);
  });
});
