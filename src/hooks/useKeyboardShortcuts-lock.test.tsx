/**
 * Feature 1: Lock mode — keyboard shortcuts no-op tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useStore } from "@/state/store";

function Harness() {
  useKeyboardShortcuts();
  return <div />;
}

describe("keyboard shortcuts — lock mode", () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it("Delete is no-op when locked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    useStore.setState({ locked: true });
    await user.keyboard("{Delete}");
    expect(useStore.getState().nodes).toHaveLength(1);
  });

  it("mod+d duplicate is no-op when locked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("cache", "redis", { x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    useStore.setState({ locked: true });
    await user.keyboard("{Control>}d{/Control}");
    expect(useStore.getState().nodes).toHaveLength(1);
  });

  it("mod+z undo is no-op when locked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("cache", "redis", { x: 0, y: 0 });
    useStore.setState({ locked: true });
    await user.keyboard("{Control>}z{/Control}");
    expect(useStore.getState().nodes).toHaveLength(1);
  });

  it("Arrow nudge is no-op when locked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("compute", "docker", { x: 100, y: 100 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    useStore.setState({ locked: true });
    await user.keyboard("{ArrowRight}");
    expect(useStore.getState().nodes[0].position.x).toBe(100);
  });

  it("M still toggles view mode when locked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.setState({ locked: true });
    await user.keyboard("m");
    expect(useStore.getState().viewMode).toBe("real");
  });
});
