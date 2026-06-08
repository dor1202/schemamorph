import { z } from "zod";

export const attributeSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["enum", "number", "text", "boolean"]),
    options: z.array(z.string().min(1)).optional(), // required when type=enum
    suggestions: z.array(z.string().min(1)).optional(), // for type=text autocomplete
  })
  .refine((v) => v.type !== "enum" || (v.options && v.options.length > 0), {
    message: "enum attributes must have a non-empty options array",
    path: ["options"],
  });

export const archetypeSchema = z.object({
  label: z.string().min(1),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  symbolViewBox: z.string().regex(/^\d+ \d+ \d+ \d+$/),
  symbolSvg: z.string().min(1), // inner SVG markup, stroke="currentColor"
  defaultTool: z.string().min(1),
  attributes: z.array(attributeSchema).default([]),
});

export const toolSchema = z.object({
  archetype: z.string().min(1),
  label: z.string().min(1),
  iconSlug: z.string().min(1).optional(), // simple-icons slug; omit -> initials fallback
  svgPath: z.string().min(1).optional(), // inline path for tools missing from simple-icons
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const archetypesFileSchema = z.record(
  z.string().min(1),
  archetypeSchema,
);
export const toolsFileSchema = z.record(z.string().min(1), toolSchema);
export const protocolsFileSchema = z.record(
  z.string().min(1),
  z.array(z.string().min(1)),
);

export type AttributeDef = z.infer<typeof attributeSchema>;
export type Archetype = z.infer<typeof archetypeSchema>;
export type Tool = z.infer<typeof toolSchema>;
