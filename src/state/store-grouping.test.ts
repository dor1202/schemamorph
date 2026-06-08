import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";
import { serializeSysdraw, parseSysdraw } from "@/lib/sysdraw-file";
import { parseMermaid } from "@/lib/mermaid-import";
import { encodeShareHash, decodeShareHash } from "@/lib/share-url";
import type { SysNode, BoundaryNode } from "@/lib/types";

const BOUNDARY: BoundaryNode = {
  id: "b1",
  type: "boundaryNode",
  position: { x: 0, y: 0 },
  width: 320,
  height: 220,
  data: { label: "VPC" },
};

const MEMBER: SysNode = {
  id: "a",
  type: "sysNode",
  position: { x: 100, y: 100 },
  data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
};

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe("grouping integration", () => {
  it("autosave-style roundtrip: serialize grouped state → parse → setAll → same grouping", () => {
    useStore.getState().setAll(
      [
        {
          id: "a",
          type: "sysNode",
          position: { x: 100, y: 100 },
          data: {
            archetype: "database",
            concreteTool: "postgresql",
            label: "DB",
          },
        },
        {
          id: "b1",
          type: "boundaryNode",
          position: { x: 0, y: 0 },
          width: 320,
          height: 220,
          data: { label: "VPC" },
        },
      ] as never,
      [],
    );
    const s = useStore.getState();
    const json = serializeSysdraw({
      nodes: s.nodes,
      edges: s.edges,
      viewMode: s.viewMode,
      nodeStyle: s.nodeStyle,
    });
    const parsed = parseSysdraw(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    useStore
      .getState()
      .setAll(parsed.data.nodes as never, parsed.data.edges as never);
    const a = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
    expect(a.position).toEqual({ x: 100, y: 100 });
  });

  it("Mermaid-imported nodes (no boundaries) pass through grouping untouched", () => {
    const r = parseMermaid("flowchart LR\n A --> B");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    useStore.getState().setAll(r.nodes, r.edges);
    expect(
      useStore.getState().nodes.every((n) => n.parentId === undefined),
    ).toBe(true);
  });

  it("undo restores pre-grouping state after a delete that orphaned members", () => {
    // Set up: boundary at (0,0) with member at (100,100) inside it
    useStore.getState().setAll([{ ...MEMBER }, { ...BOUNDARY }], []);

    // Verify initial grouping
    const aBeforeDelete = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(aBeforeDelete.parentId).toBe("b1");
    expect(aBeforeDelete.position).toEqual({ x: 100, y: 100 });

    // Select and delete only the boundary (not the member)
    useStore.setState({
      nodes: useStore
        .getState()
        .nodes.map((n) => (n.id === "b1" ? { ...n, selected: true } : n)),
    });
    useStore.getState().deleteSelection();

    // After delete: member should be absolutized (orphaned) at correct absolute position
    const aAfterDelete = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(aAfterDelete.parentId).toBeUndefined();
    // boundary was at (0,0) so absolute = relative = (100,100)
    expect(aAfterDelete.position).toEqual({ x: 100, y: 100 });

    // Undo the delete
    useStore.getState().undo();

    // After undo: member should be re-grouped with boundary again
    const aAfterUndo = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(aAfterUndo.parentId).toBe("b1");
    expect(aAfterUndo.position).toEqual({ x: 100, y: 100 });
  });

  it("share roundtrip preserves grouping: serialize → encodeShareHash → decodeShareHash → parse → setAll", async () => {
    // Set up grouped state
    useStore.getState().setAll([{ ...MEMBER }, { ...BOUNDARY }], []);

    // Verify initial grouping
    const s = useStore.getState();
    const aInitial = s.nodes.find((n) => n.id === "a")!;
    expect(aInitial.parentId).toBe("b1");

    // Serialize and encode into share hash
    const json = serializeSysdraw({
      nodes: s.nodes,
      edges: s.edges,
      viewMode: s.viewMode,
      nodeStyle: s.nodeStyle,
    });
    const hash = await encodeShareHash(json);

    // Decode the hash and verify we get back the same JSON
    const decodedJson = await decodeShareHash(hash);
    expect(decodedJson).not.toBeNull();

    // Parse and load into store
    const parsed = parseSysdraw(decodedJson!);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // Reset store and load from share
    useStore.getState().reset();
    useStore
      .getState()
      .setAll(parsed.data.nodes as never, parsed.data.edges as never);

    // Verify grouping is restored correctly
    const aAfterRoundtrip = useStore
      .getState()
      .nodes.find((n) => n.id === "a")!;
    expect(aAfterRoundtrip.parentId).toBe("b1");
    expect(aAfterRoundtrip.position).toEqual({ x: 100, y: 100 });
  });

  it("locked file with grouped nodes loads locked with grouping derived", () => {
    // Create grouped state to serialize
    useStore.getState().setAll([{ ...MEMBER }, { ...BOUNDARY }], []);
    const s = useStore.getState();

    // Serialize with locked: true
    const json = serializeSysdraw({
      nodes: s.nodes,
      edges: s.edges,
      viewMode: s.viewMode,
      nodeStyle: s.nodeStyle,
      locked: true,
    });

    // Parse and verify locked is in meta
    const parsed = parseSysdraw(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.meta.locked).toBe(true);

    // Reset and load with meta
    useStore.getState().reset();
    useStore
      .getState()
      .setAll(parsed.data.nodes as never, parsed.data.edges as never, {
        viewMode: parsed.data.meta.viewMode,
        nodeStyle: parsed.data.meta.nodeStyle,
        locked: parsed.data.meta.locked ?? false,
      });

    // Verify: locked is true AND grouping is derived
    expect(useStore.getState().locked).toBe(true);
    const aAfterLoad = useStore.getState().nodes.find((n) => n.id === "a")!;
    expect(aAfterLoad.parentId).toBe("b1");
    expect(aAfterLoad.position).toEqual({ x: 100, y: 100 });
  });
});
