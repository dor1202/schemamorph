import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./Canvas";
import { useStore } from "@/state/store";
import type { BoundaryNode, SysNode } from "@/lib/types";

const setMockMedia = (globalThis as Record<string, unknown>)
  .setMockMedia as (next: { width?: number; coarse?: boolean }) => void;

// Capture ReactFlow props so tests can invoke handler callbacks directly.
let capturedProps: Record<string, unknown> = {};

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  // Wrap the real ReactFlow so we can capture its props while still rendering.
  const RealReactFlow = actual.ReactFlow as React.ComponentType<
    Record<string, unknown>
  >;
  return {
    ...actual,
    ReactFlow: (props: Record<string, unknown>) => {
      capturedProps = props;
      return <RealReactFlow {...props} />;
    },
  };
});

import React from "react";

const setup = () =>
  render(
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
  capturedProps = {};
  // Ensure showMinimap is false between tests
  if (useStore.getState().showMinimap) {
    useStore.getState().toggleMinimap();
  }
});

describe("Canvas Controls", () => {
  it("does not render the stock react-flow__controls element", () => {
    setup();
    const controls = document.querySelector(".react-flow__controls");
    expect(controls).toBeNull();
  });

  it("hides CanvasControls on coarse pointer", () => {
    setMockMedia({ coarse: true });
    setup();
    expect(screen.queryByLabelText("Zoom in")).toBeNull();
  });

  it("shows CanvasControls on fine pointer", () => {
    setMockMedia({ coarse: false });
    setup();
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
  });
});

describe("Canvas onNodeDragStop", () => {
  it("regroups when onNodeDragStop fires and unlocked", () => {
    setup();
    // Seed store: boundary at (0,0) 320×220, then add sysNode at absolute (100,100)
    // Use setAll for the boundary (absolute positions), then add a sysNode without setAll
    const boundary: BoundaryNode = {
      id: "b1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 320,
      height: 220,
      zIndex: -1,
      data: { label: "Test" },
    };
    useStore.getState().setAll([boundary], []);
    // Add a sysNode without triggering setAll (which would call applyGrouping/regroup).
    // We set it directly so parentId is NOT set yet.
    const sysNode: SysNode = {
      id: "n1",
      type: "sysNode",
      position: { x: 100, y: 100 },
      data: { archetype: "compute", concreteTool: "service", label: "Service" },
    };
    useStore.setState({ nodes: [boundary, sysNode] });

    // Confirm no parentId yet
    const before = useStore.getState().nodes.find((n) => n.id === "n1");
    expect(before?.parentId).toBeUndefined();

    // Invoke captured handler
    const onNodeDragStop = capturedProps.onNodeDragStop as () => void;
    expect(typeof onNodeDragStop).toBe("function");
    onNodeDragStop();

    // After regroup, sysNode center (100+90, 100+30) = (190,130) is inside boundary (0,0,320,220)
    const after = useStore.getState().nodes.find((n) => n.id === "n1");
    expect(after?.parentId).toBe("b1");
  });

  it("does NOT regroup when locked", () => {
    useStore.setState({ locked: true });
    setup();

    const boundary: BoundaryNode = {
      id: "b1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 320,
      height: 220,
      zIndex: -1,
      data: { label: "Test" },
    };
    const sysNode: SysNode = {
      id: "n1",
      type: "sysNode",
      position: { x: 100, y: 100 },
      data: { archetype: "compute", concreteTool: "service", label: "Service" },
    };
    useStore.setState({ nodes: [boundary, sysNode], locked: true });

    const onNodeDragStop = capturedProps.onNodeDragStop as () => void;
    expect(typeof onNodeDragStop).toBe("function");
    onNodeDragStop();

    // Should NOT have regrouped (parentId remains undefined)
    const after = useStore.getState().nodes.find((n) => n.id === "n1");
    expect(after?.parentId).toBeUndefined();
  });
});

describe("Canvas MiniMap", () => {
  it("does not render MiniMap by default (showMinimap=false)", () => {
    setup();
    expect(useStore.getState().showMinimap).toBe(false);
    // React Flow MiniMap renders with class react-flow__minimap
    const minimap = document.querySelector(".react-flow__minimap");
    expect(minimap).toBeNull();
  });

  it("renders MiniMap when showMinimap is true", () => {
    useStore.getState().toggleMinimap();
    expect(useStore.getState().showMinimap).toBe(true);
    setup();
    const minimap = document.querySelector(".react-flow__minimap");
    expect(minimap).not.toBeNull();
  });
});

