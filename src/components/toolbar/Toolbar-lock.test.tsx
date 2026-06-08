/**
 * Feature 1: Lock mode — toolbar button tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { Toolbar } from "./Toolbar";
import { useStore } from "@/state/store";

const setup = () =>
  render(
    <ReactFlowProvider>
      <Toolbar />
    </ReactFlowProvider>,
  );

describe("Toolbar lock button", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
  });

  it("renders the Toggle lock button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Toggle lock" }),
    ).toBeInTheDocument();
  });

  it("clicking Toggle lock sets locked=true", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Toggle lock" }));
    expect(useStore.getState().locked).toBe(true);
  });

  it("clicking Toggle lock twice returns locked=false", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Toggle lock" }));
    await user.click(screen.getByRole("button", { name: "Toggle lock" }));
    expect(useStore.getState().locked).toBe(false);
  });

  it("Tidy layout button is NOT in the Toolbar (it lives in the Palette)", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Toggle lock" }));
    expect(
      screen.queryByRole("button", { name: "Tidy layout" }),
    ).not.toBeInTheDocument();
  });
});
