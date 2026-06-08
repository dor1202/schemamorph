import { useEffect, useRef, useState, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Toaster } from "sonner";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { Palette } from "@/components/sidebar/Palette";
import { Canvas } from "@/components/canvas/Canvas";
import { ConfigPanel } from "@/components/config-panel/ConfigPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { restoreAutosave, startAutosave } from "@/state/autosave";
import { restoreFromShareHash } from "@/state/share-boot";
import { useStore } from "@/state/store";
import {
  loadSidebarPrefs,
  saveSidebarPrefs,
  clampLeftWidth,
  clampRightWidth,
} from "@/lib/sidebar-prefs";
import { useIsPhone } from "@/hooks/useMediaQuery";
import { PhoneTopBar } from "@/components/mobile/PhoneTopBar";
import { PaletteSheet } from "@/components/mobile/PaletteSheet";
import { ConfigSheet } from "@/components/mobile/ConfigSheet";
import { DeleteBin } from "@/components/mobile/DeleteBin";
import { CanvasHint } from "@/components/canvas/CanvasHint";

function ResizeHandle({
  side,
  onResize,
}: {
  side: "left" | "right";
  onResize: (delta: number) => void;
}) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startX.current;
      startX.current = e.clientX;
      onResize(side === "left" ? dx : -dx);
    },
    [onResize, side],
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={
        side === "left" ? "Resize left sidebar" : "Resize right sidebar"
      }
      className="w-1 shrink-0 cursor-col-resize hover:bg-[var(--accent)] active:bg-[var(--accent)]"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  );
}

const COLLAPSED_WIDTH = 36;

export default function App() {
  useKeyboardShortcuts();
  const booted = useRef(false);
  const theme = useStore((s) => s.theme);
  const locked = useStore((s) => s.locked);

  // Load initial sidebar widths from localStorage
  const [leftWidth, setLeftWidth] = useState(() => {
    const p = loadSidebarPrefs();
    return p.leftWidth;
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const p = loadSidebarPrefs();
    return p.rightWidth;
  });
  // Mirror palette's collapsed state here so the container width is correct
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return loadSidebarPrefs().collapsed;
  });

  useEffect(() => {
    if (booted.current) return; // StrictMode double-invoke guard
    booted.current = true;
    void (async () => {
      const shared = await restoreFromShareHash();
      if (!shared) restoreAutosave(); // share hash wins over autosave for this boot
      startAutosave(); // app-lifetime subscription — deliberately NOT returned as cleanup:
      // StrictMode's mount→unmount→mount would unsubscribe and the guard would block re-start
    })();
  }, []);

  // Persist width changes
  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((w) => {
      const next = clampLeftWidth(w + delta);
      const prefs = loadSidebarPrefs();
      saveSidebarPrefs({ ...prefs, leftWidth: next });
      return next;
    });
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((w) => {
      const next = clampRightWidth(w + delta);
      const prefs = loadSidebarPrefs();
      saveSidebarPrefs({ ...prefs, rightWidth: next });
      return next;
    });
  }, []);

  const isPhone = useIsPhone();

  const effectiveLeftWidth =
    sidebarCollapsed || locked ? COLLAPSED_WIDTH : leftWidth;

  // Visibility: selection-driven, suppressed while dragging, and forced off when locked (panel fields are also individually disabled as defense-in-depth).
  const isPanelVisible = useStore((s) => {
    if (s.locked) return false;
    const node = s.nodes.find((n) => n.selected);
    const edge = s.edges.find((e) => e.selected);
    return (!!node && !s.panelSuppressed) || !!edge;
  });

  if (isPhone) {
    return (
      <ReactFlowProvider>
        <div className="flex h-full flex-col">
          <PhoneTopBar />
          <div className="relative min-h-0 flex-1 pb-[56px]">
            <CanvasHint />
            <Canvas />
          </div>
          <PaletteSheet />
          <ConfigSheet />
          <DeleteBin />
        </div>
        <Toaster theme={theme} position="top-center" />
      </ReactFlowProvider>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col">
        <Toolbar />
        <div className="flex min-h-0 flex-1">
          <div
            style={{
              width: effectiveLeftWidth,
              minWidth: effectiveLeftWidth,
              flexShrink: 0,
            }}
          >
            <Palette onCollapsedChange={setSidebarCollapsed} />
          </div>
          {!sidebarCollapsed && !locked && (
            <ResizeHandle side="left" onResize={handleLeftResize} />
          )}
          {/* overflow-hidden clips the overlay's off-screen slide — prevents horizontal scroll */}
          <div className="relative flex-1 min-w-0 overflow-hidden">
            <CanvasHint />
            <Canvas />
            {/* Overlay panel — floats over canvas, canvas width never changes.
                Slide-in via translate-x transition: hidden → translate-x-full (off screen right),
                visible → translate-x-0. Simple, no layout reflow. */}
            <div
              data-testid="config-panel-overlay"
              className={`absolute top-0 bottom-0 right-0 z-10 flex shadow-2xl transition-transform duration-200 ${
                isPanelVisible ? "translate-x-0" : "translate-x-full"
              }`}
              style={{ width: rightWidth, minWidth: rightWidth }}
            >
              {/* Resize handle: left edge of the overlay, same role/behaviour as before */}
              <ResizeHandle side="right" onResize={handleRightResize} />
              <div className="flex-1 min-w-0">
                <ConfigPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Toaster theme={theme} position="bottom-right" />
    </ReactFlowProvider>
  );
}
