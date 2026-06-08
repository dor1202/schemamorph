// src/lib/mermaid-import.ts
import type { SysNode, SysEdge, LayoutDirection } from "./types";
import { getArchetype } from "./catalog";

export type MermaidParseResult =
  | { ok: true; nodes: SysNode[]; edges: SysEdge[]; direction: LayoutDirection }
  | { ok: false; error: string };

const HEADER_RE = /^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)\s*;?\s*$/i;
// Limitation: node ids that ARE reserved words (e.g. end[Label]) are swallowed by this filter.
const IGNORED_RE =
  /^(?:subgraph\b|end\b|classDef\b|class\b|style\b|linkStyle\b|click\b|%%)/;
// Alternation order matters: "-- text -->" must win before plain "-->".
// Two capture groups → String.split yields [token, g1, g2, token, g1, g2, ...].
// Label class is [^>]+? (not [^-]+?) so labels containing hyphens are captured.
const ARROW_RE = /\s*(?:--\s+([^>]+?)\s+-->|-->\|([^|]*)\||-->)\s*/;

// Limitation: only double-quoted labels are unwrapped; single quotes pass through.
const stripQuotes = (s: string): string => {
  const t = s.trim();
  return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
};

type ParsedToken = {
  id: string;
  label: string;
  archetype: string;
  explicit: boolean;
};

function parseNodeToken(token: string): ParsedToken | null {
  const t = token.trim();
  // Most specific bracket pairs first.
  const shapes: [RegExp, string][] = [
    [/^(\w[\w-]*)\[\((.+)\)\]$/, "database"],
    [/^(\w[\w-]*)\{\{(.+)\}\}$/, "gateway"],
    [/^(\w[\w-]*)\(\[(.+)\]\)$/, "compute"],
    [/^(\w[\w-]*)\[\/(.+)\/\]$/, "compute"],
    [/^(\w[\w-]*)\(\((.+)\)\)$/, "cache"],
    [/^(\w[\w-]*)>(.+)\]$/, "queue"],
    [/^(\w[\w-]*)\[(.+)\]$/, "compute"],
    // Unlisted bracket styles (rhombus {x}, round (x)) fall back to compute.
    [/^(\w[\w-]*)\{(.+)\}$/, "compute"],
    [/^(\w[\w-]*)\((.+)\)$/, "compute"],
  ];
  for (const [re, archetype] of shapes) {
    const m = t.match(re);
    if (m)
      return { id: m[1], label: stripQuotes(m[2]), archetype, explicit: true };
  }
  const bare = t.match(/^(\w[\w-]*)$/);
  if (bare)
    return {
      id: bare[1],
      label: bare[1],
      archetype: "compute",
      explicit: false,
    };
  return null;
}

export function parseMermaid(text: string): MermaidParseResult {
  let direction: LayoutDirection = "LR";
  const nodesById = new Map<string, SysNode>();
  const explicitIds = new Set<string>();
  const edges: SysEdge[] = [];

  const ensureNode = (token: string): string | null => {
    const parsed = parseNodeToken(token);
    if (!parsed) return null;
    const existing = nodesById.get(parsed.id);
    if (!existing || (parsed.explicit && !explicitIds.has(parsed.id))) {
      const archetype = parsed.archetype;
      nodesById.set(parsed.id, {
        id: parsed.id,
        type: "sysNode",
        position: { x: 0, y: 0 },
        data: {
          archetype,
          concreteTool: getArchetype(archetype)?.defaultTool ?? "",
          label: parsed.label,
        },
      });
      if (parsed.explicit) explicitIds.add(parsed.id);
    }
    return parsed.id;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const header = line.match(HEADER_RE);
    if (header) {
      const dir = header[1].toUpperCase();
      direction = dir === "LR" || dir === "RL" ? "LR" : "TB";
      continue;
    }
    if (IGNORED_RE.test(line)) continue;
    // Normalize dotted/thick arrows to plain before splitting.
    const normalized = line.replace(/-\.+->/g, "-->").replace(/==>/g, "-->");
    const parts = normalized.split(ARROW_RE);
    if (parts.length === 1) {
      ensureNode(line);
      continue;
    }
    // parts: [token, g1, g2, token, g1, g2, ..., token]
    let prevId = ensureNode(parts[0]);
    for (let i = 1; i < parts.length - 1; i += 3) {
      const label = parts[i] ?? parts[i + 1];
      const nextId = ensureNode(parts[i + 2]);
      if (prevId && nextId) {
        edges.push({
          id: `mermaid-e${edges.length}`,
          source: prevId,
          target: nextId,
          type: "sysEdge",
          data: label !== undefined ? { label: label.trim() } : {},
        });
      }
      prevId = nextId ?? prevId;
    }
  }

  if (nodesById.size === 0) {
    return { ok: false, error: "No nodes found — check your Mermaid syntax." };
  }
  return { ok: true, nodes: [...nodesById.values()], edges, direction };
}
