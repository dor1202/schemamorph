/* eslint-disable @typescript-eslint/no-explicit-any -- jsdom mocks for React Flow require global patching */
import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

// Node 25 exposes a native localStorage stub (without .clear / .length) that
// shadows jsdom's full implementation.  Override it with a proper in-memory
// store so tests can call localStorage.clear(), .setItem(), etc.
if (
  typeof localStorage === "undefined" ||
  typeof localStorage.clear !== "function"
) {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  } satisfies Storage;
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;

class DOMMatrixReadOnlyMock {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([\d.]+)\)/)?.[1];
    this.m22 = scale !== undefined ? +scale : 1;
  }
}
(globalThis as any).DOMMatrixReadOnly = DOMMatrixReadOnlyMock;

Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: {
    get() {
      return parseFloat(this.style.height) || 60;
    },
  },
  offsetWidth: {
    get() {
      return parseFloat(this.style.width) || 180;
    },
  },
});
(SVGElement.prototype as any).getBBox = () => ({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

// ---- matchMedia mock (jsdom lacks it) ----
// Tests flip media state via setMockMedia(); default = desktop, fine pointer.
type MediaListener = (e: { matches: boolean }) => void;
const mediaState: { width: number; coarse: boolean } = {
  width: 1280,
  coarse: false,
};
const mediaListeners = new Map<string, Set<MediaListener>>();

function evaluateQuery(query: string): boolean {
  const min = query.match(/min-width:\s*(\d+)px/);
  const max = query.match(/max-width:\s*(\d+)px/);
  if (query.includes("pointer: coarse")) return mediaState.coarse;
  let ok = true;
  if (min) ok = ok && mediaState.width >= Number(min[1]);
  if (max) ok = ok && mediaState.width <= Number(max[1]);
  return ok && Boolean(min || max);
}

window.matchMedia = ((query: string) => {
  const listeners =
    mediaListeners.get(query) ??
    mediaListeners.set(query, new Set()).get(query)!;
  return {
    media: query,
    get matches() {
      return evaluateQuery(query);
    },
    addEventListener: (_: "change", cb: MediaListener) => listeners.add(cb),
    removeEventListener: (_: "change", cb: MediaListener) =>
      listeners.delete(cb),
    // legacy API some libs call:
    addListener: (cb: MediaListener) => listeners.add(cb),
    removeListener: (cb: MediaListener) => listeners.delete(cb),
    onchange: null,
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}) as typeof window.matchMedia;

/** Test helper: set viewport/pointer state and notify subscribers. */
(globalThis as Record<string, unknown>).setMockMedia = (
  next: Partial<typeof mediaState>,
) => {
  Object.assign(mediaState, next);
  for (const [query, listeners] of mediaListeners) {
    const matches = evaluateQuery(query);
    for (const cb of listeners) cb({ matches });
  }
};

// Belt-and-braces: reset media state before every test so it can't leak.
// Per-test explicit setMockMedia() calls still take precedence (run after this).
beforeEach(() => {
  mediaState.width = 1280;
  mediaState.coarse = false;
});
