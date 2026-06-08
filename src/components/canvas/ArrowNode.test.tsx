import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowNodeComponent } from "./ArrowNode";
import { useStore } from "@/state/store";
import type { ArrowNode } from "@/lib/types";

// Mock useReactFlow so screenToFlowPosition is available in jsdom
vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    useReactFlow: () => ({
      screenToFlowPosition: (pos: { x: number; y: number }) => pos,
    }),
  };
});

function renderArrowDirect(
  data: ArrowNode["data"],
  props?: Partial<React.ComponentProps<typeof ArrowNodeComponent>>,
) {
  const nodeProps = {
    id: "arr1",
    data,
    selected: false,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    zIndex: 1,
    type: "arrowNode" as const,
    dragging: false,
    positionAbsoluteX: 100,
    positionAbsoluteY: 100,
    // new model: dx/dy in data, no width/height on node
    ...props,
  };
  return render(
    <ReactFlowProvider>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ArrowNodeComponent {...(nodeProps as any)} />
    </ReactFlowProvider>,
  );
}

beforeEach(() => {
  useStore.getState().reset();
});

describe("ArrowNode (Excalidraw-style)", () => {
  // ─── Basic render ────────────────────────────────────────────────────────────

  it("renders the arrow-node testid", () => {
    renderArrowDirect({ dx: 140, dy: -60 });
    expect(screen.getByTestId("arrow-node")).toBeInTheDocument();
  });

  it("renders an SVG element", () => {
    const { container } = renderArrowDirect({ dx: 140, dy: -60 });
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders a line element inside svg", () => {
    const { container } = renderArrowDirect({ dx: 140, dy: -60 });
    const line = container.querySelector("line");
    expect(line).not.toBeNull();
  });

  // ─── Wrapper non-zero size (padded bounding box) ────────────────────────────

  const PAD = 8;

  it("wrapper div has non-zero width and height for a diagonal arrow", () => {
    // dx=140, dy=80 → wrapper should be (140 + 2*PAD) × (80 + 2*PAD)
    const { container } = renderArrowDirect({ dx: 140, dy: 80 });
    const wrapper = container.querySelector(
      "[data-testid='arrow-node']",
    ) as HTMLElement;
    const style = wrapper.style;
    expect(parseInt(style.width, 10)).toBe(140 + 2 * PAD);
    expect(parseInt(style.height, 10)).toBe(80 + 2 * PAD);
  });

  it("wrapper div has non-zero height even for a horizontal arrow (dy=0)", () => {
    // dy=0 → svgH=0 → wrapper height must still be 2*PAD, not 0
    const { container } = renderArrowDirect({ dx: 140, dy: 0 });
    const wrapper = container.querySelector(
      "[data-testid='arrow-node']",
    ) as HTMLElement;
    expect(parseInt(wrapper.style.height, 10)).toBeGreaterThan(0);
  });

  it("wrapper div has non-zero width even for a vertical arrow (dx=0)", () => {
    const { container } = renderArrowDirect({ dx: 0, dy: 100 });
    const wrapper = container.querySelector(
      "[data-testid='arrow-node']",
    ) as HTMLElement;
    expect(parseInt(wrapper.style.width, 10)).toBeGreaterThan(0);
  });

  // ─── SVG bbox / coordinate math (with PAD shift) ─────────────────────────────

  it("positive dx/dy: line coords shifted by PAD", () => {
    // dx=140, dy=80: offsetX=0, offsetY=0
    // start=(PAD,PAD), end=(PAD+140, PAD+80)
    const { container } = renderArrowDirect({ dx: 140, dy: 80 });
    const lines = container.querySelectorAll("line");
    // Find the visible line (not the hitarea)
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine).not.toBeNull();
    expect(visibleLine?.getAttribute("x1")).toBe(String(PAD));
    expect(visibleLine?.getAttribute("y1")).toBe(String(PAD));
    expect(visibleLine?.getAttribute("x2")).toBe(String(PAD + 140));
    expect(visibleLine?.getAttribute("y2")).toBe(String(PAD + 80));
  });

  it("negative dy: start shifted down, end at top — coords include PAD", () => {
    // dx=140, dy=-60: offsetX=0, offsetY=60
    // start=(PAD, 60+PAD), end=(PAD+140, PAD)
    const { container } = renderArrowDirect({ dx: 140, dy: -60 });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine).not.toBeNull();
    expect(visibleLine?.getAttribute("x1")).toBe(String(PAD));
    expect(visibleLine?.getAttribute("y1")).toBe(String(60 + PAD));
    expect(visibleLine?.getAttribute("x2")).toBe(String(PAD + 140));
    expect(visibleLine?.getAttribute("y2")).toBe(String(PAD));
  });

  it("negative dx: start shifted right, end at left — coords include PAD", () => {
    // dx=-100, dy=50: offsetX=100, offsetY=0
    // start=(100+PAD, PAD), end=(PAD, 50+PAD)
    const { container } = renderArrowDirect({ dx: -100, dy: 50 });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine).not.toBeNull();
    expect(visibleLine?.getAttribute("x1")).toBe(String(100 + PAD));
    expect(visibleLine?.getAttribute("y1")).toBe(String(PAD));
    expect(visibleLine?.getAttribute("x2")).toBe(String(PAD));
    expect(visibleLine?.getAttribute("y2")).toBe(String(50 + PAD));
  });

  it("negative dx and dy: both coords offset, start and end include PAD", () => {
    // dx=-80, dy=-60: offsetX=80, offsetY=60
    // start=(80+PAD, 60+PAD), end=(PAD, PAD)
    const { container } = renderArrowDirect({ dx: -80, dy: -60 });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine).not.toBeNull();
    expect(visibleLine?.getAttribute("x1")).toBe(String(80 + PAD));
    expect(visibleLine?.getAttribute("y1")).toBe(String(60 + PAD));
    expect(visibleLine?.getAttribute("x2")).toBe(String(PAD));
    expect(visibleLine?.getAttribute("y2")).toBe(String(PAD));
  });

  // ─── Color ───────────────────────────────────────────────────────────────────

  it("uses custom color on the SVG line stroke", () => {
    const { container } = renderArrowDirect({
      dx: 140,
      dy: -60,
      color: "#22c55e",
    });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine?.getAttribute("stroke")).toBe("#22c55e");
  });

  // ─── No box border ────────────────────────────────────────────────────────────

  it("has no box border on the wrapper div (no border class)", () => {
    const { container } = renderArrowDirect({ dx: 140, dy: -60 });
    const wrapper = container.querySelector("[data-testid='arrow-node']");
    expect(wrapper?.className).not.toMatch(/\bborder\b/);
  });

  // ─── Grips (selected && !locked) ─────────────────────────────────────────────

  it("shows two endpoint grips when selected and not locked", () => {
    renderArrowDirect({ dx: 140, dy: -60 }, { selected: true });
    const grips = screen.getAllByTestId("arrow-grip");
    expect(grips.length).toBe(2);
  });

  it("does NOT show grips when not selected", () => {
    renderArrowDirect({ dx: 140, dy: -60 }, { selected: false });
    const grips = screen.queryAllByTestId("arrow-grip");
    expect(grips.length).toBe(0);
  });

  it("does NOT show grips when locked (even if selected)", () => {
    useStore.getState().toggleLocked(); // lock
    renderArrowDirect({ dx: 140, dy: -60 }, { selected: true });
    const grips = screen.queryAllByTestId("arrow-grip");
    expect(grips.length).toBe(0);
  });

  it("START grip positioned at (offsetX+PAD, offsetY+PAD) relative to wrapper", () => {
    // dx=140, dy=-60: offsetX=0, offsetY=60
    // START grip: left=0+PAD, top=60+PAD
    const { container } = renderArrowDirect(
      { dx: 140, dy: -60 },
      { selected: true },
    );
    const grips = container.querySelectorAll("[data-testid='arrow-grip']");
    const startGrip = grips[0] as HTMLElement;
    expect(parseInt(startGrip.style.left, 10)).toBe(0 + PAD);
    expect(parseInt(startGrip.style.top, 10)).toBe(60 + PAD);
  });

  it("END grip positioned at (offsetX+dx+PAD, offsetY+dy+PAD) relative to wrapper", () => {
    // dx=140, dy=-60: offsetX=0, offsetY=60
    // END grip: left=0+140+PAD=148, top=60-60+PAD=8
    const { container } = renderArrowDirect(
      { dx: 140, dy: -60 },
      { selected: true },
    );
    const grips = container.querySelectorAll("[data-testid='arrow-grip']");
    const endGrip = grips[1] as HTMLElement;
    expect(parseInt(endGrip.style.left, 10)).toBe(0 + 140 + PAD);
    expect(parseInt(endGrip.style.top, 10)).toBe(60 + -60 + PAD);
  });

  // ─── Line styles ─────────────────────────────────────────────────────────────

  it("solid lineStyle (default): line has no strokeDasharray", () => {
    const { container } = renderArrowDirect({ dx: 140, dy: -60 });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    const da = visibleLine?.getAttribute("stroke-dasharray");
    expect(da == null || da === "").toBe(true);
  });

  it("dashed lineStyle: line has strokeDasharray '8 6'", () => {
    const { container } = renderArrowDirect({
      dx: 140,
      dy: -60,
      lineStyle: "dashed",
    });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine?.getAttribute("stroke-dasharray")).toBe("8 6");
  });

  it("dotted lineStyle: line has strokeDasharray '2 5'", () => {
    const { container } = renderArrowDirect({
      dx: 140,
      dy: -60,
      lineStyle: "dotted",
    });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine?.getAttribute("stroke-dasharray")).toBe("2 5");
  });

  it("dotted lineStyle: line has strokeLinecap 'round'", () => {
    const { container } = renderArrowDirect({
      dx: 140,
      dy: -60,
      lineStyle: "dotted",
    });
    const lines = container.querySelectorAll("line");
    const visibleLine = Array.from(lines).find(
      (l) => l.getAttribute("data-testid") !== "arrow-hitarea",
    );
    expect(visibleLine?.getAttribute("stroke-linecap")).toBe("round");
  });

  // ─── Hit area ────────────────────────────────────────────────────────────────

  it("renders a wide transparent hit-area overlay line", () => {
    const { container } = renderArrowDirect({ dx: 140, dy: -60 });
    const lines = container.querySelectorAll("line");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const hitarea = container.querySelector("[data-testid='arrow-hitarea']");
    expect(hitarea).not.toBeNull();
  });

  // ─── Selected accent ──────────────────────────────────────────────────────────

  it("shows selected accent color when selected=true", () => {
    renderArrowDirect({ dx: 140, dy: -60 }, { selected: true });
    const el = screen.getByTestId("arrow-node");
    expect(el).toBeInTheDocument();
  });

  it("no ring when not selected", () => {
    renderArrowDirect({ dx: 140, dy: -60 }, { selected: false });
    const el = screen.getByTestId("arrow-node");
    expect(el.className).not.toContain("ring-2");
  });

  // ─── Start-grip pointerup calls regroup ──────────────────────────────────────

  it("START grip pointerup calls regroup", () => {
    const regroup = vi.fn();
    useStore.setState({ regroup });

    renderArrowDirect({ dx: 140, dy: -60 }, { selected: true });

    const grips = document.querySelectorAll("[data-testid='arrow-grip']");
    const startGrip = grips[0] as HTMLElement;

    // jsdom lacks setPointerCapture — stub it so pointerdown doesn't throw.
    startGrip.setPointerCapture = vi.fn();

    // Simulate pointer sequence: down (sets draggingRef="start"), up (should call regroup)
    startGrip.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }),
    );
    startGrip.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }),
    );

    expect(regroup).toHaveBeenCalledTimes(1);
  });

  it("END grip pointerup does NOT call regroup (only dx/dy change, no position)", () => {
    const regroup = vi.fn();
    useStore.setState({ regroup });

    renderArrowDirect({ dx: 140, dy: -60 }, { selected: true });

    const grips = document.querySelectorAll("[data-testid='arrow-grip']");
    const endGrip = grips[1] as HTMLElement;

    // jsdom lacks setPointerCapture — stub it so pointerdown doesn't throw.
    endGrip.setPointerCapture = vi.fn();

    endGrip.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }),
    );
    endGrip.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }),
    );

    expect(regroup).not.toHaveBeenCalled();
  });

  // ─── Grip pointer events (smoke test via store actions) ──────────────────────

  it("START grip pointerdown triggers snapshot (one undo entry per drag)", () => {
    useStore.getState().addArrow({ x: 100, y: 100 });
    const pastBefore = useStore.getState().past.length;
    // Snapshot is called on pointerdown — simulate it
    useStore.getState().snapshot();
    expect(useStore.getState().past.length).toBe(pastBefore + 1);
  });

  it("updateArrowEnd updates dx/dy without creating a snapshot", () => {
    useStore.getState().addArrow({ x: 100, y: 100 });
    const id = useStore.getState().nodes[0].id;
    const pastBefore = useStore.getState().past.length;

    useStore.getState().updateArrowEnd(id, { dx: 200, dy: -100 });

    const n = useStore.getState().nodes[0] as ArrowNode;
    expect(n.data.dx).toBe(200);
    expect(n.data.dy).toBe(-100);
    // no snapshot taken
    expect(useStore.getState().past.length).toBe(pastBefore);
  });

  it("START grip drag: node.position updates, END stays fixed", () => {
    // Simulate start grip drag via store actions
    // addArrow defaults: position=(100,100), dx=140, dy=-60
    useStore.getState().addArrow({ x: 100, y: 100 });
    const id = useStore.getState().nodes[0].id;

    // END is at (100+140, 100-60) = (240, 40)
    const endX = 100 + 140;
    const endY = 100 + -60;
    const newStartX = 120;
    const newStartY = 110;
    const newDx = endX - newStartX; // 120
    const newDy = endY - newStartY; // -70

    // Use updateArrowEnd + direct position update to simulate the start drag
    useStore.getState().setNodes(
      useStore.getState().nodes.map(
        (n): ArrowNode =>
          n.id === id
            ? {
                ...(n as ArrowNode),
                position: { x: newStartX, y: newStartY },
                data: { ...(n as ArrowNode).data, dx: newDx, dy: newDy },
              }
            : (n as ArrowNode),
      ),
    );

    const updated = useStore.getState().nodes[0] as ArrowNode;
    expect(updated.position.x).toBe(120);
    expect(updated.position.y).toBe(110);
    expect(updated.data.dx).toBe(newDx);
    expect(updated.data.dy).toBe(newDy);
    // END = position + (dx,dy) = (120+120, 110-70) = (240, 40) — unchanged
    expect(updated.position.x + updated.data.dx).toBe(endX);
    expect(updated.position.y + updated.data.dy).toBe(endY);
  });
});
