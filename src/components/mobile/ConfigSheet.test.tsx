// src/components/mobile/ConfigSheet.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfigSheet } from "./ConfigSheet";
import { useStore } from "@/state/store";

describe("ConfigSheet", () => {
  beforeEach(() => useStore.getState().reset());

  it("renders nothing without a selection", () => {
    render(<ConfigSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });

  it("opens with the node editor when a node is selected", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument();
    expect(screen.getByTestId("config-panel")).toBeInTheDocument();
  });

  it("editing inside the sheet writes to the store (step label)", () => {
    useStore.getState().addStep({ x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    const input = screen.getByLabelText("Step label");
    fireEvent.change(input, { target: { value: "2a" } });
    fireEvent.blur(input);
    const step = useStore.getState().nodes[0];
    expect(step.type === "stepNode" && step.data.label).toBe("2a");
  });

  it("no Close button renders (pane tap deselects via RF)", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("renders nothing when locked even with selection", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      locked: true,
    });
    render(<ConfigSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });

  // Regression: touch-action:none must NOT be on the sheet root — it blocks native
  // <select> / input pickers on mobile. It belongs only on the drag handle.
  it("bottom-sheet root does not have touchAction:none (would block mobile form inputs)", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    const sheet = screen.getByTestId("bottom-sheet");
    expect(sheet.style.touchAction).not.toBe("none");
  });

  it("drag handle has touchAction:none so pointer capture drag works", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);
    const handle = screen.getByTestId("sheet-handle");
    expect(handle.style.touchAction).toBe("none");
  });

  // ── panelSuppressed: drag must not open the sheet ──

  it("node selected + panelSuppressed=true → no sheet shown", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      panelSuppressed: true,
    });
    render(<ConfigSheet />);
    expect(screen.queryByTestId("bottom-sheet")).toBeNull();
  });

  it("edge selected + panelSuppressed=true → sheet still shown (desktop parity)", () => {
    useStore.getState().addNode("gateway", "nginx", { x: 0, y: 0 });
    useStore.getState().addNode("database", "mysql", { x: 100, y: 0 });
    const [a, b] = useStore.getState().nodes.map((n) => n.id);
    useStore
      .getState()
      .setEdges([
        { id: "e1", source: a, target: b, type: "sysEdge", data: {} },
      ]);
    useStore.setState({
      edges: useStore.getState().edges.map((e) => ({ ...e, selected: true })),
      panelSuppressed: true,
    });
    render(<ConfigSheet />);
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument();
  });

  it("node selected + panelSuppressed=false → sheet shown normally", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      panelSuppressed: false,
    });
    render(<ConfigSheet />);
    expect(screen.getByTestId("bottom-sheet")).toBeInTheDocument();
  });

  // Regression: attribute pins (enum/number/text/boolean typed fields defined per
  // archetype) must be committable via the sheet.  The "database" archetype has a
  // "replication" enum attribute.  Workflow: type the attr key into "Add attribute"
  // → pending PinEditor (select) appears → change select → store updated.
  it("adding and editing an enum attribute pin writes to the store", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    useStore.setState({
      nodes: useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
    });
    render(<ConfigSheet />);

    // Step 1: type the attribute key into the "Add attribute" input to get the
    // pending PinEditor to appear (handleAddPinChange sets pendingAttrKey when
    // the value matches a known attr key exactly).
    const addInput = screen.getByLabelText("Add attribute");
    fireEvent.change(addInput, { target: { value: "replication" } });

    // Step 2: the pending PinEditor for "replication" (enum) should be visible
    // as a <select> with aria-label "Replication".
    const pinSelect = screen.getByRole("combobox", { name: "Replication" });
    expect(pinSelect).toBeInTheDocument();

    // Step 3: change the select — for enum+boolean PinEditor, onChange immediately
    // calls updateNodeData AND commits (setPendingAttrKey(null)).
    fireEvent.change(pinSelect, { target: { value: "primary-replica" } });

    // Step 4: assert the store now has the attribute value set.
    const node = useStore.getState().nodes[0];
    expect(
      node.type === "sysNode" &&
        node.data.customProperties?.["replication"] === "primary-replica",
    ).toBe(true);
  });
});
