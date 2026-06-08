// src/components/mobile/DeleteBin.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DeleteBin } from "./DeleteBin";
import { useStore } from "@/state/store";

describe("DeleteBin", () => {
  beforeEach(() => useStore.getState().reset());

  it("renders nothing by default (not dragging)", () => {
    render(<DeleteBin />);
    expect(screen.queryByTestId("delete-bin")).toBeNull();
  });

  it("renders the bin when dragging is true", () => {
    useStore.getState().setDragging(true);
    render(<DeleteBin />);
    expect(screen.getByTestId("delete-bin")).toBeInTheDocument();
  });

  it("has no red style when not overBin", () => {
    useStore.getState().setDragging(true);
    render(<DeleteBin />);
    const bin = screen.getByTestId("delete-bin");
    // no red ring class
    expect(bin.className).not.toMatch(/ring-red/);
    expect(bin.className).not.toMatch(/bg-red/);
  });

  it("applies red ring/bg when overBin is true", () => {
    useStore.getState().setDragging(true);
    useStore.getState().setOverBin(true);
    render(<DeleteBin />);
    const bin = screen.getByTestId("delete-bin");
    // should have some red styling
    expect(bin.className).toMatch(/red/);
  });

  it("hides again when dragging resets to false", () => {
    useStore.getState().setDragging(true);
    const { rerender } = render(<DeleteBin />);
    expect(screen.getByTestId("delete-bin")).toBeInTheDocument();
    useStore.getState().setDragging(false);
    rerender(<DeleteBin />);
    expect(screen.queryByTestId("delete-bin")).toBeNull();
  });

  it("is positioned at bottom-right (bottom-6 right-4, no top-1/2 or -translate-y-1/2)", () => {
    useStore.getState().setDragging(true);
    render(<DeleteBin />);
    const bin = screen.getByTestId("delete-bin");
    expect(bin.className).toMatch(/right-4/);
    expect(bin.className).toMatch(/bottom-6/);
    expect(bin.className).not.toMatch(/top-1\/2/);
    expect(bin.className).not.toMatch(/-translate-y-1\/2/);
  });
});
