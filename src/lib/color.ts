/**
 * Returns relative luminance (0–1) of a hex color string (#rrggbb or #rgb).
 */
function hexLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Convert a #rrggbb hex to HSL (h: 0–360, s: 0–1, l: 0–1). */
function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let hDeg: number;
  if (max === r) {
    hDeg = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    hDeg = ((b - r) / d + 2) / 6;
  } else {
    hDeg = ((r - g) / d + 4) / 6;
  }

  return [hDeg * 360, s, l];
}

/** Convert HSL (h: 0–360, s: 0–1, l: 0–1) to a #rrggbb hex string. */
function hslToHex(h: number, s: number, l: number): string {
  const hNorm = h / 360;
  const hue2rgb = (p: number, q: number, t: number): number => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Returns a theme-appropriate version of a brand/archetype hex color.
 *
 * Dark theme: returns the color as-is.
 * Light theme: if relative luminance > 0.55 (pastel / near-white), the color
 * is darkened via HSL — lightness is clamped to ≤ 0.42, keeping hue and
 * saturation intact so the color remains recognisable.
 */
export function themedColor(hex: string, isLight: boolean): string {
  if (!isLight) return hex;

  const lum = hexLuminance(hex);
  if (lum <= 0.55) return hex; // already dark enough

  const [h, s, l] = hexToHsl(hex);
  const clampedL = Math.min(l, 0.42);
  return hslToHex(h, s, clampedL);
}
