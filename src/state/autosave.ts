import { useStore } from "./store";
import {
  serializeSysdraw,
  parseSysdraw,
  type SysdrawFile,
} from "@/lib/sysdraw-file";
import { AUTOSAVE_KEY } from "@/config";
import type { SysNode, SysEdge } from "@/lib/types";

const DEBOUNCE_MS = 500;

export function loadAutosave(): SysdrawFile | null {
  const text = localStorage.getItem(AUTOSAVE_KEY);
  if (!text) return null;
  const result = parseSysdraw(text);
  if (!result.ok) {
    localStorage.removeItem(AUTOSAVE_KEY); // corrupt -> discard, start fresh
    return null;
  }
  return result.data;
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

/** Subscribe to store changes; debounced write. Returns unsubscribe. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (
      state.nodes === prev.nodes &&
      state.edges === prev.edges &&
      state.viewMode === prev.viewMode &&
      state.nodeStyle === prev.nodeStyle &&
      state.locked === prev.locked
    )
      return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { nodes, edges, viewMode, nodeStyle, locked } = useStore.getState();
      try {
        localStorage.setItem(
          AUTOSAVE_KEY,
          serializeSysdraw({ nodes, edges, viewMode, nodeStyle, locked }),
        );
      } catch {
        /* quota exceeded — autosave is best-effort */
      }
    }, DEBOUNCE_MS);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

/** Hydrate store from autosave at app boot. */
export function restoreAutosave(): boolean {
  const saved = loadAutosave();
  if (!saved) return false;
  // zod-inferred nodes lack React Flow's optional runtime fields (selected/measured) — structurally compatible
  useStore
    .getState()
    .setAll(saved.nodes as SysNode[], saved.edges as SysEdge[], {
      viewMode: saved.meta.viewMode,
      nodeStyle: saved.meta.nodeStyle,
      locked: saved.meta.locked ?? false,
    });
  return true;
}
