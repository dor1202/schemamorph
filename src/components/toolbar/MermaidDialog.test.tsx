// src/components/toolbar/MermaidDialog.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MermaidDialog } from "./MermaidDialog";
import { useStore } from "@/state/store";

describe("MermaidDialog", () => {
  beforeEach(() => {
    useStore.getState().reset();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders nothing when closed", () => {
    render(<MermaidDialog open={false} onClose={() => {}} />);
    expect(screen.queryByLabelText("Paste Mermaid diagram")).toBeNull();
  });

  it("shows textarea, Import, Cancel, and Load .mmd file when open", () => {
    render(<MermaidDialog open onClose={() => {}} />);
    expect(screen.getByLabelText("Paste Mermaid diagram")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Load .mmd file" }),
    ).toBeInTheDocument();
  });

  it("imports a valid diagram into the store and closes", () => {
    const onClose = vi.fn();
    render(<MermaidDialog open onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(useStore.getState().nodes).toHaveLength(2);
    expect(useStore.getState().edges).toHaveLength(1);
    expect(onClose).toHaveBeenCalled();
  });

  it("lays out imported nodes (positions not all 0,0)", () => {
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    const positions = useStore
      .getState()
      .nodes.map((n) => `${n.position.x},${n.position.y}`);
    expect(new Set(positions).size).toBe(2);
  });

  it("shows inline error on invalid input and leaves canvas untouched", () => {
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "%% nothing here" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(screen.getByRole("alert")).toHaveTextContent("No nodes found");
    expect(useStore.getState().nodes).toHaveLength(0);
  });

  it("asks for confirmation when canvas is non-empty; cancel aborts", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(confirmSpy).toHaveBeenCalledWith("Replace current diagram?");
    expect(useStore.getState().nodes).toHaveLength(1); // untouched
  });

  it("replaces canvas when confirmed", () => {
    useStore.getState().addNode("database", "postgresql", { x: 0, y: 0 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MermaidDialog open onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText("Paste Mermaid diagram"), {
      target: { value: "flowchart LR\n A --> B" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(useStore.getState().nodes).toHaveLength(2);
  });

  it("Cancel calls onClose without importing", () => {
    const onClose = vi.fn();
    render(<MermaidDialog open onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(useStore.getState().nodes).toHaveLength(0);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<MermaidDialog open onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on backdrop click but not on panel click", () => {
    const onClose = vi.fn();
    render(<MermaidDialog open onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Paste Mermaid diagram"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("mermaid-dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dialog panel has ARIA dialog role and label", () => {
    render(<MermaidDialog open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "mermaid-dialog-title");
    expect(screen.getByText("Import Mermaid")).toHaveAttribute(
      "id",
      "mermaid-dialog-title",
    );
  });
});
