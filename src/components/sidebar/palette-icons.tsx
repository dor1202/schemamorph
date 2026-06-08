import { archetypes, getTool } from "@/lib/catalog";
import { resolveToolIcon, toolInitials } from "@/lib/icons";
import { useStore } from "@/state/store";
import { themedColor } from "@/lib/color";

export function ArchetypeGlyph({
  archetypeKey,
  size,
}: {
  archetypeKey: string;
  size: number;
}) {
  const viewMode = useStore((s) => s.viewMode);
  const theme = useStore((s) => s.theme);
  const isLight = theme === "light";
  const a = archetypes[archetypeKey];
  const color = themedColor(a.brandColor, isLight);
  if (viewMode === "real") {
    const tool = getTool(a.defaultTool);
    const icon = tool ? resolveToolIcon(tool) : null;
    if (icon) {
      return (
        <svg width={size} height={size} viewBox={icon.viewBox}>
          <path d={icon.path} fill={color} />
        </svg>
      );
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={a.symbolViewBox}
      style={{ color }}
      dangerouslySetInnerHTML={{ __html: a.symbolSvg }}
    />
  );
}

/** Inline tool icon — same rendering as variant rows */
export function ToolIcon({ toolKey, size }: { toolKey: string; size: number }) {
  const tool = getTool(toolKey) ?? null;
  const theme = useStore((s) => s.theme);
  const isLight = theme === "light";

  if (!tool) return null;

  const color = themedColor(tool.brandColor, isLight);
  const icon = resolveToolIcon(tool);
  if (icon) {
    return (
      <svg width={size} height={size} viewBox={icon.viewBox}>
        <path d={icon.path} fill={color} />
      </svg>
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-sm font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `${color}33`,
        color,
      }}
    >
      {toolInitials(tool.label)}
    </span>
  );
}
