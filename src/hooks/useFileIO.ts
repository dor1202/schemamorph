import { useCallback } from "react";
import { toPng } from "html-to-image";
import {
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from "@xyflow/react";
import { toast } from "sonner";
import { useStore } from "@/state/store";
import {
  serializeSysdraw,
  parseSysdraw,
  type ParseResult,
} from "@/lib/sysdraw-file";
import { MAX_IMPORT_BYTES } from "@/config";
import { encodeShareHash, MAX_SHARE_HASH_CHARS } from "@/lib/share-url";
import type { AppNode, SysEdge } from "@/lib/types";

/** Background colors used for PNG export per theme. */
export const PNG_BG_DARK = "#0f1117";
export const PNG_BG_LIGHT = "#f8fafc";

/**
 * Post-compose a lock badge onto a PNG data URL.
 * Draws a rounded-rect chip with a lock glyph in the top-right corner.
 * Returns the original dataUrl unchanged when canvas 2D context is unavailable
 * (e.g. jsdom in tests).
 */
export async function composeLockBadge(
  dataUrl: string,
  width: number,
  height: number,
  isLight = false,
): Promise<string> {
  // Early-exit if canvas 2D is unsupported in this environment (e.g. jsdom)
  const probe = document.createElement("canvas");
  if (!probe.getContext("2d")) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Badge dimensions
      const pad = 16;
      const chipH = 28;
      const text = "🔒 Locked";
      ctx.font = "bold 14px sans-serif";
      const textW = ctx.measureText(text).width;
      const chipW = textW + pad * 2;
      const chipX = width - chipW - pad;
      const chipY = pad;
      const radius = 6;

      // Badge colors: light theme uses white chip + dark text, dark theme vice versa
      const chipBg = isLight ? "#ffffffcc" : "#161922cc";
      const chipTextColor = isLight ? "#0f172a" : "#e2e8f0";

      // Rounded rect background
      ctx.fillStyle = chipBg;
      ctx.beginPath();
      ctx.moveTo(chipX + radius, chipY);
      ctx.lineTo(chipX + chipW - radius, chipY);
      ctx.quadraticCurveTo(chipX + chipW, chipY, chipX + chipW, chipY + radius);
      ctx.lineTo(chipX + chipW, chipY + chipH - radius);
      ctx.quadraticCurveTo(
        chipX + chipW,
        chipY + chipH,
        chipX + chipW - radius,
        chipY + chipH,
      );
      ctx.lineTo(chipX + radius, chipY + chipH);
      ctx.quadraticCurveTo(chipX, chipY + chipH, chipX, chipY + chipH - radius);
      ctx.lineTo(chipX, chipY + radius);
      ctx.quadraticCurveTo(chipX, chipY, chipX + radius, chipY);
      ctx.closePath();
      ctx.fill();

      // Text
      ctx.fillStyle = chipTextColor;
      ctx.fillText(text, chipX + pad, chipY + chipH / 2 + 5);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Pure import core — testable without DOM file plumbing. */
export function importSysdrawText(text: string): ParseResult {
  const result = parseSysdraw(text);
  if (result.ok) {
    useStore
      .getState()
      .setAll(result.data.nodes as AppNode[], result.data.edges as SysEdge[], {
        viewMode: result.data.meta.viewMode,
        nodeStyle: result.data.meta.nodeStyle,
        locked: result.data.meta.locked ?? false,
      });
  }
  return result;
}

function download(blobParts: BlobPart[], type: string, filename: string) {
  const url = URL.createObjectURL(new Blob(blobParts, { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function useFileIO() {
  const { getNodes } = useReactFlow();

  const exportFile = useCallback((title = "architecture") => {
    const { nodes, edges, viewMode, nodeStyle, locked } = useStore.getState();
    download(
      [serializeSysdraw({ nodes, edges, viewMode, nodeStyle, title, locked })],
      "application/json",
      `${title}.schemamorph`,
    );
    toast.success("Exported .schemamorph");
  }, []);

  const importFile = useCallback((file: File) => {
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error("File too large (max 5 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = importSysdrawText(String(e.target?.result ?? ""));
      if (result.ok) toast.success("Diagram loaded");
      else toast.error(result.error);
    };
    reader.readAsText(file);
  }, []);

  const exportPng = useCallback(
    async (title = "architecture") => {
      const nodes = getNodes();
      if (!nodes.length) {
        toast.error("Nothing to export.");
        return;
      }
      const bounds = getNodesBounds(nodes);
      const width = Math.min(2048, bounds.width + 160);
      const height = Math.min(2048, bounds.height + 160);
      const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, 0.1);
      const el = document.querySelector<HTMLElement>(".react-flow__viewport");
      if (!el) return;
      const { locked, theme } = useStore.getState();
      const isLight = theme === "light";
      const backgroundColor = isLight ? PNG_BG_LIGHT : PNG_BG_DARK;
      let dataUrl = await toPng(el, {
        backgroundColor,
        width,
        height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
      });
      if (locked) {
        dataUrl = await composeLockBadge(dataUrl, width, height, isLight);
      }
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${title}.png`;
      link.click();
      toast.success("PNG exported");
    },
    [getNodes],
  );

  const shareLink = useCallback(async () => {
    if (typeof CompressionStream === "undefined") {
      toast.error("Sharing is not supported in this browser.");
      return;
    }
    const { nodes, edges, viewMode, nodeStyle, locked } = useStore.getState();
    if (!nodes.length) {
      toast.error("Nothing to share.");
      return;
    }
    const json = serializeSysdraw({
      nodes,
      edges,
      viewMode,
      nodeStyle,
      locked,
    });
    const hash = await encodeShareHash(json);
    if (hash.length > MAX_SHARE_HASH_CHARS) {
      toast.error(
        "Diagram too large to share by URL — save to a file instead.",
      );
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }, []);

  return { exportFile, importFile, exportPng, shareLink };
}
