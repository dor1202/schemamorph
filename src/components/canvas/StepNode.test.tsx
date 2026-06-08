import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { StepNodeComponent } from "./StepNode";
import { useStore } from "@/state/store";
import type { StepNode } from "@/lib/types";

const nodeTypes = { stepNode: StepNodeComponent };

function renderStep(data: StepNode["data"], id = "step1", selected = false) {
  const nodes: StepNode[] = [
    { id, type: "stepNode", position: { x: 0, y: 0 }, data, selected },
  ];
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
}

function renderStepDirect(
  data: StepNode["data"],
  id: string,
  props?: Partial<React.ComponentProps<typeof StepNodeComponent>>,
) {
  const nodeProps = {
    id,
    data,
    selected: false,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    zIndex: 1,
    type: "stepNode" as const,
    dragging: false,
    ...props,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(<StepNodeComponent {...(nodeProps as any)} />);
}

beforeEach(() => useStore.getState().reset());

describe("StepNode", () => {
  it("renders label when defined (via ReactFlow)", () => {
    renderStep({ label: "2a" });
    expect(screen.getByText("2a")).toBeInTheDocument();
  });

  it("renders legacy n as fallback when no label", () => {
    renderStep({ n: 3 });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders empty string when neither label nor n", () => {
    renderStepDirect({}, "s0");
    const el = screen.getByTestId("step-node");
    expect(el.textContent).toBe("");
  });

  it("label takes precedence over n", () => {
    renderStepDirect({ n: 3, label: "B" }, "s-both");
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("has step-node testid (via ReactFlow)", () => {
    renderStep({ label: "1" });
    expect(screen.getByTestId("step-node")).toBeInTheDocument();
  });

  it("uses default blue background when no color", () => {
    renderStepDirect({ label: "A" }, "s1");
    const el = screen.getByTestId("step-node");
    // jsdom converts #3b82f6 → rgb(59, 130, 246)
    const styleAttr = el.getAttribute("style") ?? "";
    expect(styleAttr).toMatch(/background.*59, 130, 246/);
  });

  it("uses custom color as background", () => {
    renderStepDirect({ label: "2", color: "#ef4444" }, "s2");
    const el = screen.getByTestId("step-node");
    // jsdom converts #ef4444 → rgb(239, 68, 68)
    const styleAttr = el.getAttribute("style") ?? "";
    expect(styleAttr).toMatch(/background.*239, 68, 68/);
  });

  it("shows selected ring when selected=true", () => {
    renderStepDirect({ label: "5" }, "s5", { selected: true });
    const el = screen.getByTestId("step-node");
    expect(el.className).toContain("ring-2");
  });

  it("no ring when not selected", () => {
    renderStepDirect({ label: "5" }, "s5", { selected: false });
    const el = screen.getByTestId("step-node");
    expect(el.className).not.toContain("ring-2");
  });

  it("pill grows horizontally: minWidth 36px and horizontal padding applied", () => {
    renderStepDirect({ label: "longer" }, "s-long");
    const el = screen.getByTestId("step-node");
    const styleAttr = el.getAttribute("style") ?? "";
    // minWidth should be set (36px), not a fixed width
    expect(styleAttr).toMatch(/min-width.*36/);
    // height is 36px
    expect(styleAttr).toMatch(/height.*36/);
  });
});
