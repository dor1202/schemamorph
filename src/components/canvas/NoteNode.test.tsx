import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { NoteNodeComponent } from "./NoteNode";
import { useStore } from "@/state/store";
import type { NoteNode } from "@/lib/types";

const nodeTypes = { noteNode: NoteNodeComponent };

function renderNote(data: NoteNode["data"], id = "note1") {
  const nodes: NoteNode[] = [
    { id, type: "noteNode", position: { x: 0, y: 0 }, data },
  ];
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
}

/**
 * Render NoteNodeComponent directly (bypassing ReactFlow's canvas) for interaction tests.
 * ReactFlow does not reliably call custom node components in jsdom, so direct rendering
 * is used for dblClick, blur, and keyDown tests.
 */
function renderNoteDirect(
  data: NoteNode["data"],
  id: string,
  props?: Partial<React.ComponentProps<typeof NoteNodeComponent>>,
) {
  // Minimal NodeProps-compatible mock
  const nodeProps = {
    id,
    data,
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    type: "noteNode" as const,
    dragging: false,
    ...props,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return render(<NoteNodeComponent {...(nodeProps as any)} />);
}

beforeEach(() => useStore.getState().reset());

describe("NoteNode", () => {
  it("renders the text content (via ReactFlow)", () => {
    renderNote({ text: "100M DAU" });
    expect(screen.getByText("100M DAU")).toBeInTheDocument();
  });

  it("has amber tinted appearance (data-testid present, via ReactFlow)", () => {
    renderNote({ text: "p95 < 200ms" });
    const el = screen.getByTestId("note-node");
    expect(el).toBeInTheDocument();
  });

  it("double-click enters edit mode — shows textarea", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "hello" }, id);
    const el = screen.getByTestId("note-node");
    act(() => {
      fireEvent.dblClick(el);
    });
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("textarea commit on blur updates store", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "hello" }, id);

    const el = screen.getByTestId("note-node");
    act(() => {
      fireEvent.dblClick(el);
    });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "updated note" } });
      fireEvent.blur(ta);
    });

    const noteNode = useStore
      .getState()
      .nodes.find((n) => n.id === id) as NoteNode;
    expect(noteNode.data.text).toBe("updated note");
  });

  it("uses data.color for background and border when provided", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "hello", color: "#3b82f6" }, id);
    const el = screen.getByTestId("note-node");
    // jsdom converts hex to rgba; #3b82f6 → rgb(59, 130, 246)
    const styleAttr = el.getAttribute("style") ?? "";
    expect(styleAttr).toContain("59, 130, 246");
  });

  it("falls back to amber when no color set", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "hello" }, id);
    const el = screen.getByTestId("note-node");
    // amber default #fbbf24 → rgb(251, 191, 36)
    const styleAttr = el.getAttribute("style") ?? "";
    expect(styleAttr).toContain("251, 191, 36");
  });

  // --- size variants ---

  it("small size applies text-[10px] class", () => {
    useStore.getState().addNote({ x: 0, y: 0 }, { size: "small" });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "tiny", size: "small" }, id);
    const span = screen.getByText("tiny");
    expect(span.className).toContain("text-[10px]");
  });

  it("title size applies text-2xl and font-bold class", () => {
    useStore
      .getState()
      .addNote({ x: 0, y: 0 }, { size: "title", text: "Title" });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "Title", size: "title" }, id);
    const span = screen.getByText("Title");
    expect(span.className).toContain("text-2xl");
    expect(span.className).toContain("font-bold");
  });

  it("title variant: no background style (transparent bg)", () => {
    useStore
      .getState()
      .addNote({ x: 0, y: 0 }, { size: "title", text: "Title" });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "Title", size: "title" }, id);
    const el = screen.getByTestId("note-node");
    const style = el.getAttribute("style") ?? "";
    // Title has no background hex color (no alpha-tinted bg)
    expect(style).not.toMatch(/background.*#/);
  });

  it("title variant uses data.color as text color", () => {
    useStore
      .getState()
      .addNote({ x: 0, y: 0 }, { size: "title", text: "Title" });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "Title", size: "title", color: "#ef4444" }, id);
    const el = screen.getByTestId("note-node");
    const style = el.getAttribute("style") ?? "";
    // jsdom converts #ef4444 → rgb(239, 68, 68)
    expect(style).toContain("239, 68, 68");
  });

  it("Escape cancels edit without updating", () => {
    useStore.getState().addNote({ x: 0, y: 0 });
    const id = useStore.getState().nodes[0].id;
    renderNoteDirect({ text: "original" }, id);

    act(() => {
      fireEvent.dblClick(screen.getByTestId("note-node"));
    });
    const ta = screen.getByRole("textbox") as HTMLTextAreaElement;
    act(() => {
      fireEvent.change(ta, { target: { value: "discarded" } });
      fireEvent.keyDown(ta, { key: "Escape" });
    });

    const noteNode = useStore
      .getState()
      .nodes.find((n) => n.id === id) as NoteNode;
    expect(noteNode.data.text).toBe("Note"); // default, unchanged
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
