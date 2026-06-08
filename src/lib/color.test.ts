import { describe, it, expect } from "vitest";
import { themedColor } from "./color";

describe("themedColor", () => {
  it("dark theme: returns hex unchanged regardless of luminance", () => {
    expect(themedColor("#7dd3fc", false)).toBe("#7dd3fc");
    expect(themedColor("#86efac", false)).toBe("#86efac");
    expect(themedColor("#fde047", false)).toBe("#fde047");
    expect(themedColor("#e3e3e3", false)).toBe("#e3e3e3");
    expect(themedColor("#1a5276", false)).toBe("#1a5276");
  });

  it("light theme: leaves already-dark color unchanged (#1a5276)", () => {
    // luminance of #1a5276 is well below 0.55
    const result = themedColor("#1a5276", true);
    // Should not be darkened (it's already dark)
    expect(result).toBe("#1a5276");
  });

  it("light theme: darkens pastel sky blue #7dd3fc to ≤42% lightness", () => {
    const result = themedColor("#7dd3fc", true);
    // Must not equal input
    expect(result).not.toBe("#7dd3fc");
    // Must be a valid hex color
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    // Parse resulting HSL: lightness should be ≤ 0.42
    const h = result.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    expect(lightness).toBeLessThanOrEqual(0.43); // 0.42 + tiny float tolerance
  });

  it("light theme: darkens near-white #e3e3e3 to a readable dark gray", () => {
    const result = themedColor("#e3e3e3", true);
    // Must be different from input
    expect(result).not.toBe("#e3e3e3");
    // Must be a valid hex color
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    // Must be dark enough to read on white — check resulting luminance < 0.18
    const h = result.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const toLinear = (c: number) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const lum =
      0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    expect(lum).toBeLessThan(0.18);
  });

  it("light theme: darkens green #86efac", () => {
    const result = themedColor("#86efac", true);
    expect(result).not.toBe("#86efac");
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("light theme: darkens yellow #fde047", () => {
    const result = themedColor("#fde047", true);
    expect(result).not.toBe("#fde047");
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
