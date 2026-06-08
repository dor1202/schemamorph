import { useState, useRef, useEffect } from "react";
import { useStore } from "@/state/store";
import { useFileIO } from "@/hooks/useFileIO";
import { clearAutosave } from "@/state/autosave";
import { Segmented, IconButton } from "@/components/ui";
import { MermaidDialog } from "@/components/toolbar/MermaidDialog";
import {
  BoxSelect,
  Link,
  Lock,
  LockOpen,
  Map,
  MoreVertical,
  Sun,
  Moon,
  FolderOpen,
  Save,
  Image,
  FileCode2,
} from "lucide-react";

export function PhoneTopBar() {
  const viewMode = useStore((s) => s.viewMode);
  const setViewMode = useStore((s) => s.setViewMode);
  const locked = useStore((s) => s.locked);
  const toggleLocked = useStore((s) => s.toggleLocked);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const showMinimap = useStore((s) => s.showMinimap);
  const toggleMinimap = useStore((s) => s.toggleMinimap);
  const touchSelectMode = useStore((s) => s.touchSelectMode);
  const setTouchSelectMode = useStore((s) => s.setTouchSelectMode);
  const { exportFile, importFile, exportPng, shareLink } = useFileIO();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        moreButtonRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      )
        return;
      setMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const newCanvas = () => {
    if (!confirm("Clear the canvas and autosave? This cannot be undone."))
      return;
    clearAutosave();
    useStore.getState().reset();
    setMenuOpen(false);
  };

  const menuItemCls =
    "flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-2 py-2 text-xs text-[var(--text)] hover:bg-[var(--card)] disabled:opacity-50 mb-1";

  return (
    <header
      data-testid="phone-top-bar"
      className="relative flex items-center gap-2 border-b border-[var(--border)] bg-[var(--panel)] px-2 py-1.5"
    >
      <img src="/favicon.svg" alt="SchemaMorph" className="h-5 w-5" />
      <span className="flex-1" />
      <Segmented
        value={viewMode}
        onChange={setViewMode}
        options={[
          { value: "minimalist", label: "Min" },
          { value: "real", label: "Real" },
        ]}
      />
      <span className="flex-1" />
      <IconButton
        label="Toggle marquee select"
        onClick={() => setTouchSelectMode(!touchSelectMode)}
        style={
          touchSelectMode
            ? { color: "var(--accent)", borderColor: "var(--accent)" }
            : undefined
        }
      >
        <BoxSelect size={14} strokeWidth={2} />
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
        ref={moreButtonRef}
        label="More"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <MoreVertical size={14} strokeWidth={2} />
      </IconButton>
      <input
        ref={fileInput}
        type="file"
        accept=".schemamorph,.schemaflip,.sysdraw,application/json"
        className="hidden"
        data-testid="phone-file-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importFile(f);
          e.target.value = "";
          setMenuOpen(false);
        }}
      />
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute right-2 top-11 z-50 w-52 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-2 shadow-xl"
        >
          <button
            aria-label="Load file"
            className={menuItemCls}
            onClick={() => fileInput.current?.click()}
          >
            <FolderOpen size={14} strokeWidth={2} /> Load file…
          </button>
          <button
            aria-label="Import Mermaid"
            className={menuItemCls}
            disabled={locked}
            onClick={() => {
              setMermaidOpen(true);
              setMenuOpen(false);
            }}
          >
            <FileCode2 size={14} strokeWidth={2} /> Import Mermaid…
          </button>
          <button
            aria-label="Export .schemamorph"
            className={menuItemCls}
            onClick={() => {
              exportFile();
              setMenuOpen(false);
            }}
          >
            <Save size={14} strokeWidth={2} /> Export .schemamorph
          </button>
          <button
            aria-label="Export PNG"
            className={menuItemCls}
            onClick={() => {
              void exportPng();
              setMenuOpen(false);
            }}
          >
            <Image size={14} strokeWidth={2} /> Export PNG
          </button>
          <button
            aria-label="Copy share link"
            className={menuItemCls}
            onClick={() => {
              void shareLink();
              setMenuOpen(false);
            }}
          >
            <Link size={14} strokeWidth={2} /> Copy share link
          </button>
          <button
            aria-label="Toggle theme"
            className={menuItemCls}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun size={14} strokeWidth={2} />
            ) : (
              <Moon size={14} strokeWidth={2} />
            )}
            Theme
          </button>
          <button
            aria-label="Toggle minimap"
            className={`${menuItemCls} ${showMinimap ? "text-[var(--accent)] border-[var(--accent)]" : ""}`}
            onClick={() => {
              toggleMinimap();
            }}
          >
            <Map size={14} strokeWidth={2} />
            Minimap {showMinimap ? "On" : "Off"}
          </button>
          <button
            aria-label="New canvas"
            className="flex w-full items-center gap-2 rounded-md border border-red-900 px-2 py-2 text-xs text-red-400 hover:bg-red-950"
            onClick={newCanvas}
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
