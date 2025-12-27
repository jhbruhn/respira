import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClickOutside } from "./useClickOutside";
import { useRef } from "react";

describe("useClickOutside", () => {
  it("should call handler when clicking outside element", () => {
    const handler = vi.fn();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, handler);
      return ref;
    });

    // Create and attach mock element
    const element = document.createElement("div");
    document.body.appendChild(element);
    (result.current as { current: HTMLDivElement }).current = element;

    // Click outside
    const outsideElement = document.createElement("div");
    document.body.appendChild(outsideElement);
    outsideElement.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );

    expect(handler).toHaveBeenCalledTimes(1);

    // Cleanup
    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });

  it("should not call handler when clicking inside element", () => {
    const handler = vi.fn();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      useClickOutside(ref, handler);
      return ref;
    });

    const element = document.createElement("div");
    document.body.appendChild(element);
    (result.current as { current: HTMLDivElement }).current = element;

    // Click inside
    element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(element);
  });

  it("should respect enabled option", () => {
    const handler = vi.fn();
    const { result, rerender } = renderHook(
      ({ enabled }) => {
        const ref = useRef<HTMLDivElement>(null);
        useClickOutside(ref, handler, { enabled });
        return ref;
      },
      { initialProps: { enabled: false } },
    );

    const element = document.createElement("div");
    document.body.appendChild(element);
    (result.current as { current: HTMLDivElement }).current = element;

    // Click outside while disabled
    const outsideElement = document.createElement("div");
    document.body.appendChild(outsideElement);
    outsideElement.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );

    expect(handler).not.toHaveBeenCalled();

    // Enable and click outside again
    rerender({ enabled: true });
    outsideElement.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );

    expect(handler).toHaveBeenCalledTimes(1);

    document.body.removeChild(element);
    document.body.removeChild(outsideElement);
  });

  it("should not call handler when clicking excluded refs", () => {
    const handler = vi.fn();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      const excludeRef = useRef<HTMLButtonElement>(null);
      useClickOutside(ref, handler, { excludeRefs: [excludeRef] });
      return { ref, excludeRef };
    });

    const element = document.createElement("div");
    const excludedElement = document.createElement("button");
    document.body.appendChild(element);
    document.body.appendChild(excludedElement);

    (result.current.ref as { current: HTMLDivElement }).current = element;
    (result.current.excludeRef as { current: HTMLButtonElement }).current =
      excludedElement;

    // Click on excluded element
    excludedElement.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true }),
    );

    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(element);
    document.body.removeChild(excludedElement);
  });

  it("should handle object of refs (WorkflowStepper pattern)", () => {
    const handler = vi.fn();
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      const stepRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
      useClickOutside(ref, handler, { excludeRefs: [stepRefs] });
      return { ref, stepRefs };
    });

    const element = document.createElement("div");
    const step1 = document.createElement("div");
    const step2 = document.createElement("div");
    document.body.appendChild(element);
    document.body.appendChild(step1);
    document.body.appendChild(step2);

    (result.current.ref as { current: HTMLDivElement }).current = element;
    (
      result.current.stepRefs as {
        current: { [key: number]: HTMLDivElement | null };
      }
    ).current = {
      1: step1,
      2: step2,
    };

    // Click on step1 (excluded)
    step1.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    // Click on step2 (excluded)
    step2.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(element);
    document.body.removeChild(step1);
    document.body.removeChild(step2);
  });
});
