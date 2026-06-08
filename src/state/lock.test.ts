/**
 * Feature 1: Lock mode — store toggle tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";

const fresh = () => useStore.getState();

beforeEach(() => {
  localStorage.clear();
  useStore.getState().reset();
});

describe("lock mode store", () => {
  it("locked defaults to false", () => {
    expect(fresh().locked).toBe(false);
  });

  it("toggleLocked flips false→true", () => {
    fresh().toggleLocked();
    expect(fresh().locked).toBe(true);
  });

  it("toggleLocked flips true→false", () => {
    fresh().toggleLocked();
    fresh().toggleLocked();
    expect(fresh().locked).toBe(false);
  });

  it("toggleLocked does NOT create a snapshot entry (undo stack unchanged)", () => {
    fresh().addNode("database", "mysql", { x: 0, y: 0 });
    const pastBefore = fresh().past.length;
    fresh().toggleLocked();
    expect(fresh().past.length).toBe(pastBefore);
  });

  it("reset preserves locked=false", () => {
    fresh().toggleLocked();
    fresh().reset();
    expect(fresh().locked).toBe(false);
  });
});
