import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { useStore } from "@/state/store";
import { act } from "react";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
  });

  it("renders toolbar, palette, and canvas", () => {
    render(<App />);
    expect(screen.getByText("SchemaMorph")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
  });

  it("mode toggle in full app flips store", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Real Tools" }));
    expect(useStore.getState().viewMode).toBe("real");
  });

  it("config-panel-overlay has absolute positioning when a node is selected", async () => {
    render(<App />);
    // Select a node via the store to trigger panel visibility
    act(() => {
      useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      useStore
        .getState()
        .setNodes(
          useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
        );
    });
    const overlay = screen.getByTestId("config-panel-overlay");
    expect(overlay.className).toMatch(/absolute/);
  });
});
