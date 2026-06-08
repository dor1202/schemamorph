import { describe, it, expect } from "vitest";
import { getSimpleIcon, toolInitials } from "./icons";

describe("icons", () => {
  it("resolves a known slug", () => {
    const icon = getSimpleIcon("mysql");
    expect(icon).not.toBeNull();
    expect(icon!.path.length).toBeGreaterThan(10);
  });

  it("returns null for unknown slug", () => {
    expect(getSimpleIcon("definitely-not-a-brand-xyz")).toBeNull();
  });

  it("derives initials for fallback badge", () => {
    expect(toolInitials("AWS SQS")).toBe("AS");
    expect(toolInitials("Redis")).toBe("RE");
  });

  it("falls back to ? for empty/whitespace labels", () => {
    expect(toolInitials("")).toBe("?");
    expect(toolInitials("   ")).toBe("?");
    expect(toolInitials("  Redis")).toBe("RE");
  });
});
