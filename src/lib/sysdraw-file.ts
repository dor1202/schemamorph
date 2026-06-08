import { z } from "zod";
import type { AppNode, SysEdge, ViewMode, NodeStyle } from "./types";
import { absolutizeAll } from "./grouping";

export const SYSDRAW_VERSION = "1.3.0";

const positionSchema = z.object({ x: z.number(), y: z.number() });

// --- Per-type node schemas ---

const sysNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("sysNode").catch("sysNode"),
  position: positionSchema,
  data: z.object({
    archetype: z.string().min(1),
    concreteTool: z.string().min(1),
    label: z.string(),
    customProperties: z.record(z.string(), z.string()).optional(),
  }),
});

const noteNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("noteNode"),
  position: positionSchema,
  data: z.object({
    text: z.string(),
    color: z.string().optional(),
    size: z.enum(["small", "normal", "title"]).optional(),
  }),
});

const boundaryNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("boundaryNode"),
  position: positionSchema,
  width: z.number().optional(),
  height: z.number().optional(),
  data: z.object({
    label: z.string(),
    color: z.string().optional(),
  }),
});

const stepNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("stepNode"),
  position: positionSchema,
  data: z.object({
    n: z.number().optional(),
    label: z.string().optional(),
    color: z.string().optional(),
  }),
});

const arrowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal("arrowNode"),
  position: positionSchema,
  data: z.object({
    dx: z.number(),
    dy: z.number(),
    color: z.string().optional(),
    lineStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
  }),
});

// Union: items failing all schemas are rejected (index path in error)
const anyNodeSchema = z.union([
  sysNodeSchema,
  noteNodeSchema,
  boundaryNodeSchema,
  stepNodeSchema,
  arrowNodeSchema,
]);

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.literal("sysEdge").catch("sysEdge"),
  animated: z.boolean().optional(),
  data: z
    .object({
      label: z.string().optional(),
      protocol: z.string().optional(),
      color: z.string().optional(),
      customProperties: z.record(z.string(), z.string()).optional(),
    })
    .optional(),
});

const metaSchema = z
  .object({
    title: z.string().optional(),
    lastModified: z.string().optional(),
    viewMode: z.enum(["minimalist", "real"]).optional(),
    nodeStyle: z.enum(["symbol", "card", "plate"]).optional(),
    locked: z.boolean().optional(),
  })
  .catch({});

export const sysdrawFileSchema = z.object({
  version: z.string(),
  meta: metaSchema.default({}),
  nodes: z.array(anyNodeSchema),
  edges: z.array(edgeSchema),
});

export type SysdrawFile = z.infer<typeof sysdrawFileSchema>;

export function serializeSysdraw(state: {
  nodes: AppNode[];
  edges: SysEdge[];
  viewMode: ViewMode;
  nodeStyle: NodeStyle;
  title?: string;
  locked?: boolean;
}): string {
  const sourceNodes = absolutizeAll(state.nodes);
  const serializedNodes = sourceNodes.map((n) => {
    if (n.type === "noteNode") {
      return {
        id: n.id,
        type: "noteNode" as const,
        position: n.position,
        data: {
          text: n.data.text,
          ...(n.data.color !== undefined ? { color: n.data.color } : {}),
          ...(n.data.size !== undefined ? { size: n.data.size } : {}),
        },
      };
    }
    if (n.type === "boundaryNode") {
      return {
        id: n.id,
        type: "boundaryNode" as const,
        position: n.position,
        ...(n.width !== undefined ? { width: n.width } : {}),
        ...(n.height !== undefined ? { height: n.height } : {}),
        data: {
          label: n.data.label,
          ...(n.data.color !== undefined ? { color: n.data.color } : {}),
        },
      };
    }
    if (n.type === "stepNode") {
      const sn = n as import("./types").StepNode;
      return {
        id: sn.id,
        type: "stepNode" as const,
        position: sn.position,
        data: {
          n: sn.data.n ?? 0, // back-compat for v1.2 readers
          ...(sn.data.label !== undefined ? { label: sn.data.label } : {}),
          ...(sn.data.color !== undefined ? { color: sn.data.color } : {}),
        },
      };
    }
    if (n.type === "arrowNode") {
      const an = n as import("./types").ArrowNode;
      return {
        id: an.id,
        type: "arrowNode" as const,
        position: an.position,
        data: {
          dx: an.data.dx,
          dy: an.data.dy,
          ...(an.data.color !== undefined ? { color: an.data.color } : {}),
          ...(an.data.lineStyle !== undefined
            ? { lineStyle: an.data.lineStyle }
            : {}),
        },
      };
    }
    // sysNode
    const sn = n as import("./types").SysNode;
    return {
      id: sn.id,
      type: "sysNode" as const,
      position: sn.position,
      data: {
        archetype: sn.data.archetype,
        concreteTool: sn.data.concreteTool,
        label: sn.data.label,
        ...(sn.data.customProperties
          ? { customProperties: sn.data.customProperties }
          : {}),
      },
    };
  });

  const file = {
    version: SYSDRAW_VERSION,
    meta: {
      title: state.title ?? "architecture",
      lastModified: new Date().toISOString(),
      viewMode: state.viewMode,
      nodeStyle: state.nodeStyle,
      ...(state.locked ? { locked: true } : {}),
    },
    nodes: serializedNodes,
    edges: state.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "sysEdge" as const,
      ...(e.animated ? { animated: true } : {}),
      data: {
        ...(e.data?.label !== undefined ? { label: e.data.label } : {}),
        ...(e.data?.protocol !== undefined
          ? { protocol: e.data.protocol }
          : {}),
        ...(e.data?.color !== undefined ? { color: e.data.color } : {}),
        ...(e.data?.customProperties !== undefined
          ? { customProperties: e.data.customProperties }
          : {}),
      },
    })),
  };
  return JSON.stringify(file, null, 2);
}

export type ParseResult =
  | { ok: true; data: SysdrawFile }
  | { ok: false; error: string };

export function parseSysdraw(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }
  const result = sysdrawFileSchema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      ok: false,
      error: `Invalid file — ${issue.path.join(".") || "root"}: ${issue.message}`,
    };
  }
  return { ok: true, data: result.data };
}
