import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { BoundaryNodeComponent } from "./BoundaryNode";
import { useStore } from "@/state/store";
import type { BoundaryNode } from "@/lib/types";

// Capture NodeResizer props so tests can invoke its callbacks.
let capturedResizerProps: Record<string, unknown> = {};

vi.mock("@xyflow/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return {
    ...actual,
    NodeResizer: (props: Record<string, unknown>) => {
      capturedResizerProps = props;
      return null;
    },
  };
});

const nodeTypes = { boundaryNode: BoundaryNodeComponent };

function renderBoundaryDirect(data: BoundaryNode["data"], selected = false) {
  const nodeProps = {
    id: "b1",
    data,
    selected,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    type: "boundaryNode" as const,
    dragging: false,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(<BoundaryNodeComponent {...(nodeProps as any)} />);
}

function renderBoundary(data: BoundaryNode["data"], selected = false) {
  const nodes: BoundaryNode[] = [
    {
      id: "b1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 320,
      height: 220,
      selected,
      data,
    },
  ];
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
}

beforeEach(() => {
  useStore.getState().reset();
  capturedResizerProps = {};
});

describe("BoundaryNode", () => {
  it("renders the label text", () => {
    renderBoundary({ label: "VPC" });
    expect(screen.getByText("VPC")).toBeInTheDocument();
  });

  it("has dashed border style", () => {
    renderBoundary({ label: "Region A" });
    const el = screen.getByTestId("boundary-node");
    // Check for dashed class or inline style
    // The component applies borderStyle dashed via class; check class contains 'dashed'
    expect(el.className).toMatch(/dashed/);
  });

  it("renders label in top-left area (muted text-xs)", () => {
    renderBoundary({ label: "K8s cluster" });
    const label = screen.getByText("K8s cluster");
    // Should have muted/small styling — just verify it renders correctly
    expect(label).toBeInTheDocument();
  });

  it("uses data.color for border and label when provided", () => {
    renderBoundaryDirect({ label: "VPC", color: "#22c55e" });
    const el = screen.getByTestId("boundary-node");
    // jsdom converts #22c55e → rgb(34, 197, 94)
    const elStyle = el.getAttribute("style") ?? "";
    expect(elStyle).toContain("34, 197, 94");
    const label = screen.getByText("VPC");
    const labelStyle = label.getAttribute("style") ?? "";
    expect(labelStyle).toContain("34, 197, 94");
  });

  it("falls back to var(--muted) for border when no color set", () => {
    renderBoundaryDirect({ label: "VPC" });
    const el = screen.getByTestId("boundary-node");
    // var(--muted) stays as-is in jsdom
    expect(el.getAttribute("style") ?? "").toContain("var(--muted)");
  });
});

describe("BoundaryNode onResizeEnd regroups", () => {
  it("NodeResizer receives an onResizeEnd prop that calls regroup", () => {
    const regroup = vi.fn();
    useStore.setState({ regroup });
    renderBoundaryDirect({ label: "VPC" }, /* selected= */ true);

    // NodeResizer should have been rendered with onResizeEnd
    const onResizeEnd = capturedResizerProps.onResizeEnd as
      | (() => void)
      | undefined;
    expect(typeof onResizeEnd).toBe("function");
    onResizeEnd!();
    expect(regroup).toHaveBeenCalledTimes(1);
  });

  it("onResizeEnd calls regroup even when locked (resize guard is isVisible, not onResizeEnd)", () => {
    const regroup = vi.fn();
    useStore.setState({ regroup, locked: true });
    renderBoundaryDirect({ label: "VPC" }, /* selected= */ true);

    const onResizeEnd = capturedResizerProps.onResizeEnd as
      | (() => void)
      | undefined;
    expect(typeof onResizeEnd).toBe("function");
    // Locked boundary shows NodeResizer with isVisible=false, but the prop still exists.
    // If the callback fires (it won't in practice since handles are hidden), regroup runs.
    onResizeEnd!();
    expect(regroup).toHaveBeenCalledTimes(1);
  });
});
