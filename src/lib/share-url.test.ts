import { describe, it, expect } from "vitest";
import { encodeShareHash, decodeShareHash, SHARE_PREFIX } from "./share-url";

describe("share-url", () => {
  it("roundtrips JSON through encode/decode", async () => {
    const json = JSON.stringify({
      version: "1.2.0",
      nodes: [{ id: "a" }],
      edges: [],
    });
    const hash = await encodeShareHash(json);
    expect(hash.startsWith(SHARE_PREFIX)).toBe(true);
    expect(await decodeShareHash(hash)).toBe(json);
  });

  it("produces base64url output (no +, /, =)", async () => {
    // enough varied content to exercise the full base64 alphabet
    const json = JSON.stringify({
      blob: Array.from({ length: 500 }, (_, i) => i * 7919).join("ÿþ"),
    });
    const payload = (await encodeShareHash(json)).slice(SHARE_PREFIX.length);
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("compresses (encoded shorter than raw for repetitive JSON)", async () => {
    const json = JSON.stringify({
      nodes: Array(50).fill({ type: "sysNode", archetype: "database" }),
    });
    const hash = await encodeShareHash(json);
    expect(hash.length).toBeLessThan(json.length);
  });

  it("returns null for non-share hashes", async () => {
    expect(await decodeShareHash("some-anchor")).toBeNull();
    expect(await decodeShareHash("")).toBeNull();
  });

  it("throws on corrupt payload", async () => {
    await expect(
      decodeShareHash(SHARE_PREFIX + "!!!not-base64!!!"),
    ).rejects.toThrow();
  });
});
