import { describe, it, expect, beforeEach } from "vitest";
import { restoreFromShareHash } from "./share-boot";
import { encodeShareHash } from "@/lib/share-url";
import { serializeSysdraw } from "@/lib/sysdraw-file";
import { useStore } from "./store";
import type { SysNode } from "@/lib/types";

const NODE: SysNode = {
  id: "n1",
  type: "sysNode",
  position: { x: 5, y: 6 },
  data: { archetype: "database", concreteTool: "postgresql", label: "DB" },
};

describe("restoreFromShareHash", () => {
  beforeEach(() => {
    useStore.getState().reset();
    window.location.hash = "";
  });

  it("returns false without a share hash", async () => {
    expect(await restoreFromShareHash()).toBe(false);
  });

  it("loads a shared diagram into the store and strips the hash", async () => {
    const json = serializeSysdraw({
      nodes: [NODE],
      edges: [],
      viewMode: "real",
      nodeStyle: "plate",
      locked: true,
    });
    window.location.hash = "#" + (await encodeShareHash(json));
    expect(await restoreFromShareHash()).toBe(true);
    const s = useStore.getState();
    expect(s.nodes).toHaveLength(1);
    expect(s.viewMode).toBe("real");
    expect(s.nodeStyle).toBe("plate");
    expect(s.locked).toBe(true); // locked snapshot opens locked
    expect(window.location.hash).not.toContain("v=1,");
  });

  it("returns false and strips hash on corrupt payload", async () => {
    window.location.hash = "#v=1,@@@corrupt@@@";
    expect(await restoreFromShareHash()).toBe(false);
    expect(useStore.getState().nodes).toHaveLength(0);
    expect(window.location.hash).not.toContain("v=1,");
  });
});
