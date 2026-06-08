import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadAutosave,
  startAutosave,
  clearAutosave,
  restoreAutosave,
} from "./autosave";
import { useStore } from "./store";
import { AUTOSAVE_KEY } from "@/config";
import { serializeSysdraw } from "@/lib/sysdraw-file";

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("autosave", () => {
  it("returns null when nothing stored", () => {
    expect(loadAutosave()).toBeNull();
  });

  it("discards corrupt stored state", () => {
    localStorage.setItem(AUTOSAVE_KEY, "{corrupt");
    expect(loadAutosave()).toBeNull();
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull(); // discarded
  });

  it("persists store changes debounced and restores them", async () => {
    vi.useFakeTimers();
    const stop = startAutosave();
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull(); // not yet — debounced
    vi.advanceTimersByTime(600);
    const restored = loadAutosave();
    expect(restored?.nodes).toHaveLength(1);
    stop();
  });

  it("clearAutosave removes the key", () => {
    localStorage.setItem(AUTOSAVE_KEY, "{}");
    clearAutosave();
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull();
  });

  it("restoreAutosave hydrates store including meta", () => {
    useStore.getState().addNode("database", "mysql", { x: 1, y: 2 });
    useStore.getState().setViewMode("real");
    useStore.getState().setNodeStyle("plate");
    const { nodes, edges, viewMode, nodeStyle } = useStore.getState();
    localStorage.setItem(
      AUTOSAVE_KEY,
      serializeSysdraw({ nodes, edges, viewMode, nodeStyle }),
    );
    useStore.getState().reset();
    expect(restoreAutosave()).toBe(true);
    expect(useStore.getState().nodes).toHaveLength(1);
    expect(useStore.getState().viewMode).toBe("real");
    expect(useStore.getState().nodeStyle).toBe("plate");
  });

  it("restoreAutosave returns false when nothing stored", () => {
    expect(restoreAutosave()).toBe(false);
  });
});
