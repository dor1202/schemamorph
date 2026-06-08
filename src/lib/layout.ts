import dagre from "@dagrejs/dagre";
import type {
  AppNode,
  SysNode,
  BoundaryNode,
  SysEdge,
  LayoutDirection,
} from "./types";

const FALLBACK_WIDTH = 180;
const FALLBACK_HEIGHT = 60;
/** Padding around member bbox for boundary rect */
const BOUNDARY_PAD = 40;
/** Extra top padding for the boundary label */
const BOUNDARY_LABEL_EXTRA = 24;

/**
 * Pure layout function.
 *
 * - sysNodes: positioned by dagre.
 * - boundaryNodes with ≥1 member: repositioned + resized to wrap members' post-layout bboxes.
 *   Membership is determined BEFORE layout from each sysNode's center lying inside the boundary rect.
 *   Nested/overlapping boundaries: a node inside two boundaries belongs to both (acceptable).
 * - boundaryNodes with 0 members: untouched (not in returned map).
 * - noteNodes: always untouched (not in returned map).
 *
 * Returns Map<id, {x, y, width?, height?}> — width/height only for boundaries.
 */
export function layoutPositions(
  nodes: AppNode[],
  edges: SysEdge[],
  direction: LayoutDirection = "LR",
): Map<string, { x: number; y: number; width?: number; height?: number }> {
  const sysNodes = nodes.filter((n): n is SysNode => n.type === "sysNode");
  const boundaryNodes = nodes.filter(
    (n): n is BoundaryNode => n.type === "boundaryNode",
  );

  // --- PRE-LAYOUT: compute boundary membership by center-point ---
  // membership[boundaryId] = set of sysNode ids whose center lies inside the boundary rect
  const membership = new Map<string, Set<string>>();
  for (const bnd of boundaryNodes) {
    const bndW = bnd.width ?? 320;
    const bndH = bnd.height ?? 220;
    const bndX1 = bnd.position.x;
    const bndY1 = bnd.position.y;
    const bndX2 = bndX1 + bndW;
    const bndY2 = bndY1 + bndH;

    const members = new Set<string>();
    for (const sn of sysNodes) {
      const snW = sn.measured?.width ?? FALLBACK_WIDTH;
      const snH = sn.measured?.height ?? FALLBACK_HEIGHT;
      const cx = sn.position.x + snW / 2;
      const cy = sn.position.y + snH / 2;
      if (cx >= bndX1 && cx <= bndX2 && cy >= bndY1 && cy <= bndY2) {
        members.add(sn.id);
      }
    }
    membership.set(bnd.id, members);
  }

  // --- DAGRE layout for sysNodes ---
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of sysNodes) {
    g.setNode(node.id, {
      width: node.measured?.width ?? FALLBACK_WIDTH,
      height: node.measured?.height ?? FALLBACK_HEIGHT,
    });
  }
  for (const edge of edges) g.setEdge(edge.source, edge.target);

  dagre.layout(g);

  // Build sysNode result map (top-left positions)
  const result = new Map<
    string,
    { x: number; y: number; width?: number; height?: number }
  >();
  // Also build a lookup of post-layout positions + dims for boundary computation
  const sysNodeDims = new Map<
    string,
    { x: number; y: number; w: number; h: number }
  >();

  for (const node of sysNodes) {
    const { x, y, width, height } = g.node(node.id);
    const px = x - width / 2;
    const py = y - height / 2;
    result.set(node.id, { x: px, y: py });
    sysNodeDims.set(node.id, { x: px, y: py, w: width, h: height });
  }

  // --- POST-LAYOUT: recompute boundary positions + sizes ---
  for (const bnd of boundaryNodes) {
    const members = membership.get(bnd.id)!;
    if (members.size === 0) continue; // untouched

    // Bounding box of all members' new rects
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const memberId of members) {
      const d = sysNodeDims.get(memberId);
      if (!d) continue;
      minX = Math.min(minX, d.x);
      minY = Math.min(minY, d.y);
      maxX = Math.max(maxX, d.x + d.w);
      maxY = Math.max(maxY, d.y + d.h);
    }

    const newX = minX - BOUNDARY_PAD;
    const newY = minY - BOUNDARY_PAD - BOUNDARY_LABEL_EXTRA;
    const newW = maxX - minX + BOUNDARY_PAD * 2;
    const newH = maxY - minY + BOUNDARY_PAD * 2 + BOUNDARY_LABEL_EXTRA;

    result.set(bnd.id, { x: newX, y: newY, width: newW, height: newH });
  }

  return result;
}
