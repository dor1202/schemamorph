import { describe, it, expect } from "vitest";
import { absolutizeAll, applyGrouping } from "./grouping";
import type { AppNode, BoundaryNode, SysNode } from "./types";

const boundary = (
  id: string,
  x: number,
  y: number,
  w = 320,
  h = 220,
): BoundaryNode => ({
  id,
  type: "boundaryNode",
  position: { x, y },
  width: w,
  height: h,
  data: { label: "VPC" },
});

const sys = (id: string, x: number, y: number): SysNode => ({
  id,
  type: "sysNode",
  position: { x, y },
  data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
});

describe("applyGrouping", () => {
  it("assigns parentId + relative position to a node whose center is inside a boundary", () => {
    // sys at (100,100), fallback dims 180x60 → center (190,130); boundary (0,0,320,220) contains it
    const nodes: AppNode[] = [sys("a", 100, 100), boundary("b1", 0, 0)];
    const result = applyGrouping(nodes);
    const a = result.find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
    expect(a.position).toEqual({ x: 100, y: 100 }); // relative — boundary at origin
  });

  it("computes relative position against a non-origin boundary", () => {
    const nodes: AppNode[] = [sys("a", 450, 350), boundary("b1", 400, 300)];
    const a = applyGrouping(nodes).find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
    expect(a.position).toEqual({ x: 50, y: 50 });
  });

  it("leaves outside nodes ungrouped", () => {
    const nodes: AppNode[] = [sys("a", 900, 900), boundary("b1", 0, 0)];
    const a = applyGrouping(nodes).find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 900, y: 900 });
  });

  it("orders boundaries before other nodes (RF parent-first requirement)", () => {
    const nodes: AppNode[] = [sys("a", 10, 10), boundary("b1", 0, 0)];
    const result = applyGrouping(nodes);
    expect(result[0].id).toBe("b1");
  });

  it("is idempotent — regrouping grouped nodes preserves absolute geometry", () => {
    const nodes: AppNode[] = [sys("a", 100, 100), boundary("b1", 0, 0)];
    const once = applyGrouping(nodes);
    const twice = applyGrouping(once);
    expect(twice.find((n) => n.id === "a")!.position).toEqual({
      x: 100,
      y: 100,
    });
    expect(twice.find((n) => n.id === "a")!.parentId).toBe("b1");
  });

  it("re-resolves membership after a grouped node moves out (relative position far away)", () => {
    const grouped = applyGrouping([sys("a", 100, 100), boundary("b1", 0, 0)]);
    const moved = grouped.map((n) =>
      n.id === "a" ? { ...n, position: { x: 1000, y: 1000 } } : n,
    );
    const a = applyGrouping(moved).find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 1000, y: 1000 }); // absolute = old rel + boundary origin (0,0)
  });

  it("groups annotation node types too (noteNode)", () => {
    const note: AppNode = {
      id: "n",
      type: "noteNode",
      position: { x: 50, y: 50 },
      data: { text: "hi" },
    };
    const n = applyGrouping([note, boundary("b1", 0, 0)]).find(
      (x) => x.id === "n",
    )!;
    expect(n.parentId).toBe("b1");
  });

  it("never groups a boundary into another boundary", () => {
    const inner = boundary("b2", 10, 10, 100, 80);
    const result = applyGrouping([inner, boundary("b1", 0, 0, 500, 400)]);
    expect(result.find((n) => n.id === "b2")!.parentId).toBeUndefined();
  });

  it("first boundary wins when overlapping boundaries both contain a node", () => {
    const nodes: AppNode[] = [
      sys("a", 50, 50),
      boundary("b1", 0, 0),
      boundary("b2", 0, 0),
    ];
    const a = applyGrouping(nodes).find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b1");
  });

  it("prefers existing parentId when still geometrically valid (sticky membership)", () => {
    // sys("a", 50, 50) with parentId "b2" → absolutize: abs pos = 50+0=50, 50+0=50
    // center = 50+90=140, 50+30=80 → inside both b1 and b2 (both at origin, 320x220)
    // sticky: b2 is existing parent and still contains the node → should keep b2
    const nodes: AppNode[] = [
      boundary("b1", 0, 0),
      boundary("b2", 0, 0),
      { ...sys("a", 50, 50), parentId: "b2" },
    ];
    const a = applyGrouping(nodes).find((n) => n.id === "a")!;
    expect(a.parentId).toBe("b2");
  });
});

describe("absolutizeAll", () => {
  it("converts relative members to absolute and strips parentId", () => {
    const grouped = applyGrouping([
      sys("a", 450, 350),
      boundary("b1", 400, 300),
    ]);
    const abs = absolutizeAll(grouped);
    const a = abs.find((n) => n.id === "a")!;
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 450, y: 350 });
  });

  it("drops a dangling parentId without moving the node", () => {
    const orphan = { ...sys("a", 30, 40), parentId: "ghost" } as AppNode;
    const a = absolutizeAll([orphan])[0];
    expect(a.parentId).toBeUndefined();
    expect(a.position).toEqual({ x: 30, y: 40 });
  });
});
