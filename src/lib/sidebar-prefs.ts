export const SIDEBAR_KEY = "schemamorph:sidebar";

export const LEFT_WIDTH_MIN = 140;
export const LEFT_WIDTH_MAX = 360;
export const LEFT_WIDTH_DEFAULT = 176; // ~w-44 in px

export const RIGHT_WIDTH_MIN = 180;
export const RIGHT_WIDTH_MAX = 420;
export const RIGHT_WIDTH_DEFAULT = 208; // ~w-52 in px

export type SidebarPrefs = {
  leftWidth: number;
  rightWidth: number;
  collapsed: boolean;
};

export function clampLeftWidth(w: number): number {
  return Math.min(LEFT_WIDTH_MAX, Math.max(LEFT_WIDTH_MIN, w));
}

export function clampRightWidth(w: number): number {
  return Math.min(RIGHT_WIDTH_MAX, Math.max(RIGHT_WIDTH_MIN, w));
}

export function loadSidebarPrefs(): SidebarPrefs {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (!raw) return defaultPrefs();
    const parsed = JSON.parse(raw) as Partial<SidebarPrefs>;
    return {
      leftWidth: clampLeftWidth(
        typeof parsed.leftWidth === "number"
          ? parsed.leftWidth
          : LEFT_WIDTH_DEFAULT,
      ),
      rightWidth: clampRightWidth(
        typeof parsed.rightWidth === "number"
          ? parsed.rightWidth
          : RIGHT_WIDTH_DEFAULT,
      ),
      collapsed:
        typeof parsed.collapsed === "boolean" ? parsed.collapsed : false,
    };
  } catch {
    return defaultPrefs();
  }
}

export function saveSidebarPrefs(prefs: SidebarPrefs): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded — best-effort
  }
}

function defaultPrefs(): SidebarPrefs {
  return {
    leftWidth: LEFT_WIDTH_DEFAULT,
    rightWidth: RIGHT_WIDTH_DEFAULT,
    collapsed: false,
  };
}
