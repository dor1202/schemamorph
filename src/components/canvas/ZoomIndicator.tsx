import { useEffect, useRef, useState } from "react";
import { useViewport } from "@xyflow/react";
import { useIsCoarsePointer } from "@/hooks/useMediaQuery";

export function ZoomIndicator() {
  const isCoarse = useIsCoarsePointer();
  const { zoom } = useViewport();
  const [visible, setVisible] = useState(false);
  const mounted = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip initial mount — only show on subsequent zoom changes
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    setVisible(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 1500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [zoom]);

  // Fine pointers (desktop) already show a persistent % readout in
  // CanvasControls — the transient indicator is coarse-pointer only.
  if (!isCoarse || !visible) return null;

  return (
    <div
      data-testid="zoom-indicator"
      className="absolute top-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none text-xs border border-[var(--border)] bg-[var(--panel)] rounded-full px-2 py-0.5 transition-opacity"
    >
      {Math.round(zoom * 100)}%
    </div>
  );
}
