import { iconBySlug } from "./icons.generated";
import type { Tool } from "./catalog-schema";

export type ResolvedIcon = { path: string; viewBox: string };

/** Looks up the icon for a known slug from the pre-generated subset. */
export function getSimpleIcon(slug: string): ResolvedIcon | null {
  const icon = iconBySlug[slug];
  return icon?.path ? { path: icon.path, viewBox: "0 0 24 24" } : null;
}

/**
 * Resolves the best available icon for a tool.
 * Priority: iconSlug (simple-icons) > svgPath (inline) > null (use initials fallback).
 */
export function resolveToolIcon(tool: Tool): ResolvedIcon | null {
  if (tool.iconSlug) {
    const icon = getSimpleIcon(tool.iconSlug);
    if (icon) return icon;
  }
  if (tool.svgPath) {
    return { path: tool.svgPath, viewBox: "0 0 24 24" };
  }
  return null;
}

/** Two-letter badge for tools with no resolvable icon. */
export function toolInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const initials =
    words.length >= 2 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return initials.toUpperCase();
}
