import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useStore } from "@/state/store";
import { SysNodeComponent } from "./SysNode";
import { NoteNodeComponent } from "./NoteNode";
import { BoundaryNodeComponent } from "./BoundaryNode";
import { StepNodeComponent } from "./StepNode";
import { ArrowNodeComponent } from "./ArrowNode";
import { SysEdgeComponent } from "./SysEdge";
import { CanvasControls } from "./CanvasControls";
import { ZoomIndicator } from "./ZoomIndicator";
import { getArchetype } from "@/lib/catalog";
import { useIsCoarsePointer } from "@/hooks/useMediaQuery";

const nodeTypes = {
  sysNode: SysNodeComponent,
  noteNode: NoteNodeComponent,
  boundaryNode: BoundaryNodeComponent,
  stepNode: StepNodeComponent,
  arrowNode: ArrowNodeComponent,
};
const edgeTypes: EdgeTypes = { sysEdge: SysEdgeComponent };

export const DND_MIME = "application/sysdraw-node";

/** Extract pointer coordinates from a React Flow drag event (MouseEvent | TouchEvent). */
function dragEventCoords(
  event: MouseEvent | TouchEvent,
): { clientX: number; clientY: number } | null {
  if ("clientX" in event)
    return { clientX: event.clientX, clientY: event.clientY };
  const t = event.touches[0] ?? event.changedTouches[0];
  if (!t) return null;
  return { clientX: t.clientX, clientY: t.clientY };
}

function isInsideBinEl(
  coords: { clientX: number; clientY: number } | null,
  binEl: HTMLElement,
): boolean {
  if (!coords) return false;
  const r = binEl.getBoundingClientRect();
  return (
    coords.clientX >= r.left &&
    coords.clientX <= r.right &&
    coords.clientY >= r.top &&
    coords.clientY <= r.bottom
  );
}

export function Canvas() {
  const nodes = useStore((s) => s.nodes);
  const edges = useStore((s) => s.edges);
  const onNodesChange = useStore((s) => s.onNodesChange);
  const onEdgesChange = useStore((s) => s.onEdgesChange);
  const onConnect = useStore((s) => s.onConnect);
  const snapshot = useStore((s) => s.snapshot);
  const addNode = useStore((s) => s.addNode);
  const addNote = useStore((s) => s.addNote);
  const addBoundary = useStore((s) => s.addBoundary);
  const addStep = useStore((s) => s.addStep);
  const addArrow = useStore((s) => s.addArrow);
  const theme = useStore((s) => s.theme);
  const locked = useStore((s) => s.locked);
  const regroup = useStore((s) => s.regroup);
  const setPanelSuppressed = useStore((s) => s.setPanelSuppressed);
  const showMinimap = useStore((s) => s.showMinimap);
  const touchSelectMode = useStore((s) => s.touchSelectMode);
  const setTouchSelectMode = useStore((s) => s.setTouchSelectMode);
  const armedTool = useStore((s) => s.armedTool);
  const armTool = useStore((s) => s.armTool);
  const dragging = useStore((s) => s.dragging);
  const setDragging = useStore((s) => s.setDragging);
  const setOverBin = useStore((s) => s.setOverBin);
  const deleteNodes = useStore((s) => s.deleteNodes);
  const isCoarse = useIsCoarsePointer();
  const { screenToFlowPosition } = useReactFlow();

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (locked) return;
      const raw = event.dataTransfer.getData(DND_MIME);
      if (!raw) return;
      const payload = JSON.parse(raw) as {
        kind?: "note" | "title" | "boundary" | "step" | "arrow";
        archetype?: string;
        tool?: string;
      };
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      if (payload.kind === "note") {
        addNote(position);
        return;
      }
      if (payload.kind === "title") {
        addNote(position, { size: "title", text: "Title" });
        return;
      }
      if (payload.kind === "boundary") {
        addBoundary(position);
        return;
      }
      if (payload.kind === "step") {
        addStep(position);
        return;
      }
      if (payload.kind === "arrow") {
        addArrow(position);
        return;
      }
      const { archetype = "", tool = "" } = payload;
      const concreteTool = tool || getArchetype(archetype)?.defaultTool || "";
      addNode(archetype, concreteTool, position);
    },
    [
      screenToFlowPosition,
      addNode,
      addNote,
      addBoundary,
      addStep,
      addArrow,
      locked,
    ],
  );

  return (
    <div className="h-full w-full" data-testid="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodesDraggable={!locked}
        nodesConnectable={!locked}
        onNodeDragStart={() => {
          if (!locked) {
            snapshot();
            setPanelSuppressed(true);
            if (isCoarse) setDragging(true);
          }
        }}
        onNodeDrag={(event) => {
          if (!isCoarse) return;
          const binEl = document.getElementById("delete-bin");
          if (!binEl) return;
          setOverBin(isInsideBinEl(dragEventCoords(event), binEl));
        }}
        onNodeDragStop={(event, node) => {
          if (isCoarse) {
            // Check if pointer ended over the delete bin
            const binEl = document.getElementById("delete-bin");
            if (binEl && isInsideBinEl(dragEventCoords(event), binEl)) {
              // Collect selected node ids plus the dragged node (dedupe)
              const selectedIds = useStore
                .getState()
                .nodes.filter((n) => n.selected)
                .map((n) => n.id);
              const ids = [...new Set([node.id, ...selectedIds])];
              deleteNodes(ids);
              setDragging(false);
              setOverBin(false);
              return; // skip regroup — deleteNodes already regroups
            }
            setDragging(false);
            setOverBin(false);
          }
          if (!locked) regroup();
        }}
        onSelectionStart={() => setPanelSuppressed(true)}
        onSelectionEnd={() => {
          if (isCoarse && touchSelectMode) setTouchSelectMode(false);
        }}
        onNodeClick={() => setPanelSuppressed(false)}
        onPaneClick={(e) => {
          setPanelSuppressed(false);
          if (!armedTool || locked) return;
          const position = screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
          switch (armedTool.kind) {
            case "tool":
              addNode(armedTool.archetype, armedTool.tool, position);
              break;
            case "note":
              addNote(position);
              break;
            case "title":
              addNote(position, { size: "title", text: "Title" });
              break;
            case "boundary":
              addBoundary(position);
              break;
            case "step":
              addStep(position);
              break;
            case "arrow":
              addArrow(position);
              break;
          }
          armTool(null);
        }}
        onDrop={onDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        deleteKeyCode={null}
        // RF defaults cap zoom at 2× / floor 0.5× — widen for detail work + big diagrams
        minZoom={0.1}
        maxZoom={3}
        // keep z-order policy fixed (boundary -1 / tool 0 / note 1) — without this,
        // selecting a boundary elevates it above inner nodes and steals their clicks
        elevateNodesOnSelect={false}
        fitView
        proOptions={{ hideAttribution: false }}
        colorMode={theme === "light" ? "light" : "dark"}
        panOnScroll
        panOnScrollSpeed={0.8}
        zoomOnPinch
        zoomOnScroll={false}
        selectionOnDrag={isCoarse ? touchSelectMode : true}
        panOnDrag={isCoarse ? !touchSelectMode && !dragging : [1, 2]}
        selectionMode={SelectionMode.Partial}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          color="var(--canvas-dot)"
        />
        {!isCoarse && <CanvasControls />}
        <ZoomIndicator />
        {showMinimap && <MiniMap pannable zoomable />}
      </ReactFlow>
    </div>
  );
}
