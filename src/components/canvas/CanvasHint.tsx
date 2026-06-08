import { useStore } from "@/state/store";
import { useIsCoarsePointer } from "@/hooks/useMediaQuery";
import { getTool } from "@/lib/catalog";

export function CanvasHint() {
  const locked = useStore((s) => s.locked);
  const dragging = useStore((s) => s.dragging);
  const armedTool = useStore((s) => s.armedTool);
  const touchSelectMode = useStore((s) => s.touchSelectMode);
  const isCoarse = useIsCoarsePointer();

  let message: string;

  if (locked) {
    message = "Diagram is locked — unlock to edit";
  } else if (dragging && isCoarse) {
    message = "Drop on the bin to delete";
  } else if (armedTool) {
    if (armedTool.kind === "tool") {
      const label = getTool(armedTool.tool)?.label ?? "";
      message = `Tap the canvas to place ${label}`;
    } else {
      message = `Tap the canvas to place a ${armedTool.kind}`;
    }
  } else if (touchSelectMode) {
    message = "Drag to select multiple items";
  } else if (isCoarse) {
    message = "Swipe up the bottom bar to pick components";
  } else {
    message = "Drag components from the palette • Right-drag or scroll to pan";
  }

  return (
    <div
      data-testid="canvas-hint"
      className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-xs text-[var(--muted)]"
    >
      {message}
    </div>
  );
}
