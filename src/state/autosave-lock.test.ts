/**
 * Feature 1: Lock mode — autosave persistence tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { startAutosave, clearAutosave, restoreAutosave } from "./autosave";
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

describe("autosave lock persistence", () => {
  it("locked=true triggers autosave (different from prev)", async () => {
    vi.useFakeTimers();
    const stop = startAutosave();
    useStore.getState().toggleLocked();
    vi.advanceTimersByTime(600);
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!) as { meta: { locked?: boolean } };
    expect(parsed.meta.locked).toBe(true);
    stop();
    clearAutosave();
  });

  it("restoreAutosave restores locked=true from file", () => {
    const { nodes, edges, viewMode, nodeStyle } = useStore.getState();
    localStorage.setItem(
      AUTOSAVE_KEY,
      serializeSysdraw({ nodes, edges, viewMode, nodeStyle, locked: true }),
    );
    useStore.getState().reset();
    expect(restoreAutosave()).toBe(true);
    expect(useStore.getState().locked).toBe(true);
  });

  it("restoreAutosave sets locked=false when file has no locked field", () => {
    const { nodes, edges, viewMode, nodeStyle } = useStore.getState();
    localStorage.setItem(
      AUTOSAVE_KEY,
      serializeSysdraw({ nodes, edges, viewMode, nodeStyle }),
    );
    useStore.getState().toggleLocked(); // manually set true first
    expect(restoreAutosave()).toBe(true);
    expect(useStore.getState().locked).toBe(false);
  });
});
