// src/components/mobile/PhoneTopBar.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { PhoneTopBar } from "./PhoneTopBar";
import { useStore } from "@/state/store";

const renderTopBar = () =>
  render(
    <ReactFlowProvider>
      <PhoneTopBar />
    </ReactFlowProvider>,
  );

describe("PhoneTopBar overflow menu", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("overflow menu has Minimap toggle and New canvas", () => {
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    expect(screen.getByLabelText("Toggle minimap")).toBeInTheDocument();
    expect(screen.getByLabelText("New canvas")).toBeInTheDocument();
  });

  it("New canvas confirms then resets", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    fireEvent.click(screen.getByLabelText("New canvas"));
    expect(useStore.getState().nodes).toHaveLength(0);
  });

  it("New canvas does nothing when user cancels confirm", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    fireEvent.click(screen.getByLabelText("New canvas"));
    expect(useStore.getState().nodes).toHaveLength(1);
  });

  it("Toggle minimap calls toggleMinimap in store", () => {
    const initialMinimap = useStore.getState().showMinimap;
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    fireEvent.click(screen.getByLabelText("Toggle minimap"));
    expect(useStore.getState().showMinimap).toBe(!initialMinimap);
  });

  // ── app-version display ──

  it("shows version string matching /v\\d+\\.\\d+\\.\\d+/ in overflow menu", () => {
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    expect(screen.getByTestId("app-version").textContent).toMatch(
      /v\d+\.\d+\.\d+/,
    );
  });

  // ── outside-tap / Escape close ──

  it("pointerdown on document.body closes the menu", () => {
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    expect(screen.getByLabelText("Toggle minimap")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText("Toggle minimap")).toBeNull();
  });

  it("pointerdown INSIDE the menu does NOT close it", () => {
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    const menu = screen.getByLabelText("Toggle minimap").closest("div")!;
    fireEvent.pointerDown(menu);
    expect(screen.getByLabelText("Toggle minimap")).toBeInTheDocument();
  });

  it("Escape key closes the menu", () => {
    renderTopBar();
    fireEvent.click(screen.getByLabelText("More"));
    expect(screen.getByLabelText("Toggle minimap")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByLabelText("Toggle minimap")).toBeNull();
  });
});
