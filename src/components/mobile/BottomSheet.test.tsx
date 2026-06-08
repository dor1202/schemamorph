// src/components/mobile/BottomSheet.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders children and drag handle at given detent", () => {
    render(
      <BottomSheet detent="half" onDetentChange={() => {}}>
        <p>sheet content</p>
      </BottomSheet>,
    );
    expect(screen.getByText("sheet content")).toBeInTheDocument();
    expect(screen.getByTestId("sheet-handle")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-sheet").dataset.detent).toBe("half");
  });

  it("drag up past threshold promotes detent (peek → half)", () => {
    const onDetentChange = vi.fn();
    render(
      <BottomSheet detent="peek" onDetentChange={onDetentChange}>
        <p>x</p>
      </BottomSheet>,
    );
    const handle = screen.getByTestId("sheet-handle");
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 800, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 700, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 700, pointerId: 1 });
    expect(onDetentChange).toHaveBeenCalledWith("half");
  });

  it("drag down past threshold demotes detent (half → peek)", () => {
    const onDetentChange = vi.fn();
    render(
      <BottomSheet detent="half" onDetentChange={onDetentChange}>
        <p>x</p>
      </BottomSheet>,
    );
    const handle = screen.getByTestId("sheet-handle");
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 620, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 620, pointerId: 1 });
    expect(onDetentChange).toHaveBeenCalledWith("peek");
  });

  it("tap on handle expands from peek to half", () => {
    const onDetentChange = vi.fn();
    render(
      <BottomSheet detent="peek" onDetentChange={onDetentChange}>
        <p>x</p>
      </BottomSheet>,
    );
    const handle = screen.getByTestId("sheet-handle");
    handle.setPointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 800, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 803, pointerId: 1 });
    expect(onDetentChange).toHaveBeenCalledWith("half");
  });

  it("tap on handle collapses from half to peek", () => {
    const onDetentChange = vi.fn();
    render(
      <BottomSheet detent="half" onDetentChange={onDetentChange}>
        <p>x</p>
      </BottomSheet>,
    );
    const handle = screen.getByTestId("sheet-handle");
    handle.setPointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 500, pointerId: 1 });
    expect(onDetentChange).toHaveBeenCalledWith("peek");
  });

  it("tap from full collapses to peek", () => {
    const onDetentChange = vi.fn();
    render(
      <BottomSheet detent="full" onDetentChange={onDetentChange}>
        <p>x</p>
      </BottomSheet>,
    );
    const handle = screen.getByTestId("sheet-handle");
    handle.setPointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 205, pointerId: 1 });
    expect(onDetentChange).toHaveBeenCalledWith("peek");
  });

  it("honors heights override", () => {
    render(
      <BottomSheet
        detent="half"
        onDetentChange={() => {}}
        heights={{ half: "132px" }}
      >
        <p>x</p>
      </BottomSheet>,
    );
    expect(screen.getByTestId("bottom-sheet").style.height).toBe("132px");
  });
});
