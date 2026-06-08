import { toast } from "sonner";
import { decodeShareHash } from "@/lib/share-url";
import { parseSysdraw } from "@/lib/sysdraw-file";
import { useStore } from "./store";
import type { SysNode, SysEdge } from "@/lib/types";

/**
 * Boot-time restore from a share-URL fragment. Returns true when a shared
 * diagram was loaded (caller must then SKIP autosave restore for this boot).
 * The hash is stripped either way — a broken link shouldn't stick around.
 */
export async function restoreFromShareHash(): Promise<boolean> {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash.startsWith("v=1,")) return false;

  let json: string | null;
  try {
    json = await decodeShareHash(hash);
  } catch {
    json = null;
  }
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  if (json === null) {
    toast.error("Could not open shared link — it may be corrupted.");
    return false;
  }
  const result = parseSysdraw(json);
  if (!result.ok) {
    toast.error(result.error);
    return false;
  }
  // zod-inferred nodes lack RF's optional runtime fields — structurally compatible (same cast as autosave)
  useStore
    .getState()
    .setAll(result.data.nodes as SysNode[], result.data.edges as SysEdge[], {
      viewMode: result.data.meta.viewMode,
      nodeStyle: result.data.meta.nodeStyle,
      locked: result.data.meta.locked ?? false,
    });
  return true;
}
