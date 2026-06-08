// src/components/mobile/PaletteSheet.tsx
import { useState, useEffect, useRef } from "react";
import { archetypes, toolsForArchetype } from "@/lib/catalog";
import { useStore, type ArmedTool } from "@/state/store";
import { ArchetypeGlyph, ToolIcon } from "@/components/sidebar/palette-icons";
import { BottomSheet, type SheetDetent } from "./BottomSheet";
import {
  StickyNote,
  Heading,
  BoxSelect,
  CircleDot,
  MoveUpRight,
} from "lucide-react";

const ANNOTATIONS: Array<{
  kind: ArmedTool["kind"];
  label: string;
  Icon: typeof StickyNote;
}> = [
  { kind: "note", label: "Note", Icon: StickyNote },
  { kind: "title", label: "Title", Icon: Heading },
  { kind: "boundary", label: "Boundary", Icon: BoxSelect },
  { kind: "step", label: "Step", Icon: CircleDot },
  { kind: "arrow", label: "Arrow", Icon: MoveUpRight },
];

/** Heights used in minimalist mode — compact, two rows only. */
const MINIMALIST_HEIGHTS = { peek: "56px", half: "132px", full: "30vh" };

export function PaletteSheet() {
  const [detent, setDetent] = useState<SheetDetent>("peek");
  // activeArchetype is only used in real mode (chip → tool grid expansion)
  const [activeArchetype, setActiveArchetype] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const armedTool = useStore((s) => s.armedTool);
  const armTool = useStore((s) => s.armTool);
  const viewMode = useStore((s) => s.viewMode);
  const locked = useStore((s) => s.locked);
  const dragging = useStore((s) => s.dragging);

  // Collapse to peek on outside tap when sheet is expanded
  useEffect(() => {
    if (detent === "peek") return;
    const handler = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !(e.target as Element).closest('[data-testid="bottom-sheet"]')
      ) {
        setDetent("peek");
      }
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [detent]);

  if (locked || dragging) return null;

  const isMinimalist = viewMode === "minimalist";

  const q = query.trim().toLowerCase();
  const allTools = Object.keys(archetypes).flatMap((key) =>
    toolsForArchetype(key).map(([slug, tool]) => ({
      slug,
      tool,
      archetype: key,
    })),
  );

  // Search results differ by mode:
  //   real mode     → filter tools by label/slug (existing behavior)
  //   minimalist    → filter archetypes by label, return one entry per archetype
  const searchResults = q
    ? isMinimalist
      ? Object.entries(archetypes)
          .filter(([, a]) => a.label.toLowerCase().includes(q))
          .map(([key, a]) => ({ key, archetype: a }))
      : allTools.filter(
          ({ slug, tool }) =>
            tool.label.toLowerCase().includes(q) || slug.includes(q),
        )
    : null;

  const armToolEntry = (archetype: string, slug: string) => {
    if (armedTool?.kind === "tool" && armedTool.tool === slug) {
      armTool(null);
    } else {
      useStore.getState().setTouchSelectMode(false);
      armTool({ kind: "tool", archetype, tool: slug });
      setDetent("peek");
    }
  };

  /** Minimalist: tap archetype chip to arm its defaultTool directly (toggle). */
  const armArchetypeDefault = (key: string) => {
    const defaultTool = archetypes[key]?.defaultTool;
    if (!defaultTool) return;
    if (
      armedTool?.kind === "tool" &&
      armedTool.archetype === key &&
      armedTool.tool === defaultTool
    ) {
      // already armed → disarm
      armTool(null);
    } else {
      useStore.getState().setTouchSelectMode(false);
      armTool({ kind: "tool", archetype: key, tool: defaultTool });
    }
  };

  const armAnnotation = (kind: Exclude<ArmedTool["kind"], "tool">) => {
    if (armedTool?.kind === kind) armTool(null);
    else {
      useStore.getState().setTouchSelectMode(false);
      armTool({ kind } as ArmedTool);
      setDetent("peek");
    }
  };

  /** Tool button (real mode only). */
  const toolButton = ({ slug, tool, archetype }: (typeof allTools)[number]) => {
    const isArmed = armedTool?.kind === "tool" && armedTool.tool === slug;
    return (
      <button
        key={slug}
        aria-label={tool.label}
        onClick={() => armToolEntry(archetype, slug)}
        className={`flex items-center gap-2 rounded-md border px-2 py-2 text-xs ${
          isArmed
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--text)]"
        }`}
      >
        <ToolIcon toolKey={slug} size={18} />
        {tool.label}
      </button>
    );
  };

  /** Archetype chip for minimalist mode (arms defaultTool directly). */
  const minimalistChip = (key: string) => {
    const a = archetypes[key];
    const isArmed =
      armedTool?.kind === "tool" &&
      armedTool.archetype === key &&
      armedTool.tool === a.defaultTool;
    return (
      <button
        key={key}
        aria-label={a.label}
        onClick={() => armArchetypeDefault(key)}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
          isArmed
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--text)]"
        }`}
      >
        <ArchetypeGlyph archetypeKey={key} size={14} />
        {a.label}
      </button>
    );
  };

  /** Archetype chip for real mode (expands tool grid on tap). */
  const realChip = (key: string) => {
    const a = archetypes[key];
    return (
      <button
        key={key}
        aria-label={a.label}
        onClick={() => {
          setActiveArchetype(activeArchetype === key ? null : key);
          if (detent === "peek") setDetent("half");
        }}
        className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
          activeArchetype === key
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--border)] text-[var(--text)]"
        }`}
      >
        <ArchetypeGlyph archetypeKey={key} size={14} />
        {a.label}
      </button>
    );
  };

  return (
    <div ref={containerRef}>
      <BottomSheet
        detent={detent}
        onDetentChange={setDetent}
        heights={isMinimalist ? MINIMALIST_HEIGHTS : undefined}
      >
        <input
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => detent === "peek" && setDetent("half")}
          className="mb-2 w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm text-[var(--text)]"
        />
        {searchResults ? (
          isMinimalist ? (
            /* Minimalist search: render matching archetype chips (direct-arm) */
            <div className="flex flex-wrap gap-2">
              {(
                searchResults as {
                  key: string;
                  archetype: (typeof archetypes)[string];
                }[]
              ).map(({ key }) => minimalistChip(key))}
            </div>
          ) : (
            /* Real mode search: tool grid */
            <div className="grid grid-cols-2 gap-2">
              {(searchResults as (typeof allTools)[number][]).map(toolButton)}
            </div>
          )
        ) : (
          <>
            {/* Annotations row — shared by both modes */}
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {ANNOTATIONS.map(({ kind, label, Icon }) => (
                <button
                  key={kind}
                  aria-label={label}
                  onClick={() =>
                    armAnnotation(kind as Exclude<ArmedTool["kind"], "tool">)
                  }
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs ${
                    armedTool?.kind === kind
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--text)]"
                  }`}
                >
                  <Icon size={13} strokeWidth={2} /> {label}
                </button>
              ))}
            </div>
            {/* Archetype chips row */}
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {Object.keys(archetypes).map((key) =>
                isMinimalist ? minimalistChip(key) : realChip(key),
              )}
            </div>
            {/* Tool grid (real mode only, when an archetype is expanded) */}
            {!isMinimalist && activeArchetype && (
              <div className="grid grid-cols-2 gap-2">
                {toolsForArchetype(activeArchetype).map(([slug, tool]) =>
                  toolButton({ slug, tool, archetype: activeArchetype }),
                )}
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </div>
  );
}
