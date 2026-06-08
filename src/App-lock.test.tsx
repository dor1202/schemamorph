/**
 * Lock-aware App-level tests.
 * Covers:
 *  - config-panel overlay hidden when locked (even with a selected node or edge)
 *  - left sidebar uses COLLAPSED_WIDTH when locked (palette collapsed strip shown)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import App from "./App";
import { useStore } from "@/state/store";

describe("App lock mode", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
  });

  it("config-panel overlay has translate-x-full (hidden) when locked even with a selected node", () => {
    render(<App />);
    act(() => {
      useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      useStore
        .getState()
        .setNodes(
          useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
        );
      useStore.setState({ locked: true });
    });
    const overlay = screen.getByTestId("config-panel-overlay");
    expect(overlay.className).toMatch(/translate-x-full/);
    expect(overlay.className).not.toMatch(/translate-x-0/);
  });

  it("config-panel overlay has translate-x-full (hidden) when locked even with a selected edge", () => {
    render(<App />);
    act(() => {
      // Add two nodes and an edge between them
      useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      useStore.getState().addNode("cache", "redis", { x: 200, y: 0 });
      const [n1, n2] = useStore.getState().nodes;
      useStore.setState({
        edges: [
          {
            id: "e1",
            source: n1.id,
            target: n2.id,
            selected: true,
          },
        ],
        locked: true,
      });
    });
    const overlay = screen.getByTestId("config-panel-overlay");
    expect(overlay.className).toMatch(/translate-x-full/);
  });

  it("config-panel overlay is visible (translate-x-0) when unlocked with a selected node", () => {
    render(<App />);
    act(() => {
      useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      useStore
        .getState()
        .setNodes(
          useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
        );
      useStore.setState({ locked: false });
    });
    const overlay = screen.getByTestId("config-panel-overlay");
    expect(overlay.className).toMatch(/translate-x-0/);
  });

  it("when locked, palette shows collapsed strip (Expand sidebar button present)", () => {
    render(<App />);
    act(() => {
      useStore.setState({ locked: true });
    });
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Collapse sidebar" }),
    ).not.toBeInTheDocument();
  });
});
