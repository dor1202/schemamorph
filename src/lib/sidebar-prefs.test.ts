/**
 * Feature 2+3: Sidebar prefs helpers — clamp and localStorage round-trip
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  clampLeftWidth,
  clampRightWidth,
  loadSidebarPrefs,
  saveSidebarPrefs,
  type SidebarPrefs,
} from "./sidebar-prefs";

const SIDEBAR_KEY = "schemamorph:sidebar";

beforeEach(() => {
  localStorage.clear();
});

describe("clampLeftWidth", () => {
  it("clamps below min to 140", () => {
    expect(clampLeftWidth(100)).toBe(140);
  });

  it("clamps above max to 360", () => {
    expect(clampLeftWidth(400)).toBe(360);
  });

  it("returns valid value unchanged", () => {
    expect(clampLeftWidth(220)).toBe(220);
  });
});

describe("clampRightWidth", () => {
  it("clamps below min to 180", () => {
    expect(clampRightWidth(100)).toBe(180);
  });

  it("clamps above max to 420", () => {
    expect(clampRightWidth(500)).toBe(420);
  });

  it("returns valid value unchanged", () => {
    expect(clampRightWidth(250)).toBe(250);
  });
});

describe("sidebar prefs persistence", () => {
  it("loadSidebarPrefs returns defaults when nothing stored", () => {
    const prefs = loadSidebarPrefs();
    expect(prefs.leftWidth).toBeGreaterThanOrEqual(140);
    expect(prefs.rightWidth).toBeGreaterThanOrEqual(180);
    expect(prefs.collapsed).toBe(false);
  });

  it("saveSidebarPrefs + loadSidebarPrefs round-trips", () => {
    const prefs: SidebarPrefs = {
      leftWidth: 220,
      rightWidth: 300,
      collapsed: true,
    };
    saveSidebarPrefs(prefs);
    const loaded = loadSidebarPrefs();
    expect(loaded.leftWidth).toBe(220);
    expect(loaded.rightWidth).toBe(300);
    expect(loaded.collapsed).toBe(true);
  });

  it("loadSidebarPrefs clamps stored out-of-range widths", () => {
    localStorage.setItem(
      SIDEBAR_KEY,
      JSON.stringify({ leftWidth: 50, rightWidth: 1000, collapsed: false }),
    );
    const prefs = loadSidebarPrefs();
    expect(prefs.leftWidth).toBe(140);
    expect(prefs.rightWidth).toBe(420);
  });

  it("loadSidebarPrefs handles corrupt JSON gracefully", () => {
    localStorage.setItem(SIDEBAR_KEY, "not-json{");
    const prefs = loadSidebarPrefs();
    expect(prefs.collapsed).toBe(false);
  });
});
