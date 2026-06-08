import { memo, useState, useRef, useEffect } from "react";
import type { NodeProps } from "@xyflow/react";
import { useStore } from "@/state/store";
import type { NoteNode } from "@/lib/types";

export const NoteNodeComponent = memo(
  ({ id, data, selected }: NodeProps<NoteNode>) => {
    const locked = useStore((s) => s.locked);
    const updateNodeData = useStore((s) => s.updateNodeData);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(data.text);
    const taRef = useRef<HTMLTextAreaElement>(null);

    // Keep draft in sync with data.text when not editing (e.g. ConfigPanel update)
    useEffect(() => {
      if (!editing) setDraft(data.text);
    }, [data.text, editing]);

    const startEdit = () => {
      if (locked) return;
      setDraft(data.text);
      setEditing(true);
    };

    const commit = () => {
      updateNodeData(id, { text: draft });
      setEditing(false);
    };

    const cancel = () => {
      setDraft(data.text);
      setEditing(false);
    };

    const ring = selected
      ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
      : "";

    const baseColor = data.color ?? "#fbbf24";
    const size = data.size ?? "normal";
    const isTitle = size === "title";

    // Size-based text class
    const textSizeCls =
      size === "small"
        ? "text-[10px]"
        : size === "title"
          ? "text-2xl font-bold"
          : "text-xs";

    // Title variant: no bg/border, text color from color prop
    const containerStyle = isTitle
      ? {
          color: data.color ?? "var(--text)",
          whiteSpace: "pre-wrap" as const,
          wordBreak: "break-word" as const,
        }
      : {
          background: `${baseColor}15`,
          borderColor: `${baseColor}40`,
          whiteSpace: "pre-wrap" as const,
          wordBreak: "break-word" as const,
          boxShadow: "var(--node-shadow)",
        };

    const containerCls = isTitle
      ? `relative min-w-[80px] ${ring}`
      : `relative min-w-[120px] min-h-[60px] rounded-md border p-2 ${ring}`;

    return (
      <div
        data-testid="note-node"
        onDoubleClick={startEdit}
        className={containerCls}
        style={containerStyle}
      >
        {editing ? (
          <textarea
            ref={taRef}
            autoFocus
            className={`w-full min-h-[48px] resize-none bg-transparent ${textSizeCls} text-[var(--text)] outline-none`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                cancel();
              }
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                commit();
              }
            }}
          />
        ) : (
          <span
            className={textSizeCls}
            style={isTitle ? {} : { color: "var(--text)" }}
          >
            {data.text}
          </span>
        )}
      </div>
    );
  },
);
NoteNodeComponent.displayName = "NoteNodeComponent";
