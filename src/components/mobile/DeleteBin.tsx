// src/components/mobile/DeleteBin.tsx
import { Trash2 } from "lucide-react";
import { useStore } from "@/state/store";

/**
 * Fixed-position delete bin that appears at the bottom center of the screen
 * during a node drag gesture. Dragging a node onto it deletes it.
 * Only rendered on the phone layout (mounted in App's phone branch).
 */
export function DeleteBin() {
  const dragging = useStore((s) => s.dragging);
  const overBin = useStore((s) => s.overBin);

  if (!dragging) return null;

  return (
    <div
      id="delete-bin"
      data-testid="delete-bin"
      className={`fixed bottom-6 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-colors ${
        overBin
          ? "border-red-500 bg-red-500/20 text-red-500"
          : "border-[var(--border)] bg-[var(--panel)] text-[var(--muted)]"
      }`}
    >
      <Trash2 size={22} strokeWidth={2} />
    </div>
  );
}
