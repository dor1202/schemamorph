import { useEffect } from "react";
import { useStore } from "@/state/store";

const NUDGE = 8;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const store = useStore.getState();
      const mod = e.metaKey || e.ctrlKey;
      const locked = store.locked;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (!locked) {
          if (e.shiftKey) store.redo();
          else store.undo();
        }
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (!locked) store.duplicateSelection();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        store.selectAll();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (!locked) store.deleteSelection();
      } else if (e.key.toLowerCase() === "m" && !mod) {
        store.toggleViewMode();
      } else if (e.key.startsWith("Arrow")) {
        const hasSelection = store.nodes.some((n) => n.selected);
        if (!hasSelection) return;
        e.preventDefault();
        if (!locked) {
          const [dx, dy] = {
            ArrowLeft: [-NUDGE, 0] as [number, number],
            ArrowRight: [NUDGE, 0] as [number, number],
            ArrowUp: [0, -NUDGE] as [number, number],
            ArrowDown: [0, NUDGE] as [number, number],
          }[e.key as "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown"];
          store.nudgeSelection(dx, dy);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
