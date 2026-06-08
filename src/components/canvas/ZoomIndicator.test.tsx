import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ZoomIndicator } from "./ZoomIndicator";

const setMockMedia = (globalThis as Record<string, unknown>)
  .setMockMedia as (next: { width?: number; coarse?: boolean }) => void;

// Partial mock of @xyflow/react — only override useViewport, keep everything else real.
let mockZoom = 1;

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useViewport: () => ({ x: 0, y: 0, zoom: mockZoom }),
  };
});

beforeEach(() => {
  mockZoom = 1;
  // ZoomIndicator is coarse-pointer-only; default these tests to coarse.
  setMockMedia({ coarse: true });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setMockMedia({ coarse: false });
});

describe("ZoomIndicator", () => {
  it("never renders on a fine pointer (desktop uses CanvasControls readout)", () => {
    setMockMedia({ coarse: false });
    const { rerender } = render(<ZoomIndicator />);

    // Even after a zoom change, it stays null on fine pointers.
    mockZoom = 1.5;
    act(() => {
      rerender(<ZoomIndicator />);
    });

    expect(screen.queryByTestId("zoom-indicator")).toBeNull();
  });

  it("does not render on initial mount (no zoom change yet)", () => {
    render(<ZoomIndicator />);
    expect(screen.queryByTestId("zoom-indicator")).toBeNull();
  });

  it("appears with correct percentage after a zoom change", async () => {
    const { rerender } = render(<ZoomIndicator />);

    // Simulate zoom change
    mockZoom = 1.5;
    act(() => {
      rerender(<ZoomIndicator />);
    });

    expect(screen.getByTestId("zoom-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("zoom-indicator")).toHaveTextContent("150%");
  });

  it("hides again after 1500ms of no zoom change", async () => {
    const { rerender } = render(<ZoomIndicator />);

    mockZoom = 0.75;
    act(() => {
      rerender(<ZoomIndicator />);
    });

    expect(screen.getByTestId("zoom-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("zoom-indicator")).toHaveTextContent("75%");

    // Advance timers past the 1500ms fade timeout
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByTestId("zoom-indicator")).toBeNull();
  });

  it("shows rounded percentage", () => {
    const { rerender } = render(<ZoomIndicator />);

    mockZoom = 1.337;
    act(() => {
      rerender(<ZoomIndicator />);
    });

    // Math.round(1.337 * 100) = 134
    expect(screen.getByTestId("zoom-indicator")).toHaveTextContent("134%");
  });
});
