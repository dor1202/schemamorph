import { useState } from "react";
import { useStore } from "@/state/store";
import {
  archetypes,
  getArchetype,
  toolsForArchetype,
  protocolGroups,
  getArchetypeAttributes,
} from "@/lib/catalog";
import type { AttributeDef } from "@/lib/catalog";
import type {
  AppNode,
  SysNode,
  SysEdge,
  NoteNode,
  BoundaryNode,
  StepNode,
  ArrowNode,
} from "@/lib/types";

const inputCls =
  "w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]";
const labelCls =
  "mb-1 mt-3 block text-[10px] uppercase tracking-widest text-[var(--muted)]";

// Typed inline editor for a single pinned attribute
function PinEditor({
  attr,
  value,
  onChange,
  disabled,
}: {
  attr: AttributeDef;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (attr.type === "enum" && attr.options) {
    return (
      <select
        aria-label={attr.label}
        className={inputCls}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— select —</option>
        {attr.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (attr.type === "number") {
    return (
      <input
        type="number"
        aria-label={attr.label}
        className={inputCls}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
      />
    );
  }

  if (attr.type === "boolean") {
    return (
      <input
        type="checkbox"
        aria-label={attr.label}
        checked={value === "true"}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
        className="h-3 w-3"
      />
    );
  }

  // text
  const listId = `datalist-${attr.key}`;
  return (
    <>
      <input
        type="text"
        aria-label={attr.label}
        className={inputCls}
        value={value}
        disabled={disabled}
        list={attr.suggestions ? listId : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {attr.suggestions && (
        <datalist id={listId}>
          {attr.suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  );
}

function PinsSection({
  node,
  attributes,
  locked,
}: {
  node: SysNode;
  attributes: AttributeDef[];
  locked: boolean;
}) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const [addPinQuery, setAddPinQuery] = useState("");
  const [pendingAttrKey, setPendingAttrKey] = useState<string | null>(null);

  const customProps = node.data.customProperties ?? {};
  const pinnedKeys = new Set(attributes.map((a) => a.key));

  // attributes already pinned (have a value in customProperties)
  const pinnedAttrs = attributes.filter((a) => a.key in customProps);
  // the "pending" attribute (selected from autocomplete but not yet committed)
  const pendingAttr = pendingAttrKey
    ? attributes.find((a) => a.key === pendingAttrKey)
    : null;

  const commitPin = (key: string) => {
    const attr = attributes.find((a) => a.key === key);
    if (!attr) return;
    const defaultValue =
      attr.type === "boolean"
        ? "false"
        : attr.type === "enum" && attr.options
          ? attr.options[0]
          : "";
    updateNodeData(node.id, {
      customProperties: {
        ...customProps,
        [key]: defaultValue,
      },
    });
    setPendingAttrKey(null);
    setAddPinQuery("");
  };

  const updatePin = (key: string, value: string) => {
    updateNodeData(node.id, {
      customProperties: {
        ...customProps,
        [key]: value,
      },
    });
  };

  const removePin = (key: string) => {
    const next = { ...customProps };
    delete next[key];
    updateNodeData(node.id, { customProperties: next });
  };

  const handleAddPinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const q = addPinQuery.trim().toLowerCase();
    const match = attributes.find(
      (a) => a.key.toLowerCase() === q || a.label.toLowerCase() === q,
    );
    if (match && !(match.key in customProps)) {
      setPendingAttrKey(match.key);
      setAddPinQuery("");
    }
  };

  const handleAddPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddPinQuery(e.target.value);
    // If value matches an attribute key exactly, pre-select it
    const q = e.target.value.trim().toLowerCase();
    const match = attributes.find(
      (a) => a.key.toLowerCase() === q || a.label.toLowerCase() === q,
    );
    if (match && !(match.key in customProps)) {
      setPendingAttrKey(match.key);
    } else {
      setPendingAttrKey(null);
    }
  };

  const datalistId = `pin-attrs-${node.id}`;

  return (
    <>
      <div className={labelCls}>Attributes</div>

      {/* Existing pinned attributes */}
      {pinnedAttrs.map((attr) => (
        <div key={attr.key} className="mb-1.5">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="text-[10px] text-[var(--muted)]">
              {attr.label}
            </span>
            <button
              aria-label={`remove ${attr.key}`}
              onClick={() => removePin(attr.key)}
              disabled={locked}
              className="text-[var(--muted)] hover:text-red-400 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>
          <PinEditor
            attr={attr}
            value={customProps[attr.key] ?? ""}
            onChange={(v) => updatePin(attr.key, v)}
            disabled={locked}
          />
        </div>
      ))}

      {/* Pending (just picked but not yet committed) */}
      {pendingAttr && !(pendingAttr.key in customProps) && (
        <div className="mb-1.5">
          <div className="mb-0.5 flex items-center justify-between">
            <span className="text-[10px] text-[var(--muted)]">
              {pendingAttr.label}
            </span>
            <button
              aria-label={`remove ${pendingAttr.key}`}
              onClick={() => {
                setPendingAttrKey(null);
                setAddPinQuery("");
              }}
              disabled={locked}
              className="text-[var(--muted)] hover:text-red-400 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-1">
            <PinEditor
              attr={pendingAttr}
              value=""
              onChange={(v) => {
                updateNodeData(node.id, {
                  customProperties: {
                    ...customProps,
                    [pendingAttr.key]: v,
                  },
                });
                setPendingAttrKey(null);
                setAddPinQuery("");
              }}
              disabled={locked}
            />
            {pendingAttr.type !== "enum" && pendingAttr.type !== "boolean" && (
              <button
                onClick={() => commitPin(pendingAttr.key)}
                disabled={locked}
                className="shrink-0 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--card)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Attribute
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add attribute input */}
      <div className="mt-1 flex gap-1">
        <input
          aria-label="Add attribute"
          placeholder="Add attribute…"
          className={inputCls}
          value={addPinQuery}
          list={datalistId}
          disabled={locked}
          onChange={handleAddPinChange}
          onKeyDown={handleAddPinKeyDown}
        />
        <datalist id={datalistId}>
          {attributes
            .filter((a) => !(a.key in customProps))
            .map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
        </datalist>
      </div>

      {/* Unused pinnedKeys for filtering free-form section */}
      <input type="hidden" data-pinned-keys={JSON.stringify([...pinnedKeys])} />
    </>
  );
}

/**
 * CustomPropsEditor — shared free-form key/value property editor.
 *
 * Used by both node and edge config panels.
 * `excludeKeys` is used by the node panel to filter out schema-pinned keys so
 * they don't appear in the free-form list.
 */
function CustomPropsEditor({
  customProperties,
  onAdd,
  onRemove,
  excludeKeys,
  disabled,
}: {
  customProperties: Record<string, string> | undefined;
  onAdd: (key: string, value: string) => void;
  onRemove: (key: string) => void;
  excludeKeys?: Set<string>;
  disabled?: boolean;
}) {
  const [propKey, setPropKey] = useState("");
  const [propValue, setPropValue] = useState("");

  const entries = Object.entries(customProperties ?? {}).filter(
    ([key]) => !excludeKeys?.has(key),
  );

  const handleAdd = () => {
    if (!propKey.trim()) return;
    onAdd(propKey.trim(), propValue);
    setPropKey("");
    setPropValue("");
  };

  return (
    <>
      <div data-testid="free-form-props">
        {entries.map(([key, value]) => (
          <div key={key} className="mb-1 flex items-center gap-1 text-xs">
            <span className="flex-1 truncate rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1">
              {key}: {value}
            </span>
            <button
              aria-label={`remove ${key}`}
              onClick={() => onRemove(key)}
              disabled={disabled}
              className="text-[var(--muted)] hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        <input
          placeholder="key"
          className={inputCls}
          value={propKey}
          disabled={disabled}
          onChange={(e) => setPropKey(e.target.value)}
        />
        <input
          placeholder="value"
          className={inputCls}
          value={propValue}
          disabled={disabled}
          onChange={(e) => setPropValue(e.target.value)}
        />
      </div>
      <button
        onClick={handleAdd}
        disabled={disabled}
        className="mt-1.5 w-full rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] hover:bg-[var(--card)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add property
      </button>
    </>
  );
}

function ConfigPanelInner({ node }: { node: SysNode }) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const locked = useStore((s) => s.locked);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  const { data } = node;
  const attributes = getArchetypeAttributes(data.archetype);
  const pinnedKeys = new Set(attributes.map((a) => a.key));

  const commitLabel = () => {
    if (labelDraft !== null && labelDraft !== data.label) {
      updateNodeData(node.id, { label: labelDraft });
    }
    setLabelDraft(null);
  };

  const changeArchetype = (archetype: string) => {
    const defaultTool = getArchetype(archetype)?.defaultTool ?? "";
    updateNodeData(node.id, { archetype, concreteTool: defaultTool });
  };

  const handleAddProperty = (key: string, value: string) => {
    updateNodeData(node.id, {
      customProperties: {
        ...data.customProperties,
        [key]: value,
      },
    });
  };

  const handleRemoveProperty = (key: string) => {
    const next = { ...data.customProperties };
    delete next[key];
    updateNodeData(node.id, { customProperties: next });
  };

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Node Config
      </div>

      <label className={labelCls} htmlFor="cfg-label">
        Label
      </label>
      <input
        id="cfg-label"
        aria-label="Label"
        className={inputCls}
        value={labelDraft ?? data.label}
        disabled={locked}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === "Enter" && commitLabel()}
      />

      <label className={labelCls} htmlFor="cfg-archetype">
        Archetype
      </label>
      <select
        id="cfg-archetype"
        aria-label="Archetype"
        className={inputCls}
        value={data.archetype}
        disabled={locked}
        onChange={(e) => changeArchetype(e.target.value)}
      >
        {Object.entries(archetypes).map(([key, a]) => (
          <option key={key} value={key}>
            {a.label}
          </option>
        ))}
        {!archetypes[data.archetype] && (
          <option value={data.archetype}>⚠ {data.archetype}</option>
        )}
      </select>

      <label className={labelCls} htmlFor="cfg-tool">
        Concrete tool
      </label>
      <select
        id="cfg-tool"
        aria-label="Concrete tool"
        className={inputCls}
        value={data.concreteTool}
        disabled={locked}
        onChange={(e) =>
          updateNodeData(node.id, { concreteTool: e.target.value })
        }
      >
        {toolsForArchetype(data.archetype).map(([key, tool]) => (
          <option key={key} value={key}>
            {tool.label}
          </option>
        ))}
        {!toolsForArchetype(data.archetype).some(
          ([k]) => k === data.concreteTool,
        ) && <option value={data.concreteTool}>⚠ {data.concreteTool}</option>}
      </select>

      {/* Attributes section — only when archetype has attributes */}
      {attributes.length > 0 && (
        <PinsSection node={node} attributes={attributes} locked={locked} />
      )}

      <div className={labelCls}>Custom properties</div>
      <CustomPropsEditor
        customProperties={data.customProperties}
        onAdd={handleAddProperty}
        onRemove={handleRemoveProperty}
        excludeKeys={pinnedKeys}
        disabled={locked}
      />
    </aside>
  );
}

/**
 * EdgeConfigInner — editing panel for the selected edge.
 *
 * Label/protocol semantics:
 *   - Typing in the label input and committing (blur/Enter) writes {label: draft}
 *     and clears protocol (sets protocol: undefined). This ensures the chip in
 *     SysEdge shows the text label rather than a stale protocol.
 *   - Clicking a protocol chip writes {protocol: p, label: undefined}, so the
 *     chip text comes from protocol alone.
 *   - Clicking the currently-active protocol chip clears it back to undefined.
 *   - If the label draft is empty on commit, no write is performed (nothing changes).
 *
 * Rationale: label and protocol are mutually exclusive display values. Committing
 * a non-empty label clears protocol so the display is unambiguous. Protocol chips
 * are authoritative when set and overwrite any free-text label.
 */
const COLOR_SWATCHES: Array<{ name: string; value: string | undefined }> = [
  { name: "slate", value: "#64748b" },
  { name: "blue", value: "#3b82f6" },
  { name: "green", value: "#22c55e" },
  { name: "amber", value: "#f59e0b" },
  { name: "red", value: "#ef4444" },
  { name: "violet", value: "#8b5cf6" },
  { name: "pink", value: "#ec4899" },
  { name: "cyan", value: "#06b6d4" },
  { name: "clear", value: undefined },
];

/**
 * Shared color swatch row used by Edge, Note, and Boundary config panels.
 * `labelPrefix` is used for aria-labels: e.g. "Edge color blue", "Note color blue".
 */
function ColorSwatches({
  activeColor,
  onSelect,
  disabled,
  labelPrefix,
}: {
  activeColor: string | undefined;
  onSelect: (color: string | undefined) => void;
  disabled?: boolean;
  labelPrefix: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {COLOR_SWATCHES.map(({ name, value }) => {
        const isClear = value === undefined;
        const isActive = isClear ? !activeColor : activeColor === value;
        return (
          <button
            key={name}
            aria-label={`${labelPrefix} ${name}`}
            disabled={disabled}
            onClick={() => onSelect(value)}
            title={name}
            className={`h-5 w-5 rounded border text-[8px] disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                : "border-[var(--border)]"
            } ${isClear ? "text-[var(--muted)]" : ""}`}
            style={
              isClear ? { background: "transparent" } : { background: value }
            }
          >
            {isClear ? "✕" : ""}
          </button>
        );
      })}
    </div>
  );
}

function EdgeConfigInner({ edge }: { edge: SysEdge }) {
  const updateEdgeData = useStore((s) => s.updateEdgeData);
  const toggleEdgeAnimated = useStore((s) => s.toggleEdgeAnimated);
  const locked = useStore((s) => s.locked);
  // Read animated directly from the store so it stays live after toggle
  const animated = useStore(
    (s) => s.edges.find((e) => e.id === edge.id)?.animated ?? false,
  );
  const activeProtocol = useStore(
    (s) => s.edges.find((e) => e.id === edge.id)?.data?.protocol,
  );
  // Read customProperties live from store so removals are reactive
  const customProperties = useStore(
    (s) => s.edges.find((e) => e.id === edge.id)?.data?.customProperties,
  );
  const activeColor = useStore(
    (s) => s.edges.find((e) => e.id === edge.id)?.data?.color,
  );

  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  const commitLabel = () => {
    if (labelDraft !== null && labelDraft.trim() !== "") {
      // Only commit if user actually typed something
      updateEdgeData(edge.id, { label: labelDraft, protocol: undefined });
    }
    setLabelDraft(null);
  };

  const handleProtocolClick = (p: string) => {
    if (activeProtocol === p) {
      // Clicking active chip clears it
      updateEdgeData(edge.id, { protocol: undefined });
    } else {
      updateEdgeData(edge.id, { protocol: p, label: undefined });
    }
  };

  const handleAddProperty = (key: string, value: string) => {
    updateEdgeData(edge.id, {
      customProperties: {
        ...customProperties,
        [key]: value,
      },
    });
  };

  const handleRemoveProperty = (key: string) => {
    const next = { ...customProperties };
    delete next[key];
    updateEdgeData(edge.id, { customProperties: next });
  };

  const displayLabel = labelDraft ?? edge.data?.label ?? "";

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Edge Config
      </div>

      <label className={labelCls} htmlFor="cfg-edge-label">
        Label
      </label>
      <input
        id="cfg-edge-label"
        aria-label="Label"
        className={inputCls}
        value={displayLabel}
        disabled={locked}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === "Enter" && commitLabel()}
      />

      <div className={labelCls}>Protocol</div>
      {Object.entries(protocolGroups).map(([group, items]) => (
        <div key={group} className="mb-2">
          <div className="mb-1 text-[8px] uppercase tracking-widest text-[var(--muted)]">
            {group}
          </div>
          <div className="flex flex-wrap gap-1">
            {items.map((p) => {
              const isActive = activeProtocol === p;
              return (
                <button
                  key={p}
                  onClick={() => handleProtocolClick(p)}
                  aria-pressed={isActive}
                  disabled={locked}
                  className={`rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? "border-[var(--accent)] bg-[var(--card)] text-[var(--chip-accent)]"
                      : "border-[var(--border)] text-[var(--chip-accent)] hover:bg-[var(--card)]"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        onClick={() => toggleEdgeAnimated(edge.id)}
        aria-pressed={animated}
        disabled={locked}
        className={`mt-1 w-full rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed ${
          animated
            ? "border-[var(--chip-accent)] bg-[var(--card)] text-[var(--chip-accent)]"
            : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card)]"
        }`}
      >
        ⟿ Animate
      </button>

      <div className={labelCls}>Color</div>
      <ColorSwatches
        activeColor={activeColor}
        onSelect={(v) => updateEdgeData(edge.id, { color: v })}
        disabled={locked}
        labelPrefix="Edge color"
      />

      <div className={labelCls}>Custom properties</div>
      <CustomPropsEditor
        customProperties={customProperties}
        onAdd={handleAddProperty}
        onRemove={handleRemoveProperty}
        disabled={locked}
      />
    </aside>
  );
}

const NOTE_SIZES: Array<{
  value: "small" | "normal" | "title";
  label: string;
}> = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "title", label: "Title" },
];

function NoteConfigInner({ node }: { node: NoteNode }) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const locked = useStore((s) => s.locked);
  const [draft, setDraft] = useState<string | null>(null);
  const activeColor = useStore(
    (s) =>
      (s.nodes.find((n) => n.id === node.id) as NoteNode | undefined)?.data
        ?.color,
  );
  const activeSize = useStore(
    (s) =>
      (s.nodes.find((n) => n.id === node.id) as NoteNode | undefined)?.data
        ?.size ?? "normal",
  );

  const { data } = node;

  const commit = () => {
    if (draft !== null && draft !== data.text) {
      updateNodeData(node.id, { text: draft });
    }
    setDraft(null);
  };

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Note
      </div>
      <label className={labelCls} htmlFor="cfg-note-text">
        Note text
      </label>
      <textarea
        id="cfg-note-text"
        aria-label="Note text"
        className={`${inputCls} min-h-[80px] resize-y`}
        value={draft ?? data.text}
        disabled={locked}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
      />
      <div className={labelCls}>Size</div>
      <div className="flex gap-1">
        {NOTE_SIZES.map(({ value, label }) => (
          <button
            key={value}
            aria-label={`Note size ${label}`}
            aria-pressed={activeSize === value}
            disabled={locked}
            onClick={() => updateNodeData(node.id, { size: value })}
            className={`flex-1 rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed ${
              activeSize === value
                ? "border-[var(--accent)] bg-[var(--card)] text-[var(--chip-accent)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={labelCls}>Color</div>
      <ColorSwatches
        activeColor={activeColor}
        onSelect={(v) => updateNodeData(node.id, { color: v })}
        disabled={locked}
        labelPrefix="Note color"
      />
    </aside>
  );
}

function BoundaryConfigInner({ node }: { node: BoundaryNode }) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const locked = useStore((s) => s.locked);
  const [labelDraft, setLabelDraft] = useState<string | null>(null);
  const activeColor = useStore(
    (s) =>
      (s.nodes.find((n) => n.id === node.id) as BoundaryNode | undefined)?.data
        ?.color,
  );

  const { data } = node;

  const commitLabel = () => {
    if (labelDraft !== null && labelDraft !== data.label) {
      updateNodeData(node.id, { label: labelDraft });
    }
    setLabelDraft(null);
  };

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Boundary
      </div>
      <label className={labelCls} htmlFor="cfg-boundary-label">
        Boundary label
      </label>
      <input
        id="cfg-boundary-label"
        aria-label="Boundary label"
        className={inputCls}
        value={labelDraft ?? data.label}
        disabled={locked}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === "Enter" && commitLabel()}
      />
      <div className={labelCls}>Color</div>
      <ColorSwatches
        activeColor={activeColor}
        onSelect={(v) => updateNodeData(node.id, { color: v })}
        disabled={locked}
        labelPrefix="Boundary color"
      />
    </aside>
  );
}

function StepConfigInner({ node }: { node: StepNode }) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const locked = useStore((s) => s.locked);
  const activeColor = useStore(
    (s) =>
      (s.nodes.find((n) => n.id === node.id) as StepNode | undefined)?.data
        ?.color,
  );
  const [labelDraft, setLabelDraft] = useState<string | null>(null);

  const { data } = node;

  const commitLabel = () => {
    if (labelDraft !== null && labelDraft !== data.label) {
      updateNodeData(node.id, { label: labelDraft });
    }
    setLabelDraft(null);
  };

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Step
      </div>
      <label className={labelCls} htmlFor="cfg-step-label">
        Step label
      </label>
      <input
        id="cfg-step-label"
        aria-label="Step label"
        type="text"
        className={inputCls}
        value={labelDraft ?? data.label ?? ""}
        disabled={locked}
        onChange={(e) => setLabelDraft(e.target.value)}
        onBlur={commitLabel}
        onKeyDown={(e) => e.key === "Enter" && commitLabel()}
      />
      <div className={labelCls}>Step color</div>
      <ColorSwatches
        activeColor={activeColor}
        onSelect={(v) => updateNodeData(node.id, { color: v })}
        disabled={locked}
        labelPrefix="Step color"
      />
    </aside>
  );
}

const ARROW_LINE_STYLES: Array<{
  value: "solid" | "dashed" | "dotted";
  label: string;
}> = [
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

function ArrowConfigInner({ node }: { node: ArrowNode }) {
  const updateNodeData = useStore((s) => s.updateNodeData);
  const locked = useStore((s) => s.locked);
  const activeColor = useStore(
    (s) =>
      (s.nodes.find((n) => n.id === node.id) as ArrowNode | undefined)?.data
        ?.color,
  );
  const activeLineStyle = useStore(
    (s) =>
      (s.nodes.find((n) => n.id === node.id) as ArrowNode | undefined)?.data
        ?.lineStyle ?? "solid",
  );

  return (
    <aside
      data-testid="config-panel"
      className="h-full w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] p-3"
    >
      <div className="text-[10px] uppercase tracking-widest text-[var(--muted)]">
        Arrow
      </div>
      <div className={labelCls}>Line style</div>
      <div className="flex gap-1">
        {ARROW_LINE_STYLES.map(({ value, label }) => (
          <button
            key={value}
            aria-label={`Line style ${label}`}
            aria-pressed={activeLineStyle === value}
            disabled={locked}
            onClick={() => updateNodeData(node.id, { lineStyle: value })}
            className={`flex-1 rounded border px-1.5 py-0.5 text-[10px] disabled:opacity-40 disabled:cursor-not-allowed ${
              activeLineStyle === value
                ? "border-[var(--accent)] bg-[var(--card)] text-[var(--chip-accent)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={labelCls}>Arrow color</div>
      <ColorSwatches
        activeColor={activeColor}
        onSelect={(v) => updateNodeData(node.id, { color: v })}
        disabled={locked}
        labelPrefix="Arrow color"
      />
    </aside>
  );
}

/** Routes a selected node/edge to its type-specific editor. Reused by the mobile ConfigSheet. */
export function SelectionConfig({
  node,
  edge,
}: {
  node?: AppNode;
  edge?: SysEdge;
}) {
  if (edge) return <EdgeConfigInner key={edge.id} edge={edge} />;
  if (!node) return null;
  if (node.type === "noteNode")
    return <NoteConfigInner key={node.id} node={node as NoteNode} />;
  if (node.type === "boundaryNode")
    return <BoundaryConfigInner key={node.id} node={node as BoundaryNode} />;
  if (node.type === "stepNode")
    return <StepConfigInner key={node.id} node={node as StepNode} />;
  if (node.type === "arrowNode")
    return <ArrowConfigInner key={node.id} node={node as ArrowNode} />;
  return <ConfigPanelInner key={node.id} node={node as SysNode} />;
}

export function ConfigPanel() {
  const node = useStore((s) => s.nodes.find((n) => n.selected));
  const edge = useStore((s) => s.edges.find((e) => e.selected));
  const panelSuppressed = useStore((s) => s.panelSuppressed);

  const visibleNode = node && !panelSuppressed ? node : undefined;
  const visibleEdge = visibleNode ? undefined : edge;

  return <SelectionConfig node={visibleNode} edge={visibleEdge} />;
}
