import { describe, it, expect } from "vitest";
import { serializeSysdraw, parseSysdraw } from "./sysdraw-file";
import { applyGrouping } from "./grouping";
import type {
  SysNode,
  SysEdge,
  NoteNode,
  BoundaryNode,
  StepNode,
  ArrowNode,
  AppNode,
} from "./types";

const nodes: SysNode[] = [
  {
    id: "n1",
    type: "sysNode",
    position: { x: 1, y: 2 },
    data: {
      archetype: "database",
      concreteTool: "mysql",
      label: "Users DB",
      customProperties: { shards: "4" },
    },
  },
];
const edges: SysEdge[] = [
  {
    id: "e1",
    source: "n1",
    target: "n1",
    type: "sysEdge",
    data: { protocol: "gRPC" },
  },
];

describe("sysdraw file", () => {
  it("round-trips state", () => {
    const text = serializeSysdraw({
      nodes,
      edges,
      viewMode: "real",
      nodeStyle: "plate",
      title: "demo",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      (result.data.nodes[0] as { data: { label: string } }).data.label,
    ).toBe("Users DB");
    expect(result.data.edges[0].data?.protocol).toBe("gRPC");
    expect(result.data.meta.viewMode).toBe("real");
    expect(result.data.meta.nodeStyle).toBe("plate");
    expect(result.data.version).toBe("1.3.0");
  });

  it("rejects missing nodes with specific error", () => {
    const result = parseSysdraw(
      JSON.stringify({ version: "1.0.0", edges: [] }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("nodes");
  });

  it("rejects node missing position with indexed error", () => {
    const bad = {
      version: "1.0.0",
      nodes: [
        { id: "x", data: { archetype: "a", concreteTool: "b", label: "c" } },
      ],
      edges: [],
    };
    const result = parseSysdraw(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/nodes\.0/);
  });

  it("rejects non-JSON", () => {
    expect(parseSysdraw("not json{").ok).toBe(false);
  });

  it("strips unknown fields (forward compatibility)", () => {
    const future = {
      version: "9.9.9",
      futureField: { anything: true },
      meta: { viewMode: "minimalist", somethingNew: 1 },
      nodes: [{ ...nodes[0], experimental: "x" }],
      edges: [],
    };
    const result = parseSysdraw(JSON.stringify(future));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      (result.data as unknown as Record<string, unknown>).futureField,
    ).toBeUndefined();
    expect(
      (result.data.nodes[0] as unknown as Record<string, unknown>).experimental,
    ).toBeUndefined();
  });

  it("serialize strips runtime-only fields", () => {
    const runtimeNode: SysNode = {
      ...nodes[0],
      selected: true,
      dragging: true,
      measured: { width: 200, height: 80 },
    };
    const text = serializeSysdraw({
      nodes: [runtimeNode],
      edges,
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    expect(text).not.toContain('"selected"');
    expect(text).not.toContain('"dragging"');
    expect(text).not.toContain('"measured"');
  });

  it("animated edge round-trips", () => {
    const animatedEdge: SysEdge = {
      id: "e2",
      source: "n1",
      target: "n1",
      type: "sysEdge",
      animated: true,
      data: { label: "stream" },
    };
    const text = serializeSysdraw({
      nodes,
      edges: [animatedEdge],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.edges[0].animated).toBe(true);
  });

  it("non-animated edge serializes WITHOUT animated key", () => {
    const text = serializeSysdraw({
      nodes,
      edges,
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as { edges: unknown[] };
    expect(
      (parsed.edges[0] as Record<string, unknown>).animated,
    ).toBeUndefined();
  });

  it("edge customProperties round-trip", () => {
    const edgeWithProps: SysEdge = {
      id: "e3",
      source: "n1",
      target: "n1",
      type: "sysEdge",
      data: {
        protocol: "HTTP",
        customProperties: { latency: "5ms", timeout: "30s" },
      },
    };
    const text = serializeSysdraw({
      nodes,
      edges: [edgeWithProps],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.edges[0].data?.customProperties).toEqual({
      latency: "5ms",
      timeout: "30s",
    });
  });

  it("edge without customProperties serializes WITHOUT customProperties key", () => {
    const text = serializeSysdraw({
      nodes,
      edges,
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      edges: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.edges[0].data?.customProperties).toBeUndefined();
  });

  it("round-trips a noteNode (text preserved)", () => {
    const noteNode: NoteNode = {
      id: "note1",
      type: "noteNode",
      position: { x: 10, y: 20 },
      data: { text: "100M DAU" },
    };
    const text = serializeSysdraw({
      nodes: [noteNode],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.nodes[0].type).toBe("noteNode");
    expect((result.data.nodes[0] as { data: { text: string } }).data.text).toBe(
      "100M DAU",
    );
  });

  it("round-trips a boundaryNode (label + width/height preserved)", () => {
    const boundary: BoundaryNode = {
      id: "b1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 320,
      height: 220,
      data: { label: "VPC" },
    };
    const text = serializeSysdraw({
      nodes: [boundary],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0];
    expect(n.type).toBe("boundaryNode");
    expect((n as { data: { label: string }; width?: number }).data.label).toBe(
      "VPC",
    );
    expect((n as { width?: number }).width).toBe(320);
    expect((n as { height?: number }).height).toBe(220);
  });

  it("v1.0 file (all sysNode) still parses correctly — backward compatible", () => {
    const oldFile = JSON.stringify({
      version: "1.0.0",
      meta: { viewMode: "minimalist" },
      nodes: [
        {
          id: "n1",
          type: "sysNode",
          position: { x: 0, y: 0 },
          data: { archetype: "database", concreteTool: "mysql", label: "DB" },
        },
      ],
      edges: [],
    });
    const result = parseSysdraw(oldFile);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.nodes[0].type).toBe("sysNode");
  });

  it("version is 1.3.0 after bump", () => {
    const text = serializeSysdraw({
      nodes: [],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as { version: string };
    expect(parsed.version).toBe("1.3.0");
  });

  // ─── v1.3.0: stepNode label round-trip ──────────────────────────────────────

  it("stepNode with label round-trips label and emits n:0 for back-compat", () => {
    const step: StepNode = {
      id: "step-labeled",
      type: "stepNode",
      position: { x: 5, y: 10 },
      data: { label: "2a" },
    };
    const text = serializeSysdraw({
      nodes: [step],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.nodes[0].data?.label).toBe("2a");
    // n must be emitted as 0 for v1.2 reader back-compat
    expect(parsed.nodes[0].data?.n).toBe(0);
  });

  it("parse v1.2-style stepNode (n only, no label) succeeds", () => {
    const v12File = JSON.stringify({
      version: "1.2.0",
      meta: { viewMode: "minimalist" },
      nodes: [
        {
          id: "step1",
          type: "stepNode",
          position: { x: 0, y: 0 },
          data: { n: 3 },
        },
      ],
      edges: [],
    });
    const result = parseSysdraw(v12File);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      type: string;
      data: { n?: number; label?: string };
    };
    expect(n.type).toBe("stepNode");
    expect(n.data.n).toBe(3);
    expect(n.data.label).toBeUndefined();
  });

  it("parse stepNode with label only (no n) succeeds", () => {
    const file = JSON.stringify({
      version: "1.3.0",
      meta: {},
      nodes: [
        {
          id: "step2",
          type: "stepNode",
          position: { x: 0, y: 0 },
          data: { label: "B3" },
        },
      ],
      edges: [],
    });
    const result = parseSysdraw(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      type: string;
      data: { n?: number; label?: string };
    };
    expect(n.type).toBe("stepNode");
    expect(n.data.label).toBe("B3");
    expect(n.data.n).toBeUndefined();
  });

  it("parse stepNode with neither n nor label (blank step) succeeds", () => {
    const file = JSON.stringify({
      version: "1.3.0",
      meta: {},
      nodes: [
        {
          id: "step3",
          type: "stepNode",
          position: { x: 0, y: 0 },
          data: {},
        },
      ],
      edges: [],
    });
    const result = parseSysdraw(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      type: string;
      data: { n?: number; label?: string };
    };
    expect(n.type).toBe("stepNode");
    expect(n.data.n).toBeUndefined();
    expect(n.data.label).toBeUndefined();
  });

  // ─── Item 3: Edge color round-trip ──────────────────────────────────────────

  it("edge color round-trips", () => {
    const coloredEdge: SysEdge = {
      id: "ec1",
      source: "n1",
      target: "n1",
      type: "sysEdge",
      data: { label: "calls", color: "#3b82f6" },
    };
    const text = serializeSysdraw({
      nodes,
      edges: [coloredEdge],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.edges[0].data?.color).toBe("#3b82f6");
  });

  it("edge without color serializes WITHOUT color key", () => {
    const text = serializeSysdraw({
      nodes,
      edges,
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      edges: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.edges[0].data?.color).toBeUndefined();
  });

  it("edge color clear (undefined) serializes WITHOUT color key", () => {
    const clearedEdge: SysEdge = {
      id: "ec2",
      source: "n1",
      target: "n1",
      type: "sysEdge",
      data: { label: "calls", color: undefined },
    };
    const text = serializeSysdraw({
      nodes,
      edges: [clearedEdge],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      edges: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.edges[0].data?.color).toBeUndefined();
  });

  // ─── v1.2.0: stepNode round-trip ──────────────────────────────────────────

  it("stepNode round-trips (n + color)", () => {
    const step: StepNode = {
      id: "step1",
      type: "stepNode",
      position: { x: 5, y: 10 },
      data: { n: 3, color: "#ef4444" },
    };
    const text = serializeSysdraw({
      nodes: [step],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      type: string;
      data: { n?: number; color?: string };
    };
    expect(n.type).toBe("stepNode");
    expect(n.data.n).toBe(3);
    expect(n.data.color).toBe("#ef4444");
  });

  it("stepNode without color serializes WITHOUT color key", () => {
    const step: StepNode = {
      id: "step2",
      type: "stepNode",
      position: { x: 0, y: 0 },
      data: { label: "1" },
    };
    const text = serializeSysdraw({
      nodes: [step],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.nodes[0].data?.color).toBeUndefined();
  });

  // ─── v1.2.0: arrowNode round-trip (new Excalidraw-style dx/dy model) ─────────

  it("arrowNode round-trips (dx + dy + color)", () => {
    const arrow: ArrowNode = {
      id: "arr1",
      type: "arrowNode",
      position: { x: 10, y: 20 },
      data: { dx: 140, dy: -60, color: "#22c55e" },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      type: string;
      data: { dx: number; dy: number; color?: string };
    };
    expect(n.type).toBe("arrowNode");
    expect(n.data.dx).toBe(140);
    expect(n.data.dy).toBe(-60);
    expect(n.data.color).toBe("#22c55e");
  });

  it("arrowNode negative dx/dy round-trips correctly", () => {
    const arrow: ArrowNode = {
      id: "arr-neg",
      type: "arrowNode",
      position: { x: 200, y: 200 },
      data: { dx: -80, dy: -60 },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      data: { dx: number; dy: number };
    };
    expect(n.data.dx).toBe(-80);
    expect(n.data.dy).toBe(-60);
  });

  it("arrowNode serializes dx/dy and NOT width/height/flip", () => {
    const arrow: ArrowNode = {
      id: "arr3",
      type: "arrowNode",
      position: { x: 0, y: 0 },
      data: { dx: 140, dy: -60 },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{
        data?: Record<string, unknown>;
        width?: unknown;
        height?: unknown;
      }>;
    };
    // new fields present
    expect(parsed.nodes[0].data?.dx).toBe(140);
    expect(parsed.nodes[0].data?.dy).toBe(-60);
    // old fields absent
    expect(parsed.nodes[0].data?.flip).toBeUndefined();
    expect(parsed.nodes[0].width).toBeUndefined();
    expect(parsed.nodes[0].height).toBeUndefined();
  });

  it("arrowNode without color serializes WITHOUT color key", () => {
    const arrow: ArrowNode = {
      id: "arr4",
      type: "arrowNode",
      position: { x: 0, y: 0 },
      data: { dx: 100, dy: 50 },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.nodes[0].data?.color).toBeUndefined();
  });

  // ─── v1.2.0: noteNode size round-trip ──────────────────────────────────────

  it("noteNode with size 'title' round-trips", () => {
    const note: NoteNode = {
      id: "n-title",
      type: "noteNode",
      position: { x: 0, y: 0 },
      data: { text: "Heading", size: "title" },
    };
    const text = serializeSysdraw({
      nodes: [note],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      (result.data.nodes[0] as { data: { size?: string } }).data.size,
    ).toBe("title");
  });

  it("noteNode without size serializes WITHOUT size key", () => {
    const note: NoteNode = {
      id: "n-no-size",
      type: "noteNode",
      position: { x: 0, y: 0 },
      data: { text: "plain" },
    };
    const text = serializeSysdraw({
      nodes: [note],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.nodes[0].data?.size).toBeUndefined();
  });

  // ─── Backward compatibility: v1.0 and v1.1 files still parse ───────────────

  it("v1.1 file (noteNode + boundaryNode) still parses correctly — backward compat", () => {
    const v11File = JSON.stringify({
      version: "1.1.0",
      meta: { viewMode: "minimalist" },
      nodes: [
        {
          id: "note1",
          type: "noteNode",
          position: { x: 0, y: 0 },
          data: { text: "hello" },
        },
        {
          id: "bnd1",
          type: "boundaryNode",
          position: { x: 0, y: 0 },
          width: 320,
          height: 220,
          data: { label: "VPC" },
        },
      ],
      edges: [],
    });
    const result = parseSysdraw(v11File);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.nodes[0].type).toBe("noteNode");
    expect(result.data.nodes[1].type).toBe("boundaryNode");
  });

  // ─── Feature 1: note/boundary color round-trip ──────────────────────────────

  it("noteNode with color round-trips", () => {
    const noteNode: NoteNode = {
      id: "note1",
      type: "noteNode",
      position: { x: 10, y: 20 },
      data: { text: "hello", color: "#3b82f6" },
    };
    const text = serializeSysdraw({
      nodes: [noteNode],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      (result.data.nodes[0] as { data: { color?: string } }).data.color,
    ).toBe("#3b82f6");
  });

  it("noteNode without color serializes WITHOUT color key", () => {
    const noteNode: NoteNode = {
      id: "note1",
      type: "noteNode",
      position: { x: 10, y: 20 },
      data: { text: "hello" },
    };
    const text = serializeSysdraw({
      nodes: [noteNode],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.nodes[0].data?.color).toBeUndefined();
  });

  it("boundaryNode with color round-trips", () => {
    const boundary: BoundaryNode = {
      id: "b1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 320,
      height: 220,
      data: { label: "VPC", color: "#22c55e" },
    };
    const text = serializeSysdraw({
      nodes: [boundary],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      (result.data.nodes[0] as { data: { color?: string } }).data.color,
    ).toBe("#22c55e");
  });

  it("boundaryNode without color serializes WITHOUT color key", () => {
    const boundary: BoundaryNode = {
      id: "b1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      data: { label: "VPC" },
    };
    const text = serializeSysdraw({
      nodes: [boundary],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.nodes[0].data?.color).toBeUndefined();
  });

  // ─── arrowNode lineStyle round-trip ──────────────────────────────────────────

  it("arrowNode with lineStyle 'dashed' round-trips", () => {
    const arrow: ArrowNode = {
      id: "arr-dashed",
      type: "arrowNode",
      position: { x: 0, y: 0 },
      data: { dx: 140, dy: -60, lineStyle: "dashed" },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      data: { lineStyle?: string };
    };
    expect(n.data.lineStyle).toBe("dashed");
  });

  it("arrowNode with lineStyle 'dotted' round-trips", () => {
    const arrow: ArrowNode = {
      id: "arr-dotted",
      type: "arrowNode",
      position: { x: 0, y: 0 },
      data: { dx: 140, dy: -60, lineStyle: "dotted" },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      data: { lineStyle?: string };
    };
    expect(n.data.lineStyle).toBe("dotted");
  });

  it("arrowNode without lineStyle serializes WITHOUT lineStyle key", () => {
    const arrow: ArrowNode = {
      id: "arr-no-ls",
      type: "arrowNode",
      position: { x: 0, y: 0 },
      data: { dx: 100, dy: 50 },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const parsed = JSON.parse(text) as {
      nodes: Array<{ data?: Record<string, unknown> }>;
    };
    expect(parsed.nodes[0].data?.lineStyle).toBeUndefined();
  });

  it("arrowNode lineStyle + dx/dy + color all round-trip together", () => {
    const arrow: ArrowNode = {
      id: "arr-full",
      type: "arrowNode",
      position: { x: 10, y: 20 },
      data: { dx: -80, dy: -60, color: "#ef4444", lineStyle: "dotted" },
    };
    const text = serializeSysdraw({
      nodes: [arrow],
      edges: [],
      viewMode: "minimalist",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n = result.data.nodes[0] as {
      data: { dx: number; dy: number; color?: string; lineStyle?: string };
    };
    expect(n.data.dx).toBe(-80);
    expect(n.data.dy).toBe(-60);
    expect(n.data.color).toBe("#ef4444");
    expect(n.data.lineStyle).toBe("dotted");
  });

  // ─── grouping serialization ───────────────────────────────────────────────

  describe("grouping serialization", () => {
    it("serializes member positions as absolute and never emits parentId", () => {
      const grouped = applyGrouping([
        {
          id: "a",
          type: "sysNode",
          position: { x: 450, y: 350 },
          data: {
            archetype: "database",
            concreteTool: "postgresql",
            label: "DB",
          },
        } satisfies AppNode,
        {
          id: "b1",
          type: "boundaryNode",
          position: { x: 400, y: 300 },
          width: 320,
          height: 220,
          data: { label: "VPC" },
        } satisfies AppNode,
      ]);
      const json = serializeSysdraw({
        nodes: grouped,
        edges: [],
        viewMode: "minimalist",
        nodeStyle: "card",
      });
      const file = JSON.parse(json);
      const a = file.nodes.find((n: { id: string }) => n.id === "a");
      expect(a.position).toEqual({ x: 450, y: 350 }); // absolute, not {50,50}
      expect(JSON.stringify(file)).not.toContain("parentId");
      expect(file.version).toBe("1.3.0"); // format unchanged by grouping
    });

    it("roundtrips: export → parse preserves absolute geometry", () => {
      const grouped = applyGrouping([
        {
          id: "a",
          type: "sysNode",
          position: { x: 450, y: 350 },
          data: {
            archetype: "database",
            concreteTool: "postgresql",
            label: "DB",
          },
        } satisfies AppNode,
        {
          id: "b1",
          type: "boundaryNode",
          position: { x: 400, y: 300 },
          width: 320,
          height: 220,
          data: { label: "VPC" },
        } satisfies AppNode,
      ]);
      const json = serializeSysdraw({
        nodes: grouped,
        edges: [],
        viewMode: "minimalist",
        nodeStyle: "card",
      });
      const parsed = parseSysdraw(json);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      const a = parsed.data.nodes.find((n) => n.id === "a")!;
      expect(a.position).toEqual({ x: 450, y: 350 });
    });
  });
});
