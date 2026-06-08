import type { AppNode } from "./types";

/** Fallback dims when React Flow hasn't measured yet (mirrors layout.ts). */
const FALLBACK_WIDTH = 180;
const FALLBACK_HEIGHT = 60;
const BOUNDARY_FALLBACK_WIDTH = 320;
const BOUNDARY_FALLBACK_HEIGHT = 220;

function dims(n: AppNode): { w: number; h: number } {
  if (n.type === "boundaryNode") {
    return {
      w: n.width ?? BOUNDARY_FALLBACK_WIDTH,
      h: n.height ?? BOUNDARY_FALLBACK_HEIGHT,
    };
  }
  return {
    w: n.measured?.width ?? n.width ?? FALLBACK_WIDTH,
    h: n.measured?.height ?? n.height ?? FALLBACK_HEIGHT,
  };
}

/**
 * Strip all parentId grouping, converting member positions back to absolute.
 * Boundaries are never children, so parent positions are always absolute.
 */
export function absolutizeAll(nodes: AppNode[]): AppNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes.map((n) => {
    if (!n.parentId) return n;
    const parent = byId.get(n.parentId);
    const { parentId: _drop, ...rest } = n;
    void _drop;
    if (!parent) return rest as AppNode;
    return {
      ...rest,
      position: {
        x: n.position.x + parent.position.x,
        y: n.position.y + parent.position.y,
      },
    } as AppNode;
  });
}

/**
 * Membership rule: node center inside boundary rect (same as Tidy).
 * Sticky: if the node already had a parentId (passed via priorParentIds) and
 * that boundary still contains the center, keep that parent (avoids churn when
 * overlapping boundaries exist).
 * Otherwise, first boundary wins.
 */
function computeMembership(
  absNodes: AppNode[],
  priorParentIds: Map<string, string>,
): Map<string, string> {
  const boundaries = absNodes.filter((n) => n.type === "boundaryNode");
  const boundaryById = new Map(boundaries.map((b) => [b.id, b]));
  const membership = new Map<string, string>();
  for (const n of absNodes) {
    if (n.type === "boundaryNode") continue; // no nesting
    const { w, h } = dims(n);
    const cx = n.position.x + w / 2;
    const cy = n.position.y + h / 2;

    // Sticky: prefer existing parentId when still geometrically valid
    const priorParentId = priorParentIds.get(n.id);
    if (priorParentId) {
      const existingParent = boundaryById.get(priorParentId);
      if (existingParent) {
        const { w: bw, h: bh } = dims(existingParent);
        if (
          cx >= existingParent.position.x &&
          cx <= existingParent.position.x + bw &&
          cy >= existingParent.position.y &&
          cy <= existingParent.position.y + bh
        ) {
          membership.set(n.id, priorParentId);
          continue;
        }
      }
    }

    // Fall back to first-wins
    for (const b of boundaries) {
      const { w: bw, h: bh } = dims(b);
      if (
        cx >= b.position.x &&
        cx <= b.position.x + bw &&
        cy >= b.position.y &&
        cy <= b.position.y + bh
      ) {
        membership.set(n.id, b.id);
        break;
      }
    }
  }
  return membership;
}

/**
 * Recompute grouping from geometry: absolutize → membership → parentId +
 * relative positions → parents-before-children ordering (RF requirement).
 * Idempotent on absolute geometry. Call after any drop/resize/setAll/layout.
 */
export function applyGrouping(nodes: AppNode[]): AppNode[] {
  // Collect prior parentIds before absolutizeAll strips them
  const priorParentIds = new Map(
    nodes.filter((n) => n.parentId).map((n) => [n.id, n.parentId!]),
  );
  const abs = absolutizeAll(nodes);
  const membership = computeMembership(abs, priorParentIds);
  const byId = new Map(abs.map((n) => [n.id, n]));
  const grouped = abs.map((n) => {
    const parentId = membership.get(n.id);
    if (!parentId) return n;
    const parent = byId.get(parentId)!;
    return {
      ...n,
      parentId,
      position: {
        x: n.position.x - parent.position.x,
        y: n.position.y - parent.position.y,
      },
    } as AppNode;
  });
  const boundaries = grouped.filter((n) => n.type === "boundaryNode");
  const rest = grouped.filter((n) => n.type !== "boundaryNode");
  return [...boundaries, ...rest];
}
