/** URL-fragment sharing: deflate-raw + base64url. The fragment never reaches a server. */

export const SHARE_PREFIX = "v=1,";
/** Encoded-payload cap (chars). ~60+ node diagrams exceed it — suggest file export instead. */
export const MAX_SHARE_HASH_CHARS = 8 * 1024;

async function streamToBytes(
  stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeShareHash(json: string): Promise<string> {
  // Fallback: Blob.stream() is unavailable in jsdom; use Response.body as source stream.
  const sourceStream: ReadableStream<Uint8Array> =
    typeof Blob !== "undefined" && typeof new Blob([]).stream === "function"
      ? new Blob([json]).stream()
      : (new Response(json).body as ReadableStream<Uint8Array>);
  // Cast: TS lib types for CompressionStream.writable are BufferSource-wide,
  // but at runtime it accepts Uint8Array — a targeted cast avoids `any`.
  const compressed = await streamToBytes(
    sourceStream.pipeThrough(
      new CompressionStream("deflate-raw") as unknown as ReadableWritablePair<
        Uint8Array,
        Uint8Array
      >,
    ),
  );
  let bin = "";
  for (const byte of compressed) bin += String.fromCharCode(byte);
  const b64url = btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return SHARE_PREFIX + b64url;
}

/** @returns decoded JSON string, or null when `hash` is not a share hash. Throws on corrupt payload. */
export async function decodeShareHash(hash: string): Promise<string | null> {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  const b64 = hash
    .slice(SHARE_PREFIX.length)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  // Explicit validation: atob in Node/jsdom may be lenient with invalid chars;
  // reject early so "throws on corrupt payload" is reliable in all environments.
  if (!/^[A-Za-z0-9+/]*=*$/.test(b64)) throw new Error("Invalid share payload");
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  // Fallback: Blob.stream() is unavailable in jsdom; use Response.body as source stream.
  const sourceStream: ReadableStream<Uint8Array> =
    typeof Blob !== "undefined" && typeof new Blob([]).stream === "function"
      ? new Blob([bytes]).stream()
      : (new Response(bytes).body as ReadableStream<Uint8Array>);
  // Cast: same TS lib mismatch as CompressionStream above.
  const stream = sourceStream.pipeThrough(
    new DecompressionStream("deflate-raw") as unknown as ReadableWritablePair<
      Uint8Array,
      Uint8Array
    >,
  );
  return new Response(stream).text();
}
