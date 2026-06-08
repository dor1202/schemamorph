import { memo } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { useStore } from "@/state/store";
import type { BoundaryNode } from "@/lib/types";

export const BoundaryNodeComponent = memo(
  ({ data, selected }: NodeProps<BoundaryNode>) => {
    const locked = useStore((s) => s.locked);
    const ring = selected
      ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
      : "";

    const borderColor = data.color ?? "var(--muted)";
    const labelColor = data.color ?? "var(--muted)";

    return (
      <div
        data-testid="boundary-node"
        className={`relative h-full w-full rounded-xl border border-dashed ${ring}`}
        style={{
          borderColor,
          background: "color-mix(in srgb, var(--muted) 4%, transparent)",
          minWidth: 160,
          minHeight: 120,
        }}
      >
        <NodeResizer
          isVisible={selected && !locked}
          minWidth={160}
          minHeight={120}
          onResizeEnd={() => useStore.getState().regroup()}
        />
        <span
          className="absolute left-2 top-1.5 text-xs"
          style={{ color: labelColor }}
        >
          {data.label}
        </span>
      </div>
    );
  },
);
BoundaryNodeComponent.displayName = "BoundaryNodeComponent";
