import { readFileSync } from "fs";
import { describe, it, expect } from "vitest";
import { parseSysdraw } from "@/lib/sysdraw-file";

const EXAMPLES = [
  "examples/ecommerce-checkout.schemamorph",
  "examples/ai-rag-pipeline.schemamorph",
];

describe("example diagrams", () => {
  for (const path of EXAMPLES) {
    it(`${path} parses as valid v1.3.0`, () => {
      const text = readFileSync(path, "utf8");
      const result = parseSysdraw(text);
      expect(result.ok, result.ok ? "" : result.error).toBe(true);
      if (!result.ok) return;
      expect(result.data.version).toBe("1.3.0");
      expect(result.data.nodes.length).toBeGreaterThan(5);
      expect(result.data.edges.length).toBeGreaterThan(5);
      expect(result.data.meta.title).toBeTruthy();
    });
  }
});
