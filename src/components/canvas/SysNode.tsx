import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useStore } from "@/state/store";
import { getArchetype, getTool, getArchetypeAttributes } from "@/lib/catalog";
import type { AttributeDef } from "@/lib/catalog";
import { resolveToolIcon, toolInitials } from "@/lib/icons";
import type { SysNode } from "@/lib/types";
import { themedColor } from "@/lib/color";

function NodeIcon({
  archetypeKey,
  toolKey,
  size,
}: {
  archetypeKey: string;
  toolKey: string;
  size: number;
}) {
  const viewMode = useStore((s) => s.viewMode);
  const theme = useStore((s) => s.theme);
  const isLight = theme === "light";
  const archetype = getArchetype(archetypeKey);
  const tool = getTool(toolKey);

  if (viewMode === "real" && tool) {
    const icon = resolveToolIcon(tool);
    const iconColor = themedColor(tool.brandColor, isLight);
    if (icon) {
      return (
        <svg
          data-testid="logo-icon"
          width={size}
          height={size}
          viewBox={icon.viewBox}
        >
          <path d={icon.path} fill={iconColor} />
        </svg>
      );
    }
    return (
      <span
        data-testid="fallback-badge"
        className="flex items-center justify-center rounded font-bold"
        style={{
          width: size,
          height: size,
          background: `${iconColor}33`,
          color: iconColor,
          fontSize: size * 0.42,
        }}
      >
        {toolInitials(tool.label)}
      </span>
    );
  }

  if (viewMode === "minimalist" && archetype) {
    const archetypeColor = themedColor(archetype.brandColor, isLight);
    // symbolSvg is repo-controlled catalog content, validated in CI — never user input (see SECURITY.md)
    return (
      <svg
        data-testid="symbol-icon"
        width={size}
        height={size}
        viewBox={archetype.symbolViewBox}
        style={{ color: archetypeColor }}
        dangerouslySetInnerHTML={{ __html: archetype.symbolSvg }}
      />
    );
  }

  // real mode + unknown tool, or minimalist + unknown archetype: initials fallback
  return (
    <span
      data-testid="fallback-badge"
      className="flex items-center justify-center rounded font-bold bg-amber-500/20 text-amber-400"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {toolInitials(toolKey)}
    </span>
  );
}

const MAX_BADGES = 3;

/**
 * Renders compact pin badges under the node label.
 * Schema-pinned attrs (archetype attribute keys ∩ customProperties) appear first,
 * followed by free-form props (customProperties keys NOT in archetype attributes).
 * Boolean true → key only; boolean false → omitted; free-form always key:value.
 * Max 3 visible + "+n" overflow chip.
 * A native tooltip (title) lists ALL props as "key: value" one per line.
 */
