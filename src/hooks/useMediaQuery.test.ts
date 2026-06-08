import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery, useIsPhone, useIsCoarsePointer } from "./useMediaQuery";

const setMockMedia = (globalThis as Record<string, unknown>)
  .setMockMedia as (next: { width?: number; coarse?: boolean }) => void;

describe("useMediaQuery", () => {
  it("reflects current media state and updates on change", () => {
    setMockMedia({ width: 1280, coarse: false });
    const { result } = renderHook(() => useMediaQuery("(max-width: 639px)"));
    expect(result.current).toBe(false);
    act(() => setMockMedia({ width: 480 }));
    expect(result.current).toBe(true);
  });

  it("useIsPhone true below 640px, false at 640px", () => {
    setMockMedia({ width: 639 });
    const { result, rerender } = renderHook(() => useIsPhone());
    expect(result.current).toBe(true);
    act(() => setMockMedia({ width: 640 }));
    rerender();
    expect(result.current).toBe(false);
  });

  it("useIsCoarsePointer tracks pointer coarseness", () => {
    setMockMedia({ coarse: true });
    const { result } = renderHook(() => useIsCoarsePointer());
    expect(result.current).toBe(true);
    act(() => setMockMedia({ coarse: false }));
    expect(result.current).toBe(false);
  });
});
