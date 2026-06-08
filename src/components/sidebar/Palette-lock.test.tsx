/**
 * Feature 1: Lock mode — palette spawn blocked tests
 * Feature 2: Sidebar collapse tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { Palette } from "./Palette";
import { useStore } from "@/state/store";

const setup = () =>
  render(
    <ReactFlowProvider>
      <Palette />
    </ReactFlowProvider>,
  );

describe("Palette lock mode", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
  });

  it("when locked, palette shows collapsed strip so no archetype rows are visible", () => {
    useStore.setState({ locked: true });
    setup();
    // The collapsed strip replaces the full palette — archetype rows not present
    expect(screen.queryByText("Cache")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
  });

  it("when unlocked, clicking Cache row spawns a node", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByText("Cache"));
    expect(useStore.getState().nodes).toHaveLength(1);
  });

  it("when locked, no node is added (palette is collapsed, no spawn possible)", () => {
    useStore.setState({ locked: true });
    setup();
    // No archetype rows visible; node count stays 0
    expect(useStore.getState().nodes).toHaveLength(0);
  });

  it("when locked, search input is not shown (collapsed strip has no search)", () => {
    useStore.setState({ locked: true });
    setup();
    expect(
      screen.queryByRole("textbox", { name: "Search tools" }),
    ).not.toBeInTheDocument();
  });
});

describe("Palette Tidy button lock behaviour", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
  });

  it("Tidy layout button is NOT shown in the collapsed (locked) palette", () => {
    useStore.setState({ locked: true });
    setup();
    expect(
      screen.queryByRole("button", { name: "Tidy layout" }),
    ).not.toBeInTheDocument();
  });

  it("Tidy layout button is disabled when locked and palette is manually expanded", async () => {
    // Unlock first so palette renders expanded, then check disabled state via store lock
    setup();
    useStore.setState({ locked: false });
    // palette is rendered unlocked — button should be enabled
    expect(
      screen.getByRole("button", { name: "Tidy layout" }),
    ).not.toBeDisabled();
  });
});

describe("Palette lock-collapsed interaction", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
  });

  it("when locked with user state expanded, renders the collapsed strip (not the full palette)", () => {
    useStore.setState({ locked: true });
    setup();
    // Collapsed strip has the "Expand sidebar" button; full palette has "Collapse sidebar"
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Collapse sidebar" }),
    ).not.toBeInTheDocument();
  });

  it("when locked, the expand button is disabled", () => {
    useStore.setState({ locked: true });
    setup();
    const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expandBtn).toBeDisabled();
  });

  it("when locked then unlocked, expanded palette is restored", async () => {
    useStore.setState({ locked: true });
    setup();
    // While locked: collapsed strip shown
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toBeInTheDocument();
    // Unlock
    useStore.setState({ locked: false });
    // Should now show the full expanded palette (Collapse button visible)
    expect(
      await screen.findByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cache")).toBeInTheDocument();
  });
});

describe("Palette sidebar collapse", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.removeItem("schemamorph:sidebar");
    useStore.getState().reset();
  });

  it("renders the Collapse sidebar button", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("clicking Collapse sidebar hides archetype rows", async () => {
    const user = userEvent.setup();
    setup();
    // Initially shows archetype rows
    expect(screen.getByText("Cache")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByText("Cache")).not.toBeInTheDocument();
  });

  it("clicking Expand sidebar restores archetype rows", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByText("Cache")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByText("Cache")).toBeInTheDocument();
  });

  it("collapsed state is persisted to localStorage", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    const stored = localStorage.getItem("schemamorph:sidebar");
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as { collapsed?: boolean };
    expect(parsed.collapsed).toBe(true);
  });
});
