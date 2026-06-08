import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useStore } from "@/state/store";
import type { SysEdge } from "@/lib/types";

export const SysEdgeComponent = memo((props: EdgeProps<SysEdge>) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    selected,
  } = props;
  const setEdges = useStore((s) => s.setEdges);
  const setNodes = useStore((s) => s.setNodes);
  const edges = useStore((s) => s.edges);
  const nodes = useStore((s) => s.nodes);
  const locked = useStore((s) => s.locked);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const text = data?.protocol ?? data?.label ?? "";
  // Selected edges get the accent stroke (slightly thicker); custom color wins otherwise
  const edgeColor = selected
    ? "var(--accent)"
    : (data?.color ?? "var(--muted)");
  const edgeWidth = selected ? 2 : 1.5;

  // Custom properties indicator
  const customProps = data?.customProperties;
  const propCount = customProps ? Object.keys(customProps).length : 0;
  const propTooltip =
    propCount > 0
      ? Object.entries(customProps!)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : undefined;

  // Item 2: When locked and no text, render nothing (hide the "+" affordance)
  const hasText = text.length > 0;
  if (locked && !hasText) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: edgeColor, strokeWidth: edgeWidth }}
      />
    );
  }

  const handleLabelClick = () => {
    // Select this edge, deselect all others, deselect all nodes
    setEdges(edges.map((e) => ({ ...e, selected: e.id === id })));
    setNodes(nodes.map((n) => ({ ...n, selected: false })));
  };

  // Chip label text: text + optional property count suffix
  const chipLabel = propCount > 0 ? `${text || "+"}·${propCount}` : text || "+";
  // When locked and has text, chip text color follows data.color if set
  const chipTextColor = data?.color ? data.color : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: edgeColor, strokeWidth: edgeWidth }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <button
            data-testid={`edge-label-${id}`}
            onClick={handleLabelClick}
            title={propTooltip}
            className={`rounded border bg-[var(--panel)] px-1.5 py-px text-[10px] text-[var(--chip-accent)] ${
              selected ? "border-[var(--accent)]" : "border-[var(--border)]"
            }`}
            style={chipTextColor ? { color: chipTextColor } : undefined}
          >
            {chipLabel}
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
SysEdgeComponent.displayName = "SysEdgeComponent";
