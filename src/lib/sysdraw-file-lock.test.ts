/**
 * Feature 1: Lock mode — file round-trip tests
 */
import { describe, it, expect } from "vitest";
import { serializeSysdraw, parseSysdraw } from "./sysdraw-file";
import type { SysNode, SysEdge } from "./types";

const nodes: SysNode[] = [
  {
    id: "n1",
    type: "sysNode",
    position: { x: 1, y: 2 },
    data: {
      archetype: "database",
      concreteTool: "mysql",
      label: "Users DB",
    },
  },
];
const edges: SysEdge[] = [];

describe("sysdraw file lock round-trip", () => {
  it("locked:true survives serialize/parse round-trip", () => {
    const text = serializeSysdraw({
      nodes,
      edges,
      viewMode: "real",
      nodeStyle: "card",
      locked: true,
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.meta.locked).toBe(true);
  });

  it("locked:false is omitted from serialized JSON (clean default)", () => {
    const text = serializeSysdraw({
      nodes,
      edges,
      viewMode: "real",
      nodeStyle: "card",
      locked: false,
    });
    const parsed = JSON.parse(text) as { meta: Record<string, unknown> };
    expect(parsed.meta.locked).toBeUndefined();
  });

  it("file without locked field parses with meta.locked undefined (≡ false)", () => {
    const text = serializeSysdraw({
      nodes,
      edges,
      viewMode: "real",
      nodeStyle: "card",
    });
    const result = parseSysdraw(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // absent → undefined, setAll treats undefined as false
    expect(result.data.meta.locked).toBeUndefined();
  });
});
