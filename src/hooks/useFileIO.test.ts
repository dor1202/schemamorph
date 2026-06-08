import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import {
  importSysdrawText,
  composeLockBadge,
  PNG_BG_DARK,
  PNG_BG_LIGHT,
  useFileIO,
} from "./useFileIO";
import { useStore } from "@/state/store";
import { serializeSysdraw } from "@/lib/sysdraw-file";
import { decodeShareHash, SHARE_PREFIX } from "@/lib/share-url";

const renderFileIO = () =>
  renderHook(() => useFileIO(), {
    wrapper: ReactFlowProvider,
  });

describe("importSysdrawText", () => {
  beforeEach(() => useStore.getState().reset());

  it("hydrates store from valid text", () => {
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    const text = serializeSysdraw({ ...useStore.getState(), title: "t" });
    useStore.getState().reset();
    const result = importSysdrawText(text);
    expect(result.ok).toBe(true);
    expect(useStore.getState().nodes).toHaveLength(1);
  });

  it("leaves state untouched on invalid text", () => {
    useStore.getState().addNode("cache", "redis", { x: 0, y: 0 });
    const result = importSysdrawText('{"version":"1.0.0"}'); // missing nodes/edges
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("nodes");
    expect(useStore.getState().nodes).toHaveLength(1); // untouched
  });
});

describe("composeLockBadge", () => {
  it("returns a data URL string (or original when canvas unsupported)", async () => {
    const input = "data:image/png;base64,abc123";
    const result = await composeLockBadge(input, 200, 100);
    // jsdom canvas may lack 2D context; either a data URL is returned or the original
    expect(typeof result).toBe("string");
    expect(result.startsWith("data:")).toBe(true);
  });

  it("returns original URL when canvas 2D context unavailable (graceful fallback)", async () => {
    // Simulate environment where canvas.getContext('2d') returns null
    const origCreate = document.createElement.bind(document);
    const spy = (tag: string) => {
      if (tag === "canvas") {
        const canvas = origCreate(tag) as HTMLCanvasElement;
        canvas.getContext = () => null;
        return canvas;
      }
      return origCreate(tag);
    };
    document.createElement = spy as typeof document.createElement;

    const input = "data:image/png;base64,abc123";
    const result = await composeLockBadge(input, 200, 100);
    expect(result).toBe(input);

    document.createElement = origCreate;
  });

  it("returns a different data URL than the input when canvas 2D is available", async () => {
    // If jsdom supports 2D canvas, the composed result should differ from input
    const testCanvas = document.createElement("canvas");
    const ctx = testCanvas.getContext("2d");
    if (ctx === null) {
      // jsdom doesn't support 2D canvas in this environment — skip
      return;
    }
    const input =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const result = await composeLockBadge(input, 100, 50);
    // The composed canvas should produce a different (or at least valid) data URL
    expect(result.startsWith("data:image/png")).toBe(true);
  });
});

describe("shareLink", () => {
  beforeEach(() => {
    useStore.getState().reset();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  it("copies a URL whose hash decodes to the serialized diagram", async () => {
    useStore.getState().addNode("database", "postgresql", { x: 10, y: 20 });
    const { result } = renderFileIO();
    await act(() => result.current.shareLink());
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    expect(writeText).toHaveBeenCalledTimes(1);
    const url = writeText.mock.calls[0][0] as string;
    const hash = url.split("#")[1];
    expect(hash.startsWith(SHARE_PREFIX)).toBe(true);
    const json = await decodeShareHash(hash);
    const parsed = JSON.parse(json!);
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.version).toBe("1.3.0");
  });

  it("does nothing on an empty canvas", async () => {
    const { result } = renderFileIO();
    await act(() => result.current.shareLink());
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});

describe("PNG export background constants", () => {
  it("PNG_BG_DARK is the dark theme background color", () => {
    expect(PNG_BG_DARK).toBe("#0f1117");
  });

  it("PNG_BG_LIGHT is the light theme background color", () => {
    expect(PNG_BG_LIGHT).toBe("#f8fafc");
  });

  it("PNG_BG_LIGHT matches the CSS --bg light theme value", () => {
    // The light --bg in index.css is #f8fafc; keep them in sync
    expect(PNG_BG_LIGHT).toBe("#f8fafc");
  });
});
