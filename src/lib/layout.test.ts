import { describe, it, expect } from "vitest";
import { layoutPositions } from "./layout";
import type {
  SysNode,
  SysEdge,
  AppNode,
  NoteNode,
  BoundaryNode,
  StepNode,
  ArrowNode,
} from "./types";

const FALLBACK_WIDTH = 180;
const FALLBACK_HEIGHT = 60;

const mkNode = (id: string): SysNode => ({
  id,
  type: "sysNode",
  position: { x: 0, y: 0 },
  data: { archetype: "compute", concreteTool: "docker", label: id },
});

describe("layout", () => {
  it("is deterministic", () => {
    const nodes = [mkNode("a"), mkNode("b")];
    const edges: SysEdge[] = [{ id: "e", source: "a", target: "b", data: {} }];
    const p1 = layoutPositions(nodes, edges, "LR");
    const p2 = layoutPositions(nodes, edges, "LR");
    expect(p1.get("a")).toEqual(p2.get("a"));
    expect(p1.get("b")).toEqual(p2.get("b"));
  });

  it("LR places source left of target", () => {
    const positions = layoutPositions(
      [mkNode("a"), mkNode("b")],
      [{ id: "e", source: "a", target: "b", data: {} }],
      "LR",
    );
    expect(positions.get("a")!.x).toBeLessThan(positions.get("b")!.x);
  });

  it("TB places source above target", () => {
    const positions = layoutPositions(
      [mkNode("a"), mkNode("b")],
      [{ id: "e", source: "a", target: "b", data: {} }],
      "TB",
    );
    expect(positions.get("a")!.y).toBeLessThan(positions.get("b")!.y);
  });

  it("survives cycles", () => {
    const edges: SysEdge[] = [
      { id: "e1", source: "a", target: "b", data: {} },
      { id: "e2", source: "b", target: "a", data: {} },
    ];
    const positions = layoutPositions([mkNode("a"), mkNode("b")], edges, "LR");
    expect(positions.size).toBe(2);
  });

  it("excludes noteNode and boundaryNode from dagre layout (only sysNode positioned)", () => {
    const sysA: SysNode = {
      id: "a",
      type: "sysNode",
      position: { x: 0, y: 0 },
      data: { archetype: "compute", concreteTool: "docker", label: "a" },
    };
    const note: NoteNode = {
      id: "note1",
      type: "noteNode",
      position: { x: 999, y: 999 },
      data: { text: "annotation" },
    };
    const boundary: BoundaryNode = {
      id: "bnd1",
      type: "boundaryNode",
      position: { x: 500, y: 500 },
      data: { label: "VPC" },
    };
    const allNodes: AppNode[] = [sysA, note, boundary];
    const edges: SysEdge[] = [];
    const positions = layoutPositions(allNodes, edges, "LR");
    // sysNode gets a position
    expect(positions.has("a")).toBe(true);
    // noteNode and boundaryNode are NOT in the returned map
    expect(positions.has("note1")).toBe(false);
    expect(positions.has("bnd1")).toBe(false);
  });

  // --- Boundary wrapping after layout ---

  it("boundary wraps its members after layout: new position + size = bounding box of members + 40px padding (+ 24px extra top)", () => {
    // sysNode "a" starts inside the boundary's initial rect (center inside)
    // boundary initial rect: position {0,0}, width=320, height=220
    // sysNode center = {0 + 320/2, 0 + 220/2} => anywhere near center; actual: position {50,50}, fallback 180x60 → center {140, 80}
    const sysA: SysNode = {
      id: "a",
      type: "sysNode",
      position: { x: 50, y: 50 },
      data: { archetype: "compute", concreteTool: "docker", label: "a" },
    };
    const sysB: SysNode = {
      id: "b",
      type: "sysNode",
      position: { x: 200, y: 50 },
      data: { archetype: "compute", concreteTool: "docker", label: "b" },
    };
    // Boundary covers both nodes' initial centers
    const boundary: BoundaryNode = {
      id: "bnd1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 500,
      height: 300,
      data: { label: "VPC" },
    };
    const edge: SysEdge = { id: "e", source: "a", target: "b", data: {} };
    const allNodes: AppNode[] = [sysA, sysB, boundary];
    const positions = layoutPositions(allNodes, [edge], "LR");

    // sysNodes get positions from dagre
    expect(positions.has("a")).toBe(true);
    expect(positions.has("b")).toBe(true);

    // boundary gets a position AND size
    const bndPos = positions.get("bnd1");
    expect(bndPos).toBeDefined();
    expect(bndPos!.width).toBeDefined();
    expect(bndPos!.height).toBeDefined();

    // The boundary should wrap members: bndPos.x <= each member's new x, etc.
    const posA = positions.get("a")!;
    const posB = positions.get("b")!;

    const PAD = 40;
    const TOP_EXTRA = 24;

    // Member bounding box (using fallback dims since no measured)
    const memberMinX = Math.min(posA.x, posB.x);
    const memberMinY = Math.min(posA.y, posB.y);
    const memberMaxX = Math.max(
      posA.x + FALLBACK_WIDTH,
      posB.x + FALLBACK_WIDTH,
    );
    const memberMaxY = Math.max(
      posA.y + FALLBACK_HEIGHT,
      posB.y + FALLBACK_HEIGHT,
    );

    const expectedX = memberMinX - PAD;
    const expectedY = memberMinY - PAD - TOP_EXTRA;
    const expectedWidth = memberMaxX - memberMinX + PAD * 2;
    const expectedHeight = memberMaxY - memberMinY + PAD * 2 + TOP_EXTRA;

    expect(bndPos!.x).toBeCloseTo(expectedX, 1);
    expect(bndPos!.y).toBeCloseTo(expectedY, 1);
    expect(bndPos!.width).toBeCloseTo(expectedWidth, 1);
    expect(bndPos!.height).toBeCloseTo(expectedHeight, 1);
  });

  it("boundary with 0 members is untouched (not in returned map)", () => {
    const sysA: SysNode = {
      id: "a",
      type: "sysNode",
      position: { x: 0, y: 0 },
      data: { archetype: "compute", concreteTool: "docker", label: "a" },
    };
    // Boundary is far away from sysNode's initial center
    const boundary: BoundaryNode = {
      id: "bnd1",
      type: "boundaryNode",
      position: { x: 5000, y: 5000 },
      width: 200,
      height: 100,
      data: { label: "Empty" },
    };
    const allNodes: AppNode[] = [sysA, boundary];
    const positions = layoutPositions(allNodes, [], "LR");
    // sysNode gets positioned
    expect(positions.has("a")).toBe(true);
    // empty boundary is NOT repositioned
    expect(positions.has("bnd1")).toBe(false);
  });

  it("stepNode, arrowNode are never repositioned by layout (untouched)", () => {
    const sysA: SysNode = {
      id: "a",
      type: "sysNode",
      position: { x: 0, y: 0 },
      data: { archetype: "compute", concreteTool: "docker", label: "a" },
    };
    const step: StepNode = {
      id: "step1",
      type: "stepNode",
      position: { x: 50, y: 50 },
      data: { n: 1 },
    };
    const arrow: ArrowNode = {
      id: "arr1",
      type: "arrowNode",
      position: { x: 200, y: 200 },
      data: { dx: 140, dy: -60 },
    };
    const allNodes: AppNode[] = [sysA, step, arrow];
    const positions = layoutPositions(allNodes, [], "LR");
    // sysNode gets positioned
    expect(positions.has("a")).toBe(true);
    // annotation types are NOT repositioned
    expect(positions.has("step1")).toBe(false);
    expect(positions.has("arr1")).toBe(false);
  });

  it("notes are never repositioned by layout (untouched)", () => {
    const sysA: SysNode = {
      id: "a",
      type: "sysNode",
      position: { x: 0, y: 0 },
      data: { archetype: "compute", concreteTool: "docker", label: "a" },
    };
    const note: NoteNode = {
      id: "note1",
      type: "noteNode",
      position: { x: 999, y: 999 },
      data: { text: "annotation" },
    };
    const boundary: BoundaryNode = {
      id: "bnd1",
      type: "boundaryNode",
      position: { x: 0, y: 0 },
      width: 500,
      height: 300,
      data: { label: "VPC" },
    };
    const allNodes: AppNode[] = [sysA, note, boundary];
    const positions = layoutPositions(allNodes, [], "LR");
    // note is never in the returned map
    expect(positions.has("note1")).toBe(false);
  });
});
