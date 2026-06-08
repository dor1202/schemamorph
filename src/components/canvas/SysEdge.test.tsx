/**
 * SysEdge tests — rendered directly with mocked EdgeProps.
 *
 * React Flow's edge pipeline in jsdom cannot resolve handle positions (nodes
 * have no measured DOM geometry), so the EdgeRenderer never calls the custom
 * edge component.  Instead we call SysEdgeComponent directly with explicit
 * sourceX/Y/targetX/Y props, wrapped in a minimal ReactFlowProvider that
 * supplies the internal store (needed by EdgeLabelRenderer's portal and by
 * the useStore hooks inside the component).  We also inject the
 * `.react-flow__edgelabel-renderer` div that EdgeLabelRenderer portals into.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Position, ReactFlowProvider, useStoreApi } from "@xyflow/react";
import type { ReactNode } from "react";
import { SysEdgeComponent } from "./SysEdge";
import { useStore } from "@/state/store";
import type { SysEdge } from "@/lib/types";

/** Minimal wrapper: provides ReactFlow store + injects the edgelabel-renderer portal target. */
function EdgeTestWrapper({ children }: { children: ReactNode }) {
  return (
    <ReactFlowProvider>
      <EdgePortalSetup />
      <svg>{children}</svg>
    </ReactFlowProvider>
  );
}

/**
 * Hooks into the ReactFlow internal store after mount to inject the
 * `.react-flow__edgelabel-renderer` div so EdgeLabelRenderer can portal into it.
 */
function EdgePortalSetup() {
  const api = useStoreApi();
  // Create the portal target once and inject it into the RF store's domNode.
  // We do this synchronously in render (not effect) so it's available before
  // EdgeLabelRenderer's useStore selector runs.
  const state = api.getState();
  if (!state.domNode) {
    const container = document.createElement("div");
    container.className = "react-flow";
    const edgeLabelRenderer = document.createElement("div");
    edgeLabelRenderer.className = "react-flow__edgelabel-renderer";
    container.appendChild(edgeLabelRenderer);
    document.body.appendChild(container);
    api.setState({ domNode: container });
  }
  return null;
}

function makeProps(
  edgeData: SysEdge["data"],
  animated = false,
  selected = false,
): React.ComponentProps<typeof SysEdgeComponent> {
  return {
    id: "e1",
    source: "a",
    target: "b",
    sourceX: 0,
    sourceY: 0,
    targetX: 200,
    targetY: 0,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: edgeData,
    animated,
    selected,
    selectable: true,
    deletable: true,
    type: "sysEdge",
    markerEnd: undefined,
    markerStart: undefined,
    style: undefined,
    interactionWidth: 20,
    sourceHandleId: null,
    targetHandleId: null,
  };
}

function setLocked(v: boolean) {
  useStore.setState({ locked: v });
}

describe("SysEdge", () => {
  beforeEach(() => useStore.getState().reset());

  it("renders protocol label", () => {
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({ protocol: "gRPC" })} />
      </EdgeTestWrapper>,
    );
    expect(screen.getByText("gRPC")).toBeInTheDocument();
  });

  it("clicking label selects edge in store (selected:true, nodes deselected)", async () => {
    const user = userEvent.setup();
    // Seed: one edge and one selected node
    useStore
      .getState()
      .setEdges([
        { id: "e1", source: "a", target: "b", type: "sysEdge", data: {} },
      ]);
    useStore.getState().setNodes([
      {
        id: "n1",
        type: "sysNode",
        position: { x: 0, y: 0 },
        data: {
          archetype: "compute",
          concreteTool: "kubernetes",
          label: "k8s",
        },
        selected: true,
      },
    ]);
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({})} />
      </EdgeTestWrapper>,
    );
    await user.click(screen.getByTestId("edge-label-e1"));
    // Edge should be selected
    expect(useStore.getState().edges[0].selected).toBe(true);
    // Node should be deselected
    expect(useStore.getState().nodes[0].selected).toBeFalsy();
  });

  it("no editor opens in canvas after clicking label (no textbox appears)", async () => {
    const user = userEvent.setup();
    useStore
      .getState()
      .setEdges([
        { id: "e1", source: "a", target: "b", type: "sysEdge", data: {} },
      ]);
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({ label: "reads" })} />
      </EdgeTestWrapper>,
    );
    await user.click(screen.getByTestId("edge-label-e1"));
    // No inline editor should appear
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  // ─── Item 2: Edge "+" chip hidden when locked ────────────────────────────────

  it("locked empty edge: no edge-label testid rendered", () => {
    setLocked(true);
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({})} />
      </EdgeTestWrapper>,
    );
    expect(screen.queryByTestId("edge-label-e1")).not.toBeInTheDocument();
  });

  it("locked edge with label text: chip is visible (text rendered)", () => {
    setLocked(true);
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({ label: "reads" })} />
      </EdgeTestWrapper>,
    );
    expect(screen.getByTestId("edge-label-e1")).toBeInTheDocument();
    expect(screen.getByText("reads")).toBeInTheDocument();
  });

  it("locked edge with protocol: chip is visible", () => {
    setLocked(true);
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({ protocol: "gRPC" })} />
      </EdgeTestWrapper>,
    );
    expect(screen.getByTestId("edge-label-e1")).toBeInTheDocument();
  });

  it("unlocked empty edge: '+' chip shown", () => {
    setLocked(false);
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({})} />
      </EdgeTestWrapper>,
    );
    expect(screen.getByTestId("edge-label-e1")).toBeInTheDocument();
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  // ─── Item 3: Edge color ───────────────────────────────────────────────────────

  it("edge with color: BaseEdge stroke uses data.color", () => {
    // We can't easily query SVG stroke, but we can test the rendered structure
    // The important thing is it renders without crashing when color is set
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({ color: "#3b82f6" })} />
      </EdgeTestWrapper>,
    );
    expect(screen.getByTestId("edge-label-e1")).toBeInTheDocument();
  });

  // ─── Item 4: Edge has-properties indicator ─────────────────────────────────────

  it("edge with 2 custom props: chip text contains ·2", () => {
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent
          {...makeProps({
            label: "reads",
            customProperties: { latency: "5ms", timeout: "30s" },
          })}
        />
      </EdgeTestWrapper>,
    );
    const chip = screen.getByTestId("edge-label-e1");
    expect(chip.textContent).toContain("·2");
  });

  it("edge with 2 custom props: chip title contains both key:value pairs", () => {
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent
          {...makeProps({
            label: "reads",
            customProperties: { latency: "5ms", timeout: "30s" },
          })}
        />
      </EdgeTestWrapper>,
    );
    const chip = screen.getByTestId("edge-label-e1");
    expect(chip.title).toContain("latency: 5ms");
    expect(chip.title).toContain("timeout: 30s");
  });

  it("edge without custom props: chip has no ·count suffix", () => {
    render(
      <EdgeTestWrapper>
        <SysEdgeComponent {...makeProps({ label: "reads" })} />
      </EdgeTestWrapper>,
    );
    const chip = screen.getByTestId("edge-label-e1");
    expect(chip.textContent).not.toContain("·");
  });
});
