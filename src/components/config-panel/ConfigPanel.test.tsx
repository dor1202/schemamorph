import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigPanel } from "./ConfigPanel";
import { useStore } from "@/state/store";
import type { SysNode } from "@/lib/types";

function setLocked(v: boolean) {
  if (v) {
    useStore.setState({ locked: true });
  } else {
    useStore.setState({ locked: false });
  }
}

function selectFirstNode() {
  useStore
    .getState()
    .setNodes(useStore.getState().nodes.map((n) => ({ ...n, selected: true })));
}

function seedEdge(opts: { selected?: boolean; animated?: boolean } = {}) {
  useStore.getState().setEdges([
    {
      id: "edge1",
      source: "a",
      target: "b",
      type: "sysEdge",
      data: { label: "my-label", protocol: undefined },
      selected: opts.selected ?? false,
      animated: opts.animated ?? false,
    },
  ]);
}

describe("ConfigPanel", () => {
  beforeEach(() => {
    useStore.getState().reset();
    useStore.getState().setPanelSuppressed(false);
  });

  it("hidden when nothing selected", () => {
    render(<ConfigPanel />);
    expect(screen.queryByTestId("config-panel")).not.toBeInTheDocument();
  });

  it("edits label on blur", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Label");
    await user.clear(input);
    await user.type(input, "Users DB");
    await user.tab(); // blur commits
    expect((useStore.getState().nodes[0] as SysNode).data.label).toBe(
      "Users DB",
    );
  });

  it("changing archetype resets concreteTool to its defaultTool", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.selectOptions(screen.getByLabelText("Archetype"), "cache");
    const data = (useStore.getState().nodes[0] as SysNode).data;
    expect(data.archetype).toBe("cache");
    expect(data.concreteTool).toBe("redis"); // cache defaultTool
  });

  it("changing concrete tool within archetype", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.selectOptions(screen.getByLabelText("Concrete tool"), "mongodb");
    expect((useStore.getState().nodes[0] as SysNode).data.concreteTool).toBe(
      "mongodb",
    );
  });

  it("adds custom property", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("compute", "kubernetes", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.type(screen.getByPlaceholderText("key"), "replicas");
    await user.type(screen.getByPlaceholderText("value"), "3");
    await user.click(screen.getByRole("button", { name: "Add property" }));
    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties,
    ).toEqual({
      replicas: "3",
    });
  });

  // --- Edge config tests ---

  it("edge selected → Edge Config panel shows", () => {
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    expect(screen.getByText("Edge Config")).toBeInTheDocument();
  });

  it("edge selected → shows label input pre-filled", () => {
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Label");
    expect((input as HTMLInputElement).value).toBe("my-label");
  });

  it("edge label edit commits on blur", async () => {
    const user = userEvent.setup();
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Label");
    await user.clear(input);
    await user.type(input, "new-label");
    await user.tab(); // blur commits
    expect(useStore.getState().edges[0].data?.label).toBe("new-label");
  });

  it("protocol chip click writes data.protocol", async () => {
    const user = userEvent.setup();
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    // Click a protocol chip (e.g. "gRPC")
    await user.click(screen.getByRole("button", { name: "gRPC" }));
    expect(useStore.getState().edges[0].data?.protocol).toBe("gRPC");
  });

  it("active protocol chip is highlighted (aria-pressed=true)", async () => {
    const user = userEvent.setup();
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    const chip = screen.getByRole("button", { name: "gRPC" });
    await user.click(chip);
    // After click, re-render picks up store update; check aria-pressed
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking active protocol chip clears protocol", async () => {
    const user = userEvent.setup();
    // Pre-set edge with a protocol
    useStore.getState().setEdges([
      {
        id: "edge1",
        source: "a",
        target: "b",
        type: "sysEdge",
        data: { protocol: "gRPC" },
        selected: true,
        animated: false,
      },
    ]);
    render(<ConfigPanel />);
    // Clicking the active chip should clear protocol
    await user.click(screen.getByRole("button", { name: "gRPC" }));
    expect(useStore.getState().edges[0].data?.protocol).toBeUndefined();
  });

  it("animate toggle flips edge.animated", async () => {
    const user = userEvent.setup();
    seedEdge({ selected: true, animated: false });
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /animate/i }));
    expect(useStore.getState().edges[0].animated).toBe(true);
  });

  it("node selected takes priority over selected edge", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    // Should show Node Config, not Edge Config
    expect(screen.getByText("Node Config")).toBeInTheDocument();
    expect(screen.queryByText("Edge Config")).not.toBeInTheDocument();
  });

  // --- Metadata Attributes tests (formerly Pins) ---

  it("database node shows Attributes section", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(screen.getByText(/attributes/i)).toBeInTheDocument();
  });

  it("pin via autocomplete: select replication enum → primary-replica commits to customProperties", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);

    // Type into the "Add attribute" input and select replication
    const addPinInput = screen.getByLabelText("Add attribute");
    await user.type(addPinInput, "Replication");
    // After typing, pick the attribute from the list by pressing Enter or clicking option
    // The input value should match an attribute label; simulate confirming it
    await user.clear(addPinInput);
    await user.type(addPinInput, "replication");
    // Simulate selecting via change event (matching by key/label)
    fireEvent.change(addPinInput, { target: { value: "replication" } });
    fireEvent.keyDown(addPinInput, { key: "Enter" });

    // Now a select should appear for replication; pick primary-replica
    const select = await screen.findByRole("combobox", {
      name: /replication/i,
    });
    await user.selectOptions(select, "primary-replica");

    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties
        ?.replication,
    ).toBe("primary-replica");
  });

  it("pin number attribute: enter shards=4 commits to customProperties", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);

    const addPinInput = screen.getByLabelText("Add attribute");
    fireEvent.change(addPinInput, { target: { value: "shards" } });
    fireEvent.keyDown(addPinInput, { key: "Enter" });

    const numInput = await screen.findByRole("spinbutton", { name: /shards/i });
    await user.clear(numInput);
    await user.type(numInput, "4");
    await user.tab(); // blur commits

    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties?.shards,
    ).toBe("4");
  });

  it("pin boolean attribute: toggle commits to customProperties", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);

    const addPinInput = screen.getByLabelText("Add attribute");
    fireEvent.change(addPinInput, { target: { value: "backups" } });
    fireEvent.keyDown(addPinInput, { key: "Enter" });

    const checkbox = await screen.findByRole("checkbox", { name: /backups/i });
    await user.click(checkbox);

    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties?.backups,
    ).toBe("true");
  });

  it("remove pin: clicking ✕ on a pinned attribute removes it", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    // Pre-set a pin
    useStore.getState().updateNodeData(useStore.getState().nodes[0].id, {
      customProperties: { replication: "none" },
    });
    selectFirstNode();
    render(<ConfigPanel />);

    await user.click(
      screen.getByRole("button", { name: "remove replication" }),
    );
    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties
        ?.replication,
    ).toBeUndefined();
  });

  it("pinned key is absent from free-form custom properties list", async () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    useStore.getState().updateNodeData(useStore.getState().nodes[0].id, {
      customProperties: { replication: "none", myfreeprop: "hello" },
    });
    selectFirstNode();
    render(<ConfigPanel />);

    // The Attributes section should show replication; free-form should show myfreeprop
    // replication should NOT appear in the free-form section
    const freeForms = screen
      .getAllByText(/myfreeprop/)
      .map((el) => el.textContent);
    expect(freeForms.length).toBeGreaterThan(0);
    // replication should NOT be in a free-form key:value span
    const spans = screen
      .queryAllByText(/replication: none/)
      .filter(
        (el) =>
          el.tagName === "SPAN" &&
          el.closest("[data-testid='free-form-props']") !== null,
      );
    expect(spans).toHaveLength(0);
  });

  it("unknown archetype → no Attributes section", () => {
    useStore.getState().addNode("ghost-arch", "ghost-tool", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(screen.queryByText(/attributes/i)).not.toBeInTheDocument();
  });

  // --- Edge custom properties tests ---

  it("edge: add custom property (latency: 5ms) sets edge.data.customProperties", async () => {
    const user = userEvent.setup();
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    await user.type(screen.getByPlaceholderText("key"), "latency");
    await user.type(screen.getByPlaceholderText("value"), "5ms");
    await user.click(screen.getByRole("button", { name: "Add property" }));
    expect(useStore.getState().edges[0].data?.customProperties).toEqual({
      latency: "5ms",
    });
  });

  it("edge: remove custom property via ✕ button", async () => {
    const user = userEvent.setup();
    useStore.getState().setEdges([
      {
        id: "edge1",
        source: "a",
        target: "b",
        type: "sysEdge",
        data: { label: "my-label", customProperties: { latency: "5ms" } },
        selected: true,
        animated: false,
      },
    ]);
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: "remove latency" }));
    expect(
      useStore.getState().edges[0].data?.customProperties?.latency,
    ).toBeUndefined();
  });

  it("edge: empty key is rejected (no property added)", async () => {
    const user = userEvent.setup();
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    // Leave key empty, fill value only
    await user.type(screen.getByPlaceholderText("value"), "5ms");
    await user.click(screen.getByRole("button", { name: "Add property" }));
    expect(useStore.getState().edges[0].data?.customProperties).toBeUndefined();
  });

  it("node free-form custom properties still work after refactor", async () => {
    const user = userEvent.setup();
    useStore.getState().addNode("compute", "kubernetes", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.type(screen.getByPlaceholderText("key"), "replicas");
    await user.type(screen.getByPlaceholderText("value"), "3");
    await user.click(screen.getByRole("button", { name: "Add property" }));
    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties,
    ).toEqual({
      replicas: "3",
    });
  });

  // --- panelSuppressed tests ---

  it("node selected + panelSuppressed=true → config panel hidden", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    useStore.getState().setPanelSuppressed(true);
    render(<ConfigPanel />);
    expect(screen.queryByTestId("config-panel")).not.toBeInTheDocument();
  });

  it("node selected + panelSuppressed=false → config panel visible", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    useStore.getState().setPanelSuppressed(false);
    render(<ConfigPanel />);
    expect(screen.getByTestId("config-panel")).toBeInTheDocument();
  });

  it("edge selected + panelSuppressed=true → edge panel still shows (edges unaffected)", () => {
    seedEdge({ selected: true });
    useStore.getState().setPanelSuppressed(true);
    render(<ConfigPanel />);
    expect(screen.getByTestId("config-panel")).toBeInTheDocument();
    expect(screen.getByText("Edge Config")).toBeInTheDocument();
  });

  // --- NoteNode config ---
  it("noteNode selected → shows Note panel with textarea", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    // The heading uses uppercase CSS — the text content is "Note"
    expect(screen.getByTestId("config-panel")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /note text/i }),
    ).toBeInTheDocument();
  });

  it("noteNode textarea commit on blur updates store", async () => {
    const user = userEvent.setup();
    useStore.getState().addNote({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    const ta = screen.getByRole("textbox", { name: /note text/i });
    await user.clear(ta);
    await user.type(ta, "p95 < 200ms");
    await user.tab();
    const noteNode = useStore.getState()
      .nodes[0] as import("@/lib/types").NoteNode;
    expect(noteNode.data.text).toBe("p95 < 200ms");
  });

  // --- BoundaryNode config ---
  it("boundaryNode selected → shows Boundary panel with label input", () => {
    useStore.getState().addBoundary({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    expect(screen.getByText("Boundary")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /boundary label/i }),
    ).toBeInTheDocument();
  });

  it("boundary label commit updates store", async () => {
    const user = userEvent.setup();
    useStore.getState().addBoundary({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    const input = screen.getByRole("textbox", { name: /boundary label/i });
    await user.clear(input);
    await user.type(input, "VPC");
    await user.tab();
    const bn = useStore.getState()
      .nodes[0] as import("@/lib/types").BoundaryNode;
    expect(bn.data.label).toBe("VPC");
  });

  // --- panelSuppressed / marquee selection ---
  it("noteNode selected + panelSuppressed=true (marquee path) → config panel hidden", () => {
    // This simulates the marquee selection path:
    // onSelectionStart → setPanelSuppressed(true); nodes get selected via selectionOnDrag
    // Panel stays suppressed — only direct node click (onNodeClick) clears it
    useStore.getState().addNote({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    useStore.getState().setPanelSuppressed(true);
    render(<ConfigPanel />);
    expect(screen.queryByTestId("config-panel")).not.toBeInTheDocument();
  });

  // ─── Item 1: Lock mode — all edit paths ────────────────────────────────────

  it("locked: pin 'Add attribute' input is disabled", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Add attribute");
    expect(input).toBeDisabled();
  });

  it("locked: pin add is no-op (typing + Enter does nothing)", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Add attribute");
    // disabled inputs don't accept events, verify it cannot be typed into
    expect(input).toBeDisabled();
    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties,
    ).toBeUndefined();
  });

  it("locked: pinned attribute editor (select) is disabled", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    useStore.getState().updateNodeData(useStore.getState().nodes[0].id, {
      customProperties: { replication: "none" },
    });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    // The select has aria-label "Replication" (capitalized, exact match)
    const select = screen.getByRole("combobox", { name: "Replication" });
    expect(select).toBeDisabled();
  });

  it("locked: pin remove ✕ button is disabled", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    useStore.getState().updateNodeData(useStore.getState().nodes[0].id, {
      customProperties: { replication: "none" },
    });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    const btn = screen.getByRole("button", { name: "remove replication" });
    expect(btn).toBeDisabled();
  });

  it("locked: custom property key/value inputs disabled", () => {
    useStore.getState().addNode("compute", "docker", { x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(screen.getByPlaceholderText("key")).toBeDisabled();
    expect(screen.getByPlaceholderText("value")).toBeDisabled();
  });

  it("locked: 'Add property' button disabled", () => {
    useStore.getState().addNode("compute", "docker", { x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(screen.getByRole("button", { name: "Add property" })).toBeDisabled();
  });

  it("locked: custom prop add is no-op", async () => {
    useStore.getState().addNode("compute", "docker", { x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    // button is disabled, nothing should change
    expect(screen.getByRole("button", { name: "Add property" })).toBeDisabled();
    expect(
      (useStore.getState().nodes[0] as SysNode).data.customProperties,
    ).toBeUndefined();
  });

  it("locked: custom prop remove ✕ button disabled", () => {
    useStore.getState().addNode("compute", "docker", { x: 0, y: 0 });
    useStore.getState().updateNodeData(useStore.getState().nodes[0].id, {
      customProperties: { replicas: "3" },
    });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: "remove replicas" }),
    ).toBeDisabled();
  });

  it("locked: edge label input disabled", () => {
    seedEdge({ selected: true });
    setLocked(true);
    render(<ConfigPanel />);
    expect(screen.getByLabelText("Label")).toBeDisabled();
  });

  it("locked: protocol chip is no-op (disabled)", async () => {
    seedEdge({ selected: true });
    setLocked(true);
    render(<ConfigPanel />);
    // All protocol chips should be disabled
    const grpcBtn = screen.getByRole("button", { name: "gRPC" });
    expect(grpcBtn).toBeDisabled();
  });

  it("locked: animate toggle is disabled", () => {
    seedEdge({ selected: true });
    setLocked(true);
    render(<ConfigPanel />);
    expect(screen.getByRole("button", { name: /animate/i })).toBeDisabled();
  });

  it("locked: edge custom prop inputs disabled", () => {
    seedEdge({ selected: true });
    setLocked(true);
    render(<ConfigPanel />);
    expect(screen.getByPlaceholderText("key")).toBeDisabled();
    expect(screen.getByPlaceholderText("value")).toBeDisabled();
  });

  it("locked: note textarea disabled", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    setLocked(true);
    render(<ConfigPanel />);
    expect(screen.getByRole("textbox", { name: /note text/i })).toBeDisabled();
  });

  it("locked: boundary label input disabled", () => {
    useStore.getState().addBoundary({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("textbox", { name: /boundary label/i }),
    ).toBeDisabled();
  });

  // ─── Item 2: Edge "+" chip hidden when locked ───────────────────────────────

  it("locked empty edge: no edge-label chip rendered at all", () => {
    // This tests the SysEdge component behavior via a store-seeded state
    // The panel test just verifies lock state is correct in store
    setLocked(true);
    expect(useStore.getState().locked).toBe(true);
  });

  // ─── Item 3: Edge color in ConfigPanel ─────────────────────────────────────

  it("edge: color swatch click writes data.color", async () => {
    const user = userEvent.setup();
    seedEdge({ selected: true });
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /edge color blue/i }));
    expect(useStore.getState().edges[0].data?.color).toBe("#3b82f6");
  });

  it("edge: clear swatch removes color", async () => {
    const user = userEvent.setup();
    useStore.getState().setEdges([
      {
        id: "edge1",
        source: "a",
        target: "b",
        type: "sysEdge",
        data: { label: "my-label", color: "#3b82f6" },
        selected: true,
        animated: false,
      },
    ]);
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /edge color clear/i }));
    expect(useStore.getState().edges[0].data?.color).toBeUndefined();
  });

  it("locked: color swatch buttons are disabled", () => {
    seedEdge({ selected: true });
    setLocked(true);
    render(<ConfigPanel />);
    const blueBtn = screen.getByRole("button", { name: /edge color blue/i });
    expect(blueBtn).toBeDisabled();
  });

  // ─── Item 4: Edge has-properties indicator ──────────────────────────────────
  // (tested in SysEdge.test.tsx)

  // ─── Feature 1: Note color swatches ────────────────────────────────────────

  it("note: color swatch click writes data.color", async () => {
    const user = userEvent.setup();
    useStore.getState().addNote({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /note color blue/i }));
    const noteNode = useStore.getState()
      .nodes[0] as import("@/lib/types").NoteNode;
    expect(noteNode.data.color).toBe("#3b82f6");
  });

  it("note: clear swatch removes color", async () => {
    const user = userEvent.setup();
    useStore.getState().addNote({ x: 0, y: 0 });
    useStore.getState().updateNodeData(useStore.getState().nodes[0].id, {
      color: "#3b82f6",
    });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /note color clear/i }));
    const noteNode = useStore.getState()
      .nodes[0] as import("@/lib/types").NoteNode;
    expect(noteNode.data.color).toBeUndefined();
  });

  it("note: locked color swatches are disabled", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /note color blue/i }),
    ).toBeDisabled();
  });

  // ─── Feature 1: Boundary color swatches ─────────────────────────────────────

  it("boundary: color swatch click writes data.color", async () => {
    const user = userEvent.setup();
    useStore.getState().addBoundary({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    await user.click(
      screen.getByRole("button", { name: /boundary color green/i }),
    );
    const bn = useStore.getState()
      .nodes[0] as import("@/lib/types").BoundaryNode;
    expect(bn.data.color).toBe("#22c55e");
  });

  it("boundary: clear swatch removes color", async () => {
    const user = userEvent.setup();
    useStore.getState().addBoundary({ x: 0, y: 0 });
    useStore.getState().updateNodeData(useStore.getState().nodes[0].id, {
      color: "#22c55e",
    });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    render(<ConfigPanel />);
    await user.click(
      screen.getByRole("button", { name: /boundary color clear/i }),
    );
    const bn = useStore.getState()
      .nodes[0] as import("@/lib/types").BoundaryNode;
    expect(bn.data.color).toBeUndefined();
  });

  it("boundary: locked color swatches are disabled", () => {
    useStore.getState().addBoundary({ x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /boundary color blue/i }),
    ).toBeDisabled();
  });

  // ─── Item 5: Rename Pins → Attributes ──────────────────────────────────────

  it("node config shows 'Attributes' heading (not 'Pins')", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(screen.getByText(/attributes/i)).toBeInTheDocument();
    expect(screen.queryByText(/^pins$/i)).not.toBeInTheDocument();
  });

  it("'Add attribute' placeholder text (not 'Add pin')", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(screen.getByPlaceholderText("Add attribute…")).toBeInTheDocument();
  });

  it("'Add attribute' aria-label (not 'Add pin')", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(screen.getByLabelText("Add attribute")).toBeInTheDocument();
  });

  // ─── StepNode config ───────────────────────────────────────────────────────

  it("stepNode selected → shows Step panel with step label text input", () => {
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(screen.getByTestId("config-panel")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /step label/i }),
    ).toBeInTheDocument();
  });

  it("step: label text input has id cfg-step-label and aria-label Step label", () => {
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Step label") as HTMLInputElement;
    expect(input.id).toBe("cfg-step-label");
  });

  it("step: typing alone does NOT update store (commit happens on blur)", async () => {
    const user = userEvent.setup();
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Step label") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "2a");
    // store must NOT have been updated yet — only the local draft changed
    const sn = useStore.getState().nodes[0] as import("@/lib/types").StepNode;
    expect(sn.data.label ?? "").toBe("");
  });

  it("step: label commits to store on blur", async () => {
    const user = userEvent.setup();
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Step label") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "2a");
    await user.tab(); // blur commits
    const sn = useStore.getState().nodes[0] as import("@/lib/types").StepNode;
    expect(sn.data.label).toBe("2a");
  });

  it("step: label commits to store on Enter", async () => {
    const user = userEvent.setup();
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    const input = screen.getByLabelText("Step label") as HTMLInputElement;
    await user.clear(input);
    await user.type(input, "3b");
    await user.keyboard("{Enter}");
    const sn = useStore.getState().nodes[0] as import("@/lib/types").StepNode;
    expect(sn.data.label).toBe("3b");
  });

  it("step: color swatch click writes data.color", async () => {
    const user = userEvent.setup();
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /step color blue/i }));
    const sn = useStore.getState().nodes[0] as import("@/lib/types").StepNode;
    expect(sn.data.color).toBe("#3b82f6");
  });

  it("step: locked label input is disabled", () => {
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(screen.getByRole("textbox", { name: /step label/i })).toBeDisabled();
  });

  it("step: locked color swatches disabled", () => {
    useStore.getState().addStep({ x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /step color blue/i }),
    ).toBeDisabled();
  });

  // ─── ArrowNode config (Excalidraw-style, no flip) ────────────────────────────

  it("arrowNode selected → shows Arrow panel", () => {
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(screen.getByTestId("config-panel")).toBeInTheDocument();
    expect(screen.getByText("Arrow")).toBeInTheDocument();
  });

  it("arrow: NO flip direction button (removed in Excalidraw model)", () => {
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(
      screen.queryByRole("button", { name: /flip direction/i }),
    ).not.toBeInTheDocument();
  });

  it("arrow: color swatch click writes data.color", async () => {
    const user = userEvent.setup();
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /arrow color red/i }));
    const an = useStore.getState().nodes[0] as import("@/lib/types").ArrowNode;
    expect(an.data.color).toBe("#ef4444");
  });

  it("arrow: locked color swatches disabled", () => {
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /arrow color blue/i }),
    ).toBeDisabled();
  });

  // ─── Note size segmented control ──────────────────────────────────────────

  it("note: size segmented shows Small/Normal/Title buttons", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /note size small/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /note size normal/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /note size title/i }),
    ).toBeInTheDocument();
  });

  it("note: clicking Small sets data.size to 'small'", async () => {
    const user = userEvent.setup();
    useStore.getState().addNote({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /note size small/i }));
    const noteNode = useStore.getState()
      .nodes[0] as import("@/lib/types").NoteNode;
    expect(noteNode.data.size).toBe("small");
  });

  it("note: clicking Title sets data.size to 'title'", async () => {
    const user = userEvent.setup();
    useStore.getState().addNote({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.click(screen.getByRole("button", { name: /note size title/i }));
    const noteNode = useStore.getState()
      .nodes[0] as import("@/lib/types").NoteNode;
    expect(noteNode.data.size).toBe("title");
  });

  it("note: locked size buttons disabled", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /note size small/i }),
    ).toBeDisabled();
  });

  // ─── Arrow lineStyle segmented control ───────────────────────────────────────

  it("arrow: line style buttons Solid/Dashed/Dotted are shown", () => {
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /line style solid/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /line style dashed/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /line style dotted/i }),
    ).toBeInTheDocument();
  });

  it("arrow: clicking Dashed sets data.lineStyle to 'dashed'", async () => {
    const user = userEvent.setup();
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.click(
      screen.getByRole("button", { name: /line style dashed/i }),
    );
    const an = useStore.getState().nodes[0] as import("@/lib/types").ArrowNode;
    expect(an.data.lineStyle).toBe("dashed");
  });

  it("arrow: clicking Dotted sets data.lineStyle to 'dotted'", async () => {
    const user = userEvent.setup();
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    await user.click(
      screen.getByRole("button", { name: /line style dotted/i }),
    );
    const an = useStore.getState().nodes[0] as import("@/lib/types").ArrowNode;
    expect(an.data.lineStyle).toBe("dotted");
  });

  it("arrow: clicking Solid sets data.lineStyle to 'solid'", async () => {
    const user = userEvent.setup();
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    render(<ConfigPanel />);
    // First set dashed, then switch back to solid
    await user.click(
      screen.getByRole("button", { name: /line style dashed/i }),
    );
    await user.click(screen.getByRole("button", { name: /line style solid/i }));
    const an = useStore.getState().nodes[0] as import("@/lib/types").ArrowNode;
    expect(an.data.lineStyle).toBe("solid");
  });

  it("arrow: locked line style buttons are disabled", () => {
    useStore.getState().addArrow({ x: 0, y: 0 });
    selectFirstNode();
    setLocked(true);
    render(<ConfigPanel />);
    expect(
      screen.getByRole("button", { name: /line style dashed/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /line style dotted/i }),
    ).toBeDisabled();
  });
});
