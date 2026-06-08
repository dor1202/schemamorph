import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { useStore } from "@/state/store";

const setMockMedia = (globalThis as Record<string, unknown>)
  .setMockMedia as (next: { width?: number; coarse?: boolean }) => void;

describe("App phone layout", () => {
  beforeEach(() => {
    useStore.getState().reset();
    localStorage.clear();
    setMockMedia({ width: 1280, coarse: false }); // reset to desktop default
  });

  it("phone width mounts sheets and no desktop sidebars", () => {
    setMockMedia({ width: 390, coarse: true });
    render(<App />);
    expect(screen.getByTestId("phone-top-bar")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument(); // palette sheet
    expect(screen.queryByTestId("config-panel-overlay")).toBeNull();
  });

  it("desktop width keeps the existing tree", () => {
    setMockMedia({ width: 1280, coarse: false });
    render(<App />);
    expect(screen.queryByTestId("phone-top-bar")).toBeNull();
    expect(screen.getByTestId("config-panel-overlay")).toBeInTheDocument();
  });

  it("delete bin is NOT visible by default on phone (not dragging)", () => {
    setMockMedia({ width: 390, coarse: true });
    render(<App />);
    // dragging defaults to false, so DeleteBin renders null
    expect(screen.queryByTestId("delete-bin")).toBeNull();
  });

  it("palette bar remains visible when a node is selected", () => {
    setMockMedia({ width: 390, coarse: true });
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<App />);
    // Both palette sheet (bottom-sheet) and config sheet render simultaneously
    const sheets = screen.getAllByTestId("bottom-sheet");
    expect(sheets.length).toBe(2);
  });
});