function PinBadges({
  customProperties,
  attributes,
}: {
  customProperties: Record<string, string> | undefined;
  attributes: AttributeDef[];
}) {
  if (!customProperties) return null;

  const schemaKeys = new Set(attributes.map((a) => a.key));

  // 1. Schema pins (catalog attribute order)
  const entries: { key: string; text: string; tooltipValue: string }[] = [];
  for (const attr of attributes) {
    const val = customProperties[attr.key];
    if (val === undefined) continue;
    if (attr.type === "boolean") {
      if (val === "true") {
        entries.push({ key: attr.key, text: attr.key, tooltipValue: "true" });
      }
      // false → omit
    } else {
      if (val !== "") {
        entries.push({
          key: attr.key,
          text: `${attr.key}:${val}`,
          tooltipValue: val,
        });
      }
    }
  }

  // 2. Free-form props (keys not in schema, in insertion order)
  for (const [key, val] of Object.entries(customProperties)) {
    if (schemaKeys.has(key)) continue;
    if (val !== "") {
      entries.push({ key, text: `${key}:${val}`, tooltipValue: val });
    }
  }

  if (entries.length === 0) return null;

  const visible = entries.slice(0, MAX_BADGES);
  const overflow = entries.length - MAX_BADGES;

  // Build tooltip listing all props "key: value" one per line
  const tooltipTitle = entries
    .map((e) => `${e.key}: ${e.tooltipValue}`)
    .join("\n");

  return (
    <div
      data-testid="pin-badges"
      className="mt-0.5 flex flex-wrap gap-0.5"
      title={tooltipTitle}
    >
      {visible.map((e) => (
        <span
          key={e.key}
          className="rounded bg-[var(--border)] px-1 py-0.5 text-[8px] text-[var(--muted)] leading-none"
        >
          {e.text}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded bg-[var(--border)] px-1 py-0.5 text-[8px] text-[var(--muted)] leading-none">
          +{overflow}
        </span>
      )}
    </div>
  );
}

export const SysNodeComponent = memo(
  ({ data, selected }: NodeProps<SysNode>) => {
    const viewMode = useStore((s) => s.viewMode);
    const nodeStyle = useStore((s) => s.nodeStyle);
    const theme = useStore((s) => s.theme);
    const isLight = theme === "light";
    const archetype = getArchetype(data.archetype);
    const tool = getTool(data.concreteTool);
    const attributes = getArchetypeAttributes(data.archetype);
    const unknown = !tool || !archetype;
    const sublabel =
      viewMode === "real"
        ? (tool?.label ?? data.concreteTool)
        : archetype
          ? data.archetype
          : "?";
    const ring = selected
      ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
      : "";
    const warn = unknown ? (
      <span
        title="Unknown tool or archetype — not in catalog"
        className="absolute -top-2 -right-2 text-amber-400"
      >
        ⚠
      </span>
    ) : null;

    const handles = (
      <>
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-[var(--muted)]"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-[var(--muted)]"
        />
      </>
    );

    if (nodeStyle === "symbol") {
      return (
        <div
          data-testid="sysnode-symbol"
          className={`relative flex flex-col items-center gap-1 p-1 rounded ${ring}`}
        >
          {warn}
          <NodeIcon
            archetypeKey={data.archetype}
            toolKey={data.concreteTool}
            size={48}
          />
          <span className="text-xs text-[var(--text)]">{data.label}</span>
          {handles}
        </div>
      );
    }

    if (nodeStyle === "plate") {
      const rawTint =
        (viewMode === "real" ? tool?.brandColor : archetype?.brandColor) ??
        "#64748b";
      const tint = themedColor(rawTint, isLight);
      return (
        <div
          data-testid="sysnode-plate"
          className={`relative flex flex-col items-center gap-1 rounded-xl px-4 pt-3 pb-2 border ${ring}`}
          style={{
            background: `${tint}0f`,
            borderColor: `${tint}40`,
            boxShadow: "var(--node-shadow)",
          }}
        >
          {warn}
          <NodeIcon
            archetypeKey={data.archetype}
            toolKey={data.concreteTool}
            size={40}
          />
          <span className="text-xs text-[var(--text)]">{data.label}</span>
          <span className="text-[10px] text-[var(--muted)]">{sublabel}</span>
          <PinBadges
            customProperties={data.customProperties}
            attributes={attributes}
          />
          {handles}
        </div>
      );
    }

    // card (default)
    return (
      <div
        data-testid="sysnode-card"
        className={`relative flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 ${ring}`}
        style={{ boxShadow: "var(--node-shadow)" }}
      >
        {warn}
        <NodeIcon
          archetypeKey={data.archetype}
          toolKey={data.concreteTool}
          size={24}
        />
        <div>
          <div className="text-[13px] font-semibold text-[var(--text)]">
            {data.label}
          </div>
          <div className="text-[10px] text-[var(--muted)]">{sublabel}</div>
          <PinBadges
            customProperties={data.customProperties}
            attributes={attributes}
          />
        </div>
        {handles}
      </div>
    );
  },
);
SysNodeComponent.displayName = "SysNodeComponent";
