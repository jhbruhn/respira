import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePrevious } from "./usePrevious";

describe("usePrevious", () => {
  it("should return undefined on initial render", () => {
    const { result } = renderHook(() => usePrevious(5));
    expect(result.current).toBeUndefined();
  });

  it("should return previous value after update", () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 5 },
    });

    expect(result.current).toBeUndefined();

    rerender({ value: 10 });
    expect(result.current).toBe(5);

    rerender({ value: 15 });
    expect(result.current).toBe(10);
  });

  it("should handle different types of values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      {
        initialProps: { value: "hello" as string | number | null },
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ value: 42 });
    expect(result.current).toBe("hello");

    rerender({ value: null });
    expect(result.current).toBe(42);
  });

  it("should handle object references", () => {
    const obj1 = { name: "first" };
    const obj2 = { name: "second" };

    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      {
        initialProps: { value: obj1 },
      },
    );

    expect(result.current).toBeUndefined();

    rerender({ value: obj2 });
    expect(result.current).toBe(obj1);
  });
});
