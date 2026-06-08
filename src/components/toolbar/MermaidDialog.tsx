// src/components/toolbar/MermaidDialog.tsx
import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useStore } from "@/state/store";
import { parseMermaid } from "@/lib/mermaid-import";
import { layoutPositions } from "@/lib/layout";
import { MAX_IMPORT_BYTES } from "@/config";

export function MermaidDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Deliberate: keep draft text across Cancel/reopen; cleared only on successful import.
  const close = useCallback(() => {
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  if (!open) return null;

  const handleImport = () => {
    const result = parseMermaid(text);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (
      useStore.getState().nodes.length > 0 &&
      !confirm("Replace current diagram?")
    )
      return;
    const positions = layoutPositions(
      result.nodes,
      result.edges,
      result.direction,
    );
    const nodes = result.nodes.map((n) => {
      const p = positions.get(n.id);
      return p ? { ...n, position: { x: p.x, y: p.y } } : n;
    });
    useStore.getState().setAll(nodes, result.edges);
    setText("");
    setError(null);
    onClose();
    toast.success("Mermaid diagram imported");
  };

  const handleFile = (file: File) => {
    if (file.size > MAX_IMPORT_BYTES) {
      setError("File too large (max 5 MB).");
      return;
    }
    void file.text().then((content) => {
      setText(content);
      setError(null);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="mermaid-dialog"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mermaid-dialog-title"
        className="w-[480px] max-w-[90vw] rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="mermaid-dialog-title" className="mb-2 text-sm font-bold">
          Import Mermaid
        </h2>
        <textarea
          aria-label="Paste Mermaid diagram"
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          placeholder={
            "flowchart LR\n  client[Client] --> api{{API Gateway}}\n  api --> db[(Database)]"
          }
          className="h-48 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--card)] p-2 font-mono text-xs text-[var(--text)]"
        />
        {error && (
          <p role="alert" className="mt-1 text-xs text-red-400">
            {error}
          </p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".mmd,.mermaid,.txt,text/plain"
          className="hidden"
          data-testid="mermaid-file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
        <div className="mt-3 flex justify-between gap-2">
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
          >
            Load .mmd file
          </button>
          <div className="flex gap-2">
            <button
              onClick={close}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              className="rounded-md border border-[var(--accent)] px-3 py-1.5 text-xs text-[var(--accent)] hover:bg-[var(--card)]"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
