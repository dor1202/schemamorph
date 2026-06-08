import archetypesRaw from "@/catalog/archetypes.json";
import toolsRaw from "@/catalog/tools.json";
import protocolsRaw from "@/catalog/protocols.json";
import {
  archetypesFileSchema,
  toolsFileSchema,
  protocolsFileSchema,
  type Archetype,
  type AttributeDef,
  type Tool,
} from "./catalog-schema";

export const archetypes: Record<string, Archetype> =
  archetypesFileSchema.parse(archetypesRaw);
export const tools: Record<string, Tool> = toolsFileSchema.parse(toolsRaw);
export const protocolGroups: Record<string, string[]> =
  protocolsFileSchema.parse(protocolsRaw);
export const protocols: string[] = Object.values(protocolGroups).flat();

export const getArchetype = (key: string): Archetype | undefined =>
  archetypes[key];
export const getTool = (key: string): Tool | undefined => tools[key];
export const toolsForArchetype = (archetype: string): [string, Tool][] =>
  Object.entries(tools).filter(([, t]) => t.archetype === archetype);

/** Returns the attributes array for an archetype key, or [] if unknown. */
export const getArchetypeAttributes = (key: string): AttributeDef[] =>
  archetypes[key]?.attributes ?? [];

export type { AttributeDef };
