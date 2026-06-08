import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import type { StepNode } from "@/lib/types";

export const StepNodeComponent = memo(
  ({ data, selected }: NodeProps<StepNode>) => {
    const bgColor = data.color ?? "#3b82f6";
    const displayText =
      data.label ?? (data.n !== undefined ? String(data.n) : "");

    const ring = selected
      ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
      : "";

    return (
      <div
        data-testid="step-node"
        className={`flex items-center justify-center rounded-full font-bold text-white select-none ${ring}`}
        style={{
          minWidth: 36,
          height: 36,
          paddingLeft: 10,
          paddingRight: 10,
          background: bgColor,
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        {displayText}
      </div>
    );
  },
);
StepNodeComponent.displayName = "StepNodeComponent";
