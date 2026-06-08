import { useRef, useState, useEffect } from "react";
import { useStore } from "@/state/store";
import { useFileIO } from "@/hooks/useFileIO";
import { clearAutosave } from "@/state/autosave";
import { IconButton, Segmented } from "@/components/ui";
import { GITHUB_REPO_URL } from "@/config";
import { getSimpleIcon } from "@/lib/icons";
import {
  FolderOpen,
  Save,
  Image,
  Settings,
  Sun,
  Moon,
  Lock,
  LockOpen,
  Map,
  FileCode2,
  Link,
} from "lucide-react";
import { MermaidDialog } from "./MermaidDialog";

export function Toolbar() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const nodeStyle = useStore((s) => s.nodeStyle);
  const setNodeStyle = useStore((s) => s.setNodeStyle);
  const layoutDirection = useStore((s) => s.layoutDirection);
  const setLayoutDirection = useStore((s) => s.setLayoutDirection);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const locked = useStore((s) => s.locked);
  const toggleLocked = useStore((s) => s.toggleLocked);
  const showMinimap = useStore((s) => s.showMinimap);
  const toggleMinimap = useStore((s) => s.toggleMinimap);
  const { exportFile, importFile, exportPng, shareLink } = useFileIO();
  const fileInput = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);
  const github = getSimpleIcon("github");

  useEffect(() => {
    if (!settingsOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        settingsButtonRef.current?.contains(e.target as Node) ||
        settingsPopoverRef.current?.contains(e.target as Node)
      )
        return;
      setSettingsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [settingsOpen]);

  const newCanvas = () => {
    if (!confirm("Clear the canvas and autosave? This cannot be undone."))
      return;
    clearAutosave();
    useStore.getState().reset();
    setSettingsOpen(false);
  };

  return (
    <header className="relative flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-4 py-2">
      <span className="flex items-center gap-1.5 text-sm font-bold">
        <img src="/favicon.svg" alt="SchemaMorph mark" className="h-5 w-5" />
        SchemaMorph
      </span>
      <span className="flex-1" />
      <Segmented
        value={viewMode}
        onChange={setViewMode}
        options={[
          { value: "minimalist", label: "Minimalist" },
          { value: "real", label: "Real Tools" },
        ]}
      />
      <span className="flex-1" />
      <input
        ref={fileInput}
        type="file"
        accept=".schemamorph,.schemaflip,.sysdraw,application/json"
        className="hidden"
        data-testid="file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            importFile(f);
            setSettingsOpen(false);
          }
          e.target.value = "";
        }}
      />
      <IconButton label="Copy share link" onClick={() => void shareLink()}>
        <Link size={14} strokeWidth={2} />
      </IconButton>
      <IconButton
        label="Toggle lock"
        onClick={toggleLocked}
        style={
          locked
            ? { color: "var(--accent)", borderColor: "var(--accent)" }
            : undefined
        }
      >
        {locked ? (
          <Lock size={14} strokeWidth={2} />
        ) : (
          <LockOpen size={14} strokeWidth={2} />
        )}
      </IconButton>
      <IconButton
        label="Toggle theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? (
          <Sun size={14} strokeWidth={2} />
        ) : (
          <Moon size={14} strokeWidth={2} />
        )}
      </IconButton>
      <IconButton
        ref={settingsButtonRef}
        label="Settings"
        onClick={() => setSettingsOpen(!settingsOpen)}
      >
        <Settings size={14} strokeWidth={2} />
      </IconButton>
      <a
        href={GITHUB_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub repository"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--border)] hover:bg-[var(--card)]"
      >
        {github ? (
          <svg width={16} height={16} viewBox={github.viewBox}>
            <path d={github.path} fill="var(--text)" />
          </svg>
        ) : (
          "GH"
        )}
      </a>

      {settingsOpen && (
        <div
          ref={settingsPopoverRef}
          data-testid="settings-popover"
          className="absolute right-4 top-12 z-50 w-56 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 shadow-xl"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-[var(--muted)]">
            File
          </div>
          <button
            aria-label="Load file"
            onClick={() => fileInput.current?.click()}
            className="mb-1 flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
          >
            <FolderOpen size={14} strokeWidth={2} /> Load file…
          </button>
          <button
            aria-label="Import Mermaid"
            disabled={locked}
            onClick={() => {
              setMermaidOpen(true);
              setSettingsOpen(false);
            }}
            className="mb-1 flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] disabled:opacity-50"
          >
            <FileCode2 size={14} strokeWidth={2} /> Import Mermaid…
          </button>
          <button
            aria-label="Export .schemamorph"
            onClick={() => {
              exportFile();
              setSettingsOpen(false);
            }}
            className="mb-1 flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
          >
            <Save size={14} strokeWidth={2} /> Export .schemamorph
          </button>
          <button
            aria-label="Export PNG"
            onClick={() => {
              exportPng();
              setSettingsOpen(false);
            }}
            className="mb-1 flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)]"
          >
            <Image size={14} strokeWidth={2} /> Export PNG
          </button>
          <div className="mb-1 mt-3 text-[10px] uppercase tracking-widest text-[var(--muted)]">
            Node style
          </div>
          <Segmented
            value={nodeStyle}
            onChange={setNodeStyle}
            options={[
              { value: "symbol", label: "Symbol" },
              { value: "card", label: "Card" },
              { value: "plate", label: "Plate" },
            ]}
          />
          <div className="mb-1 mt-3 text-[10px] uppercase tracking-widest text-[var(--muted)]">
            Tidy direction
          </div>
          <Segmented
            value={layoutDirection}
            onChange={setLayoutDirection}
            options={[
              { value: "LR", label: "Left → Right" },
              { value: "TB", label: "Top → Bottom" },
            ]}
          />
          <div className="mb-1 mt-3 text-[10px] uppercase tracking-widest text-[var(--muted)]">
            Minimap
          </div>
          <button
            aria-label="Toggle minimap"
            onClick={toggleMinimap}
            className={`flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs hover:bg-[var(--card)] ${showMinimap ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text)]"}`}
          >
            <Map size={14} strokeWidth={2} />
            {showMinimap ? "On" : "Off"}
          </button>
          <button
            onClick={newCanvas}
            className="mt-3 w-full rounded-md border border-red-900 px-2 py-1.5 text-xs text-red-400 hover:bg-red-950"
          >
            New canvas
          </button>
          <div
            data-testid="app-version"
            className="mt-2 text-center text-[10px] text-[var(--muted)]"
          >
            SchemaMorph v{__APP_VERSION__}
          </div>
        </div>
      )}
      <MermaidDialog open={mermaidOpen} onClose={() => setMermaidOpen(false)} />
    </header>
  );
}