describe("coarse-pointer canvas behavior", () => {
  afterEach(() => {
    setMockMedia({ coarse: false, width: 1280 });
    useStore.getState().reset();
    capturedProps = {};
  });

  it("coarse pointer: one-finger pan, no selection drag", () => {
    setMockMedia({ coarse: true });
    setup();
    expect(capturedProps.panOnDrag).toBe(true);
    expect(capturedProps.selectionOnDrag).toBe(false);
  });

  it("fine pointer keeps desktop props", () => {
    setMockMedia({ coarse: false });
    setup();
    expect(capturedProps.panOnDrag).toEqual([1, 2]);
    expect(capturedProps.selectionOnDrag).toBe(true);
  });

  it("touchSelectMode flips to marquee and exits after one selection", () => {
    setMockMedia({ coarse: true });
    useStore.getState().setTouchSelectMode(true);
    setup();
    expect(capturedProps.selectionOnDrag).toBe(true);
    expect(capturedProps.panOnDrag).toBe(false);
    (capturedProps.onSelectionEnd as (() => void) | undefined)?.();
    expect(useStore.getState().touchSelectMode).toBe(false);
  });

  it("armed tool places node on pane click and disarms", () => {
    setMockMedia({ coarse: true });
    useStore
      .getState()
      .armTool({ kind: "tool", archetype: "database", tool: "postgresql" });
    setup();
    (
      capturedProps.onPaneClick as
        | ((e: { clientX: number; clientY: number }) => void)
        | undefined
    )?.({ clientX: 100, clientY: 100 });
    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().armedTool).toBeNull();
  });

  it("disables pane pan while dragging a node (coarse)", () => {
    setMockMedia({ coarse: true });
    useStore.getState().setDragging(true);
    setup();
    expect(capturedProps.panOnDrag).toBe(false);
  });

  it("coarse pointer not dragging: one-finger pan still active", () => {
    setMockMedia({ coarse: true });
    useStore.getState().setDragging(false);
    setup();
    expect(capturedProps.panOnDrag).toBe(true);
  });

  it("armed tool ignored when locked", () => {
    useStore.setState({ locked: true });
    useStore.getState().armTool({ kind: "step" });
    setup();
    (
      capturedProps.onPaneClick as
        | ((e: { clientX: number; clientY: number }) => void)
        | undefined
    )?.({ clientX: 50, clientY: 50 });
    expect(useStore.getState().nodes).toHaveLength(0);
  });
});

describe("drag-to-bin: Canvas wiring", () => {
  afterEach(() => {
    setMockMedia({ coarse: false, width: 1280 });
    useStore.getState().reset();
    capturedProps = {};
    vi.restoreAllMocks();
  });

  it("onNodeDragStart sets dragging=true when unlocked (coarse)", () => {
    setMockMedia({ coarse: true });
    setup();
    const onNodeDragStart = capturedProps.onNodeDragStart as
      | (() => void)
      | undefined;
    expect(typeof onNodeDragStart).toBe("function");
    onNodeDragStart!();
    expect(useStore.getState().dragging).toBe(true);
  });

  it("onNodeDragStart does NOT set dragging when locked", () => {
    setMockMedia({ coarse: true });
    useStore.setState({ locked: true });
    setup();
    const onNodeDragStart = capturedProps.onNodeDragStart as
      | (() => void)
      | undefined;
    onNodeDragStart!();
    expect(useStore.getState().dragging).toBe(false);
  });

  it("onNodeDrag sets overBin=true when pointer is inside bin rect (coarse)", () => {
    setMockMedia({ coarse: true });
    // Fake the delete-bin element with a rect that contains (200, 730)
    vi.spyOn(document, "getElementById").mockReturnValue({
      getBoundingClientRect: () => ({
        left: 150,
        right: 250,
        top: 700,
        bottom: 760,
      }),
    } as HTMLElement);
    setup();
    const onNodeDrag = capturedProps.onNodeDrag as
      | ((event: MouseEvent) => void)
      | undefined;
    expect(typeof onNodeDrag).toBe("function");
    onNodeDrag!({ clientX: 200, clientY: 730 } as MouseEvent);
    expect(useStore.getState().overBin).toBe(true);
  });

  it("onNodeDrag sets overBin=false when pointer outside bin rect (coarse)", () => {
    setMockMedia({ coarse: true });
    useStore.getState().setOverBin(true);
    vi.spyOn(document, "getElementById").mockReturnValue({
      getBoundingClientRect: () => ({
        left: 150,
        right: 250,
        top: 700,
        bottom: 760,
      }),
    } as HTMLElement);
    setup();
    const onNodeDrag = capturedProps.onNodeDrag as
      | ((event: MouseEvent) => void)
      | undefined;
    onNodeDrag!({ clientX: 50, clientY: 50 } as MouseEvent);
    expect(useStore.getState().overBin).toBe(false);
  });

  it("onNodeDragStop over bin: deletes node + clears dragging/overBin, skips regroup (coarse)", () => {
    setMockMedia({ coarse: true });
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    const nodeId = useStore.getState().nodes[0].id;
    useStore.setState({ dragging: true, overBin: true });
    // Fake bin rect containing (200, 730)
    vi.spyOn(document, "getElementById").mockReturnValue({
      getBoundingClientRect: () => ({
        left: 150,
        right: 250,
        top: 700,
        bottom: 760,
      }),
    } as HTMLElement);
    setup();
    const onNodeDragStop = capturedProps.onNodeDragStop as
      | ((event: MouseEvent, node: { id: string }) => void)
      | undefined;
    expect(typeof onNodeDragStop).toBe("function");
    onNodeDragStop!({ clientX: 200, clientY: 730 } as MouseEvent, {
      id: nodeId,
    });
    // Node deleted
    expect(useStore.getState().nodes).toHaveLength(0);
    // Transient flags cleared
    expect(useStore.getState().dragging).toBe(false);
    expect(useStore.getState().overBin).toBe(false);
  });

  it("onNodeDragStop NOT over bin: keeps node + clears dragging/overBin + regroups (coarse)", () => {
    setMockMedia({ coarse: true });
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    const nodeId = useStore.getState().nodes[0].id;
    useStore.setState({ dragging: true, overBin: false });
    vi.spyOn(document, "getElementById").mockReturnValue({
      getBoundingClientRect: () => ({
        left: 150,
        right: 250,
        top: 700,
        bottom: 760,
      }),
    } as HTMLElement);
    setup();
    const onNodeDragStop = capturedProps.onNodeDragStop as
      | ((event: MouseEvent, node: { id: string }) => void)
      | undefined;
    // Pointer is outside the bin rect
    onNodeDragStop!({ clientX: 50, clientY: 50 } as MouseEvent, { id: nodeId });
    // Node kept
    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().dragging).toBe(false);
    expect(useStore.getState().overBin).toBe(false);
  });
});
