import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CanvasHint } from "./CanvasHint";
import { useStore } from "@/state/store";

const setMockMedia = (globalThis as Record<string, unknown>)
  .setMockMedia as (next: { width?: number; coarse?: boolean }) => void;

function setup() {
  return render(<CanvasHint />);
}

beforeEach(() => {
  useStore.getState().reset();
  setMockMedia({ width: 1280, coarse: false });
});

afterEach(() => {
  setMockMedia({ width: 1280, coarse: false });
});

describe("CanvasHint priority rules", () => {
  it("renders the hint element", () => {
    setup();
    expect(screen.getByTestId("canvas-hint")).toBeInTheDocument();
  });

  it("rule 1: locked → shows lock message", () => {
    useStore.setState({ locked: true });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Diagram is locked — unlock to edit",
    );
  });

  it("rule 2: dragging + coarse → shows drop-on-bin message", () => {
    setMockMedia({ coarse: true });
    useStore.setState({ dragging: true });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Drop on the bin to delete",
    );
  });

  it("rule 3: armedTool kind=tool → shows tap + tool label", () => {
    useStore
      .getState()
      .armTool({ kind: "tool", archetype: "database", tool: "postgresql" });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Tap the canvas to place PostgreSQL",
    );
  });

  it("rule 3: armedTool kind=note → shows tap + a note", () => {
    useStore.getState().armTool({ kind: "note" });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Tap the canvas to place a note",
    );
  });

  it("rule 3: armedTool kind=boundary → shows tap + a boundary", () => {
    useStore.getState().armTool({ kind: "boundary" });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Tap the canvas to place a boundary",
    );
  });

  it("rule 4: touchSelectMode → shows drag-to-select message", () => {
    setMockMedia({ coarse: true });
    useStore.getState().setTouchSelectMode(true);
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Drag to select multiple items",
    );
  });

  it("rule 5: default + coarse → shows swipe up message", () => {
    setMockMedia({ coarse: true });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Swipe up the bottom bar to pick components",
    );
  });

  it("rule 6: default + fine → shows drag from palette hint", () => {
    setMockMedia({ coarse: false });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Drag components from the palette",
    );
  });

  it("precedence: locked beats armedTool", () => {
    useStore.setState({ locked: true });
    useStore.getState().armTool({ kind: "note" });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Diagram is locked — unlock to edit",
    );
  });

  it("precedence: dragging+coarse beats armedTool", () => {
    setMockMedia({ coarse: true });
    useStore.setState({ dragging: true });
    useStore.getState().armTool({ kind: "note" });
    setup();
    expect(screen.getByTestId("canvas-hint")).toHaveTextContent(
      "Drop on the bin to delete",
    );
  });
});
