import { memo, useRef, useCallback } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import { useStore } from "@/state/store";
import { themedColor } from "@/lib/color";
import type { ArrowNode } from "@/lib/types";

export const ArrowNodeComponent = memo(
  ({
    id,
    data,
    selected,
    positionAbsoluteX = 0,
    positionAbsoluteY = 0,
  }: NodeProps<ArrowNode>) => {
    const locked = useStore((s) => s.locked);
    const theme = useStore((s) => s.theme);
    const isLight = theme === "light";

    const { screenToFlowPosition } = useReactFlow();
    const snapshot = useStore((s) => s.snapshot);
    const updateArrowEnd = useStore((s) => s.updateArrowEnd);
    const setNodes = useStore((s) => s.setNodes);
    const nodes = useStore((s) => s.nodes);

    const { dx, dy } = data;

    // PAD gives the wrapper a non-zero footprint so React Flow's ResizeObserver
    // reports real dimensions (never 0×0) and so the line/marker are never clipped.
    const PAD = 8;

    // Bounding box: coords inside SVG are always non-negative.
    // START point in flow coords = node.position = (positionAbsoluteX, positionAbsoluteY)
    // END point in flow coords   = (positionAbsoluteX + dx, positionAbsoluteY + dy)
    //
    // Local SVG coords:
    //   offsetX = max(0, -dx)  — shift right if dx < 0 so START stays inside svg
    //   offsetY = max(0, -dy)  — shift down  if dy < 0 so START stays inside svg
    const offsetX = Math.max(0, -dx);
    const offsetY = Math.max(0, -dy);
    const svgW = Math.abs(dx);
    const svgH = Math.abs(dy);

    // Padded wrapper dimensions — always at least 2*PAD so the node is never 0×0.
    const wrapperW = svgW + 2 * PAD;
    const wrapperH = svgH + 2 * PAD;

    // SVG line coords: shifted by PAD so the line/marker fits inside the padded box.
    const x1 = offsetX + PAD; // START
    const y1 = offsetY + PAD;
    const x2 = offsetX + dx + PAD; // END = start + vector
    const y2 = offsetY + dy + PAD;

    const strokeColor =
      selected && !data.color
        ? "var(--accent)"
        : data.color
          ? isLight
            ? themedColor(data.color, isLight)
            : data.color
          : "var(--muted)";

    const markerId = `arrow-head-${id}`;

    const lineStyle = data.lineStyle ?? "solid";
    const dashArray =
      lineStyle === "dashed" ? "8 6" : lineStyle === "dotted" ? "2 5" : "";
    const lineCap = lineStyle === "dotted" ? "round" : undefined;

    const showGrips = selected && !locked;

    // ── Drag state refs ────────────────────────────────────────────────────────
    const draggingRef = useRef<"start" | "end" | null>(null);
    const snappedRef = useRef(false);

    const MIN_LEN = 12;

    const handleEndGripPointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (locked) return;
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        draggingRef.current = "end";
        snappedRef.current = false;
        snapshot();
      },
      [locked, snapshot],
    );

    const handleStartGripPointerDown = useCallback(
      (e: React.PointerEvent) => {
        if (locked) return;
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        draggingRef.current = "start";
        snappedRef.current = false;
        snapshot();
      },
      [locked, snapshot],
    );

    const handleGripPointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!draggingRef.current || locked) return;
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });

        if (draggingRef.current === "end") {
          // END grip: update dx/dy so END = flowPos
          // START (node.position) stays fixed
          const newDx = flowPos.x - positionAbsoluteX;
          const newDy = flowPos.y - positionAbsoluteY;
          const len = Math.sqrt(newDx * newDx + newDy * newDy);
          if (len >= MIN_LEN) {
            updateArrowEnd(id, { dx: newDx, dy: newDy });
          }
        } else {
          // START grip: node.position = flowPos; adjust dx/dy so END stays fixed
          const endX = positionAbsoluteX + dx;
          const endY = positionAbsoluteY + dy;
          const newDx = endX - flowPos.x;
          const newDy = endY - flowPos.y;
          const len = Math.sqrt(newDx * newDx + newDy * newDy);
          if (len >= MIN_LEN) {
            setNodes(
              nodes.map((n) =>
                n.id === id
                  ? ({
                      ...n,
                      position: { x: flowPos.x, y: flowPos.y },
                      data: { ...n.data, dx: newDx, dy: newDy },
                    } as ArrowNode)
                  : n,
              ) as import("@/lib/types").AppNode[],
            );
          }
        }
      },
      [
        locked,
        id,
        dx,
        dy,
        positionAbsoluteX,
        positionAbsoluteY,
        screenToFlowPosition,
        updateArrowEnd,
        setNodes,
        nodes,
      ],
    );

    const handleGripPointerUp = useCallback(() => {
      // Regroup only when the START grip moved (changes node.position).
      // END grip adjusts dx/dy only — no position change, no regrouping needed.
      if (draggingRef.current === "start") {
        useStore.getState().regroup();
      }
      draggingRef.current = null;
    }, []);

    // The RF node wrapper (div) is padded so React Flow's ResizeObserver always
    // reports non-zero dimensions. The negative margin shifts the wrapper so that
    // node.position (START) still maps to the correct flow-space coordinate.
    const wrapperStyle: React.CSSProperties = {
      position: "relative",
      width: wrapperW,
      height: wrapperH,
      marginLeft: -(offsetX + PAD),
      marginTop: -(offsetY + PAD),
      // Keep wrapper transparent so it doesn't block canvas interactions outside
      // the actual arrow line. We keep pointer-events at default (not "none") so
      // React Flow's own node wrapper can still capture clicks for node selection;
      // only the background area (not covered by the hit-area line or grips) is
      // transparent and effectively non-interactive.
      background: "transparent",
    };

    const svgStyle: React.CSSProperties = {
      position: "absolute",
      left: 0,
      top: 0,
      width: wrapperW,
      height: wrapperH,
      overflow: "visible",
      pointerEvents: "none",
    };

    const gripStyle: React.CSSProperties = {
      position: "absolute",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "var(--accent)",
      border: "2px solid var(--bg)",
      cursor: "crosshair",
      transform: "translate(-50%, -50%)",
      // "nodrag" class prevents RF from hijacking pointer to drag the node
      pointerEvents: "all",
    };

    return (
      <div data-testid="arrow-node" style={wrapperStyle}>
        {/* SVG arrow line */}
        <svg
          style={svgStyle}
          viewBox={`0 0 ${wrapperW} ${wrapperH}`}
          preserveAspectRatio="none"
        >
          <defs>
            <marker
              id={markerId}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={strokeColor} />
            </marker>
          </defs>
          {/* Visible arrow line */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray={dashArray || undefined}
            strokeLinecap={lineCap}
            markerEnd={`url(#${markerId})`}
            style={{ pointerEvents: "none" }}
          />
          {/* Wide transparent hit area for whole-node drag */}
          <line
            data-testid="arrow-hitarea"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="transparent"
            strokeWidth={12}
            style={{ pointerEvents: "stroke", cursor: "move" }}
          />
        </svg>

        {/* Endpoint grips — only when selected && !locked */}
        {showGrips && (
          <>
            {/* START grip — at (offsetX+PAD, offsetY+PAD) in wrapper coords */}
            <div
              data-testid="arrow-grip"
              className="nodrag"
              style={{
                ...gripStyle,
                left: offsetX + PAD,
                top: offsetY + PAD,
              }}
              onPointerDown={handleStartGripPointerDown}
              onPointerMove={handleGripPointerMove}
              onPointerUp={handleGripPointerUp}
            />
            {/* END grip — at (offsetX+dx+PAD, offsetY+dy+PAD) in wrapper coords */}
            <div
              data-testid="arrow-grip"
              className="nodrag"
              style={{
                ...gripStyle,
                left: offsetX + dx + PAD,
                top: offsetY + dy + PAD,
              }}
              onPointerDown={handleEndGripPointerDown}
              onPointerMove={handleGripPointerMove}
              onPointerUp={handleGripPointerUp}
            />
          </>
        )}
      </div>
    );
  },
);
ArrowNodeComponent.displayName = "ArrowNodeComponent";
