import { Panel, useReactFlow, useViewport } from "@xyflow/react";
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2 } from "lucide-react";
import { useStore } from "@/state/store";

const buttonCls =
  "flex h-8 w-8 items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card)]";

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  return (
    <Panel position="bottom-left">
      <div className="flex flex-row items-stretch overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-lg divide-x divide-[var(--border)]">
        <button
          aria-label="Zoom out"
          className={buttonCls}
          onClick={() => zoomOut({ duration: 150 })}
        >
          <ZoomOut size={14} strokeWidth={2} />
        </button>
        {/* live zoom % — click resets to 150% */}
        <button
          aria-label="Reset zoom to 150%"
          title="Reset zoom to 150%"
          className="flex h-8 w-12 items-center justify-center text-[11px] tabular-nums text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card)]"
          onClick={() => zoomTo(1.5, { duration: 150 })}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          aria-label="Zoom in"
          className={buttonCls}
          onClick={() => zoomIn({ duration: 150 })}
        >
          <ZoomIn size={14} strokeWidth={2} />
        </button>
        <button
          aria-label="Fit view"
          className={buttonCls}
          onClick={() => fitView({ duration: 300, padding: 0.2 })}
        >
          <Maximize2 size={14} strokeWidth={2} />
        </button>
        <button
          aria-label="Undo"
          className={`${buttonCls} disabled:opacity-40`}
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 size={14} strokeWidth={2} />
        </button>
        <button
          aria-label="Redo"
          className={`${buttonCls} disabled:opacity-40`}
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 size={14} strokeWidth={2} />
        </button>
      </div>
    </Panel>
  );
}
