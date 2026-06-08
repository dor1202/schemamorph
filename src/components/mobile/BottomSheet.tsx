// src/components/mobile/BottomSheet.tsx
import { useRef, type ReactNode } from "react";

export type SheetDetent = "peek" | "half" | "full";

const DETENT_HEIGHT: Record<SheetDetent, string> = {
  peek: "56px",
  half: "45vh",
  full: "88vh",
};
const ORDER: SheetDetent[] = ["peek", "half", "full"];
/** Vertical drag (px) needed to move one detent step. */
const STEP_THRESHOLD = 60;
/** Max movement (px) that counts as a tap (toggle open/closed). */
const TAP_THRESHOLD = 10;

/**
 * Minimal 3-detent bottom sheet. No animation library, no velocity physics —
 * a drag past the threshold moves exactly one detent step (spec: keep it simple).
 *
 * `heights` — optional per-detent height overrides merged over DETENT_HEIGHT defaults.
 */
export function BottomSheet({
  detent,
  onDetentChange,
  children,
  heights,
}: {
  detent: SheetDetent;
  onDetentChange: (d: SheetDetent) => void;
  children: ReactNode;
  heights?: Partial<Record<SheetDetent, string>>;
}) {
  const effectiveHeights: Record<SheetDetent, string> = heights
    ? { ...DETENT_HEIGHT, ...heights }
    : DETENT_HEIGHT;
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    const dy = e.clientY - startY.current; // negative = dragged up
    startY.current = null;
    // Tap (negligible movement): toggle between peek and expanded
    if (Math.abs(dy) < TAP_THRESHOLD) {
      onDetentChange(detent === "peek" ? "half" : "peek");
      return;
    }
    const idx = ORDER.indexOf(detent);
    if (dy <= -STEP_THRESHOLD && idx < ORDER.length - 1) {
      onDetentChange(ORDER[idx + 1]);
    } else if (dy >= STEP_THRESHOLD && idx > 0) {
      onDetentChange(ORDER[idx - 1]);
    }
  };

  return (
    <div
      data-testid="bottom-sheet"
      data-detent={detent}
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col rounded-t-xl border-t border-x border-[var(--border)] bg-[var(--panel)] shadow-2xl transition-[height] duration-200"
      style={{ height: effectiveHeights[detent] }}
    >
      <div
        data-testid="sheet-handle"
        className="flex shrink-0 cursor-grab justify-center py-2"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="h-1 w-9 rounded-full bg-[var(--muted)]" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">{children}</div>
    </div>
  );
}
