import { useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. SSR/jsdom-safe (false when matchMedia missing). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      const cb = () => onChange();
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () =>
      typeof window.matchMedia === "function"
        ? window.matchMedia(query).matches
        : false,
  );
}

export const useIsPhone = () => useMediaQuery("(max-width: 639px)");
export const useIsTablet = () =>
  useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
export const useIsCoarsePointer = () => useMediaQuery("(pointer: coarse)");
