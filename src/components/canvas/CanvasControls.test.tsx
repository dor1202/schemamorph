import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { CanvasControls } from "./CanvasControls";
import { useStore } from "@/state/store";

// Mock useReactFlow so we can spy on its return values
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockFitView = vi.fn();
const mockZoomTo = vi.fn();

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useReactFlow: () => ({
      ...actual.useReactFlow?.(),
      zoomIn: mockZoomIn,
      zoomOut: mockZoomOut,
      fitView: mockFitView,
      zoomTo: mockZoomTo,
    }),
    useViewport: () => ({ x: 0, y: 0, zoom: 1.5 }),
  };
});

function setup() {
  return render(
    <ReactFlowProvider>
      <CanvasControls />
    </ReactFlowProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useStore.getState().reset();
});

describe("CanvasControls", () => {
  it("renders exactly 6 buttons (zoom out, %, zoom in, fit, undo, redo)", () => {
    setup();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });

  it("shows live zoom percentage", () => {
    setup();
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  it("clicking the percentage resets zoom to 150%", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Reset zoom to 150%" }));
    expect(mockZoomTo).toHaveBeenCalledWith(1.5, { duration: 150 });
  });

  it("renders a Zoom in button", () => {
    setup();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
  });

  it("renders a Zoom out button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Zoom out" }),
    ).toBeInTheDocument();
  });

  it("renders a Fit view button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Fit view" }),
    ).toBeInTheDocument();
  });

  it("clicking Zoom in calls zoomIn with duration 150", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(mockZoomIn).toHaveBeenCalledTimes(1);
    expect(mockZoomIn).toHaveBeenCalledWith({ duration: 150 });
  });

  it("clicking Zoom out calls zoomOut with duration 150", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(mockZoomOut).toHaveBeenCalledTimes(1);
    expect(mockZoomOut).toHaveBeenCalledWith({ duration: 150 });
  });

  it("clicking Fit view calls fitView with duration 300 and padding 0.2", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Fit view" }));
    expect(mockFitView).toHaveBeenCalledTimes(1);
    expect(mockFitView).toHaveBeenCalledWith({ duration: 300, padding: 0.2 });
  });

  describe("Undo / Redo buttons", () => {
    it("renders an Undo button", () => {
      setup();
      expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    });

    it("renders a Redo button", () => {
      setup();
      expect(screen.getByRole("button", { name: "Redo" })).toBeInTheDocument();
    });

    it("Undo is disabled when there is no history", () => {
      setup();
      expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    });

    it("Redo is disabled when there is no future", () => {
      setup();
      expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
    });

    it("Undo is enabled after adding a node", () => {
      setup();
      act(() => {
        useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      });
      expect(screen.getByRole("button", { name: "Undo" })).not.toBeDisabled();
    });

    it("clicking Undo reverts added node", () => {
      setup();
      act(() => {
        useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      });
      expect(useStore.getState().nodes).toHaveLength(1);
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      expect(useStore.getState().nodes).toHaveLength(0);
    });

    it("Redo is enabled after an undo", () => {
      setup();
      act(() => {
        useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      });
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      expect(screen.getByRole("button", { name: "Redo" })).not.toBeDisabled();
    });

    it("clicking Redo re-applies the undone action", () => {
      setup();
      act(() => {
        useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      });
      fireEvent.click(screen.getByRole("button", { name: "Undo" }));
      expect(useStore.getState().nodes).toHaveLength(0);
      fireEvent.click(screen.getByRole("button", { name: "Redo" }));
      expect(useStore.getState().nodes).toHaveLength(1);
    });
  });
});
