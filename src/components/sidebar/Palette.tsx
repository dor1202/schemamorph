import { useCallback, useMemo, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { archetypes, toolsForArchetype } from "@/lib/catalog";
import { resolveToolIcon, toolInitials } from "@/lib/icons";
import { useStore } from "@/state/store";
import { DND_MIME } from "@/components/canvas/Canvas";
import { loadSidebarPrefs, saveSidebarPrefs } from "@/lib/sidebar-prefs";
import { layoutPositions } from "@/lib/layout";
import { absolutizeAll } from "@/lib/grouping";
import {
  ChevronLeft,
  ChevronRight,
  StickyNote,
  BoxSelect,
  Heading,
  CircleDot,
  MoveUpRight,
  Sparkles,
} from "lucide-react";
import { themedColor } from "@/lib/color";
import { ArchetypeGlyph, ToolIcon } from "./palette-icons";

export function Palette({
  onCollapsedChange,
}: {
  onCollapsedChange?: (collapsed: boolean) => void;
} = {}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsedRaw] = useState(
    () => loadSidebarPrefs().collapsed,
  );
  const addNode = useStore((s) => s.addNode);
  const addNote = useStore((s) => s.addNote);
  const addBoundary = useStore((s) => s.addBoundary);
  const addStep = useStore((s) => s.addStep);
  const addArrow = useStore((s) => s.addArrow);
  const viewMode = useStore((s) => s.viewMode);
  const locked = useStore((s) => s.locked);
  const layoutDirection = useStore((s) => s.layoutDirection);
  const theme = useStore((s) => s.theme);
  const isLight = theme === "light";
  const { screenToFlowPosition } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  const setCollapsed = (next: boolean) => {
    setCollapsedRaw(next);
    onCollapsedChange?.(next);
    const prefs = loadSidebarPrefs();
    saveSidebarPrefs({ ...prefs, collapsed: next });
  };

  const tidy = () => {
    const { nodes, edges, applyPositions } = useStore.getState();
    if (!nodes.length) return;
    document.getElementById("root")?.classList.add("layout-animating");
    // absolutizeAll converts members' relative positions to absolute before passing
    // to layoutPositions — which reads node.position for boundary-membership precompute.
    // Without this, a member at relative (100,100) inside a boundary at (400,300)
    // would be seen at (100,100) instead of (500,400), breaking membership detection.
    applyPositions(
      layoutPositions(absolutizeAll(nodes), edges, layoutDirection),
    );
    setTimeout(
      () =>
        document.getElementById("root")?.classList.remove("layout-animating"),
      350,
    );
  };

  const spawnNote = useCallback(() => {
    if (locked) return;
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNote({
      x: center.x + Math.random() * 40 - 20,
      y: center.y + Math.random() * 40 - 20,
    });
  }, [screenToFlowPosition, addNote, locked]);

  const spawnBoundary = useCallback(() => {
    if (locked) return;
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addBoundary({
      x: center.x + Math.random() * 40 - 20,
      y: center.y + Math.random() * 40 - 20,
    });
  }, [screenToFlowPosition, addBoundary, locked]);

  const spawnTitle = useCallback(() => {
    if (locked) return;
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addNote(
      {
        x: center.x + Math.random() * 40 - 20,
        y: center.y + Math.random() * 40 - 20,
      },
      { size: "title", text: "Title" },
    );
  }, [screenToFlowPosition, addNote, locked]);

  const spawnStep = useCallback(() => {
    if (locked) return;
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addStep({
      x: center.x + Math.random() * 40 - 20,
      y: center.y + Math.random() * 40 - 20,
    });
  }, [screenToFlowPosition, addStep, locked]);

  const spawnArrow = useCallback(() => {
    if (locked) return;
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    addArrow({
      x: center.x + Math.random() * 40 - 20,
      y: center.y + Math.random() * 40 - 20,
    });
  }, [screenToFlowPosition, addArrow, locked]);

  const spawn = useCallback(
    (archetype: string, tool: string) => {
      if (locked) return;
      // spawn near viewport center, jittered so repeated clicks don't stack exactly
      const center = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      addNode(archetype, tool, {
        x: center.x + Math.random() * 40 - 20,
        y: center.y + Math.random() * 40 - 20,
      });
    },
    [screenToFlowPosition, addNode, locked],
  );

  const dragPayload =
    (archetype: string, tool: string) => (e: React.DragEvent) => {
      if (locked) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData(DND_MIME, JSON.stringify({ archetype, tool }));
      e.dataTransfer.effectAllowed = "move";
    };

  const handleRowClick = useCallback(
    (key: string, defaultTool: string) => {
      if (viewMode === "minimalist") {
        spawn(key, defaultTool);
      } else {
        // real mode: toggle expand/fold
        setExpanded((prev) => (prev === key ? null : key));
      }
    },
    [viewMode, spawn],
  );

  const handleRowKeyDown = useCallback(
    (e: React.KeyboardEvent, key: string, defaultTool: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleRowClick(key, defaultTool);
      }
    },
    [handleRowClick],
  );

  // Build a flat list of all tools with their archetype info for search
  const allToolEntries = useMemo(
    () =>
      Object.entries(archetypes).flatMap(([archetypeKey, archetype]) =>
        toolsForArchetype(archetypeKey).map(([toolKey, tool]) => ({
          toolKey,
          tool,
          archetypeKey,
          archetypeLabel: archetype.label,
        })),
      ),
    [],
  );

  const trimmedQuery = query.trim().toLowerCase();

  // Minimalist search results: matching archetypes only (no tool rows)
  const minimalistSearchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    return Object.entries(archetypes).filter(([key, a]) => {
      return (
        a.label.toLowerCase().includes(trimmedQuery) ||
        key.toLowerCase().includes(trimmedQuery)
      );
    });
  }, [trimmedQuery]);

  // Real mode search results: matching tools + group (archetype) matches
  const realSearchResults = useMemo(() => {
    if (!trimmedQuery) return null;
    // Find archetype keys whose label/key matches (group match)
    const groupMatchKeys = new Set(
      Object.entries(archetypes)
        .filter(
          ([key, a]) =>
            a.label.toLowerCase().includes(trimmedQuery) ||
            key.toLowerCase().includes(trimmedQuery),
        )
        .map(([key]) => key),
    );
    // Include tools that match by label/key OR whose archetype is a group match
    // Dedupe by toolKey using a Map
    const seen = new Set<string>();
    const results: (typeof allToolEntries)[number][] = [];
    for (const entry of allToolEntries) {
      const toolMatches =
        entry.tool.label.toLowerCase().includes(trimmedQuery) ||
        entry.toolKey.toLowerCase().includes(trimmedQuery);
      const groupMatches = groupMatchKeys.has(entry.archetypeKey);
      if ((toolMatches || groupMatches) && !seen.has(entry.toolKey)) {
        seen.add(entry.toolKey);
        results.push(entry);
      }
    }
    return results;
  }, [trimmedQuery, allToolEntries]);

  const searchResults =
    viewMode === "minimalist" ? minimalistSearchResults : realSearchResults;

  const clearQuery = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      clearQuery();
    }
  };

  const effectiveCollapsed = collapsed || locked;

  if (effectiveCollapsed) {
    return (
      <aside className="relative flex h-full w-full flex-col items-center border-r border-[var(--border)] bg-[var(--panel)] py-2">
        <button
          aria-label="Expand sidebar"
          disabled={locked}
          title={locked ? "Unlock to expand" : undefined}
          onClick={() => !locked && setCollapsed(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight size={14} />
        </button>
        <span
          className="mt-3 select-none text-[8px] uppercase tracking-widest text-[var(--muted)]"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          Components
        </span>
      </aside>
    );
  }

  return (
    <aside className="relative h-full w-full overflow-y-auto border-r border-[var(--border)] bg-[var(--panel)] p-2.5">
      {/* Collapse handle */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[9px] uppercase tracking-widest text-[var(--muted)]">
          Components
        </div>
        <button
          aria-label="Collapse sidebar"
          onClick={() => setCollapsed(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--text)]"
        >
          <ChevronLeft size={12} />
        </button>
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search tools…"
          aria-label="Search tools"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleInputKeyDown}
          className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] placeholder-[var(--muted)] outline-none focus:border-[var(--text)]"
        />
        {query && (
          <button
            onClick={clearQuery}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tidy layout button */}
      <button
        aria-label="Tidy layout"
        onClick={tidy}
        disabled={locked}
        className="mb-2 flex w-full items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles size={14} strokeWidth={2} /> Tidy layout
      </button>

      {/* Annotations section — always visible at top, not searchable */}
      <div className="mb-2">
        <div className="mb-1.5 flex items-center gap-1">
          <div className="flex-1 border-t border-[var(--border)]" />
          <span className="shrink-0 text-[9px] uppercase tracking-widest text-[var(--muted)]">
            Annotations
          </span>
          <div className="flex-1 border-t border-[var(--border)]" />
        </div>

        {/* Note item */}
        <div
          role="button"
          tabIndex={0}
          draggable={!locked}
          aria-disabled={locked ? true : undefined}
          onDragStart={(e) => {
            if (locked) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: "note" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={spawnNote}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              spawnNote();
            }
          }}
          className={`mb-1 flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
        >
          <StickyNote size={14} className="text-amber-400 shrink-0" />
          Note
        </div>

        {/* Title item */}
        <div
          role="button"
          tabIndex={0}
          draggable={!locked}
          aria-disabled={locked ? true : undefined}
          onDragStart={(e) => {
            if (locked) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: "title" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={spawnTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              spawnTitle();
            }
          }}
          className={`mb-1 flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
        >
          <Heading size={14} className="text-[var(--muted)] shrink-0" />
          Title
        </div>

        {/* Step item */}
        <div
          role="button"
          tabIndex={0}
          draggable={!locked}
          aria-disabled={locked ? true : undefined}
          onDragStart={(e) => {
            if (locked) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: "step" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={spawnStep}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              spawnStep();
            }
          }}
          className={`mb-1 flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
        >
          <CircleDot size={14} className="text-blue-400 shrink-0" />
          Step
        </div>

        {/* Arrow item */}
        <div
          role="button"
          tabIndex={0}
          draggable={!locked}
          aria-disabled={locked ? true : undefined}
          onDragStart={(e) => {
            if (locked) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.setData(DND_MIME, JSON.stringify({ kind: "arrow" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={spawnArrow}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              spawnArrow();
            }
          }}
          className={`mb-1 flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
        >
          <MoveUpRight size={14} className="text-[var(--muted)] shrink-0" />
          Arrow
        </div>

        {/* Boundary item */}
        <div
          role="button"
          tabIndex={0}
          draggable={!locked}
          aria-disabled={locked ? true : undefined}
          onDragStart={(e) => {
            if (locked) {
              e.preventDefault();
              return;
            }
            e.dataTransfer.setData(
              DND_MIME,
              JSON.stringify({ kind: "boundary" }),
            );
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={spawnBoundary}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              spawnBoundary();
            }
          }}
          className={`flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
        >
          <BoxSelect size={14} className="text-[var(--muted)] shrink-0" />
          Boundary
        </div>

        {/* Tools divider — separates annotations from the archetype/tool list */}
        <div className="mt-2 flex items-center gap-1">
          <div className="flex-1 border-t border-[var(--border)]" />
          <span className="shrink-0 text-[9px] uppercase tracking-widest text-[var(--muted)]">
            Tools
          </span>
          <div className="flex-1 border-t border-[var(--border)]" />
        </div>
      </div>

      {/* Search results */}
      {searchResults !== null ? (
        searchResults.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-[var(--muted)]">
            {viewMode === "minimalist" ? "No matches" : "No tools found"}
          </p>
        ) : viewMode === "minimalist" ? (
          /* Minimalist search: archetype rows only */
          <div className="flex flex-col gap-1.5">
            {(searchResults as [string, (typeof archetypes)[string]][]).map(
              ([key, a]) => (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  draggable={!locked}
                  aria-disabled={locked ? true : undefined}
                  onDragStart={dragPayload(key, a.defaultTool)}
                  onClick={() => spawn(key, a.defaultTool)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      spawn(key, a.defaultTool);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
                >
                  <ArchetypeGlyph archetypeKey={key} size={16} />
                  {a.label}
                </div>
              ),
            )}
          </div>
        ) : (
          /* Real mode search: flat tool rows */
          <div className="flex flex-col gap-0.5">
            {(
              searchResults as {
                toolKey: string;
                tool: (typeof allToolEntries)[number]["tool"];
                archetypeKey: string;
                archetypeLabel: string;
              }[]
            ).map(({ toolKey, tool, archetypeKey, archetypeLabel }) => (
              <div
                key={toolKey}
                role="button"
                tabIndex={0}
                draggable={!locked}
                aria-disabled={locked ? true : undefined}
                onDragStart={dragPayload(archetypeKey, toolKey)}
                onClick={() => spawn(archetypeKey, toolKey)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    spawn(archetypeKey, toolKey);
                  }
                }}
                className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : "cursor-grab"}`}
              >
                <ToolIcon toolKey={toolKey} size={12} />
                <span className="min-w-0 flex-1 truncate">{tool.label}</span>
                <span className="shrink-0 text-[9px] text-[var(--muted)]">
                  {archetypeLabel}
                </span>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Normal archetype-row UI (query is empty) */
        Object.entries(archetypes).map(([key, a]) => {
          const isExpanded = expanded === key;
          const isReal = viewMode === "real";
          return (
            <div key={key} className="mb-1.5">
              <div
                role="button"
                tabIndex={0}
                draggable={!isReal && !locked}
                aria-disabled={locked ? true : undefined}
                onDragStart={
                  !isReal && !locked
                    ? dragPayload(key, a.defaultTool)
                    : undefined
                }
                onClick={() => handleRowClick(key, a.defaultTool)}
                onKeyDown={(e) => handleRowKeyDown(e, key, a.defaultTool)}
                className={`flex items-center gap-2 rounded-lg border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--card)] ${locked ? "cursor-not-allowed opacity-50" : isReal ? "cursor-pointer" : "cursor-grab"}`}
              >
                <ArchetypeGlyph archetypeKey={key} size={16} />
                {a.label}
                {isReal && !locked && (
                  <button
                    aria-label={`expand ${key}`}
                    onClick={(e) => {
                      // Row already handles the toggle; prevent double-firing
                      e.stopPropagation();
                      setExpanded((prev) => (prev === key ? null : key));
                    }}
                    className="ml-auto text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                )}
              </div>
              {isExpanded && isReal && !locked && (
                <div className="ml-3 mt-1 flex flex-col gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1">
                  {toolsForArchetype(key).map(([toolKey, tool]) => {
                    const icon = resolveToolIcon(tool);
                    const toolColor = themedColor(tool.brandColor, isLight);
                    return (
                      <div
                        key={toolKey}
                        role="button"
                        tabIndex={0}
                        draggable
                        onDragStart={dragPayload(key, toolKey)}
                        onClick={() => spawn(key, toolKey)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            spawn(key, toolKey);
                          }
                        }}
                        className="flex cursor-grab items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-[var(--text)] hover:bg-[var(--card)]"
                      >
                        {icon ? (
                          <svg width={12} height={12} viewBox={icon.viewBox}>
                            <path d={icon.path} fill={toolColor} />
                          </svg>
                        ) : (
                          <span
                            className="flex h-3 w-3 items-center justify-center rounded-sm text-[6px] font-bold"
                            style={{
                              background: `${toolColor}33`,
                              color: toolColor,
                            }}
                          >
                            {toolInitials(tool.label)}
                          </span>
                        )}
                        {tool.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </aside>
  );
}
