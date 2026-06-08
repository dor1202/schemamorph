// src/components/mobile/PaletteSheet.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaletteSheet } from "./PaletteSheet";
import { useStore } from "@/state/store";
import type { AppNode } from "@/lib/types";

describe("PaletteSheet", () => {
  beforeEach(() => useStore.getState().reset());

  // ── real-mode tests (existing behavior, now scoped to viewMode:"real") ──

  it("real mode: renders archetype chips and arms a tool on tap", () => {
    useStore.setState({ viewMode: "real" });
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    // expanding a chip shows its tools; tap the default tool entry
    fireEvent.click(screen.getByRole("button", { name: /PostgreSQL/ }));
    expect(useStore.getState().armedTool).toEqual({
      kind: "tool",
      archetype: "database",
      tool: "postgresql",
    });
  });

  it("real mode: tapping the armed tool again disarms", () => {
    useStore.setState({ viewMode: "real" });
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    const pg = screen.getByRole("button", { name: /PostgreSQL/ });
    fireEvent.click(pg);
    fireEvent.click(pg);
    expect(useStore.getState().armedTool).toBeNull();
  });

  it("arms annotation tools", () => {
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(useStore.getState().armedTool).toEqual({ kind: "note" });
  });

  it("search filters tools (real mode searches tool labels)", () => {
    useStore.setState({ viewMode: "real" });
    render(<PaletteSheet />);
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "postgre" },
    });
    expect(
      screen.getByRole("button", { name: /PostgreSQL/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kafka/ })).toBeNull();
  });

  it("renders nothing when locked", () => {
    useStore.setState({ locked: true });
    render(<PaletteSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });

  it("stays visible while a selection exists (ConfigSheet covers it)", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore
        .getState()
        .nodes.map((n: AppNode) => ({ ...n, selected: true })),
    });
    render(<PaletteSheet />);
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument();
  });

  it("hides while dragging", () => {
    useStore.getState().setDragging(true);
    render(<PaletteSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });

  it("arming a tool exits marquee select mode", () => {
    useStore.getState().setTouchSelectMode(true);
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(useStore.getState().touchSelectMode).toBe(false);
  });

  it("real mode keeps grid flow and default heights", () => {
    useStore.setState({ viewMode: "real" });
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    expect(
      screen.getByRole("button", { name: /PostgreSQL/ }),
    ).toBeInTheDocument();
    const sheet = screen.getByTestId("bottom-sheet");
    expect(sheet.style.height).toBe("45vh"); // default half (chip tap promotes peek→half)
  });

  // ── minimalist-mode tests (new behavior) ──

  it("minimalist: archetype chip arms its defaultTool directly", () => {
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    expect(useStore.getState().armedTool).toEqual({
      kind: "tool",
      archetype: "database",
      tool: "postgresql",
    });
  });

  it("minimalist: tapping armed archetype chip disarms", () => {
    render(<PaletteSheet />);
    const chip = screen.getByRole("button", { name: "Database" });
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(useStore.getState().armedTool).toBeNull();
  });

  it("minimalist: no tool grid is shown", () => {
    render(<PaletteSheet />);
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    expect(screen.queryByRole("button", { name: /PostgreSQL/ })).toBeNull();
  });

  it("minimalist: compact sheet heights", () => {
    render(<PaletteSheet />);
    // sheet uses compact half height when interacting
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    const sheet = screen.getByTestId("bottom-sheet");
    expect(["56px", "132px"]).toContain(sheet.style.height);
  });

  it("minimalist: search matches archetype labels", () => {
    render(<PaletteSheet />);
    fireEvent.change(screen.getByPlaceholderText("Search"), {
      target: { value: "data" },
    });
    expect(
      screen.getByRole("button", { name: "Database" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Queue" })).toBeNull();
  });

  // ── outside-tap collapse ──

  it("outside pointerdown when detent is not peek collapses sheet back to peek", () => {
    useStore.setState({ viewMode: "real" });
    render(<PaletteSheet />);
    // Promote to half by clicking a chip
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    const sheet = screen.getByTestId("bottom-sheet");
    expect(sheet.style.height).toBe("45vh"); // detent=half

    // Tap outside the sheet
    fireEvent.pointerDown(document.body);
    // Sheet should collapse to peek
    expect(sheet.style.height).toBe("56px"); // detent=peek
  });

  it("outside tap while already at peek does not change anything", () => {
    render(<PaletteSheet />);
    const sheet = screen.getByTestId("bottom-sheet");
    expect(sheet.style.height).toBe("56px"); // starts at peek

    fireEvent.pointerDown(document.body);
    // Still peek
    expect(sheet.style.height).toBe("56px");
  });

  it("tap inside the sheet does NOT collapse it", () => {
    useStore.setState({ viewMode: "real" });
    render(<PaletteSheet />);
    // Promote to half
    fireEvent.click(screen.getByRole("button", { name: "Database" }));
    const sheet = screen.getByTestId("bottom-sheet");
    expect(sheet.style.height).toBe("45vh");

    // Tap inside the sheet itself
    fireEvent.pointerDown(sheet);
    expect(sheet.style.height).toBe("45vh"); // unchanged
  });
});
