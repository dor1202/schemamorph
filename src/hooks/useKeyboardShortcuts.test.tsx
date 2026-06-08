import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useStore } from "@/state/store";

function Harness() {
  useKeyboardShortcuts();
  return <input aria-label="text-field" />;
}

describe("keyboard shortcuts", () => {
  beforeEach(() => useStore.getState().reset());

  it("M toggles view mode", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("m");
    expect(useStore.getState().viewMode).toBe("real");
  });

  it("M inside an input does NOT toggle", async () => {
    const user = userEvent.setup();
    const { getByLabelText } = render(<Harness />);
    await user.click(getByLabelText("text-field"));
    await user.keyboard("m");
    expect(useStore.getState().viewMode).toBe("minimalist");
  });

  it("Delete removes selected node", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    await user.keyboard("{Delete}");
    expect(useStore.getState().nodes).toHaveLength(0);
  });

  it("mod+z undoes, mod+shift+z redoes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("cache", "redis", { x: 0, y: 0 });
    await user.keyboard("{Control>}z{/Control}");
    expect(useStore.getState().nodes).toHaveLength(0);
    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(useStore.getState().nodes).toHaveLength(1);
  });

  it("mod+d duplicates selection", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("queue", "kafka", { x: 0, y: 0 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    await user.keyboard("{Control>}d{/Control}");
    expect(useStore.getState().nodes).toHaveLength(2);
  });

  it("arrow key nudges selection by 8", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    useStore.getState().addNode("compute", "docker", { x: 100, y: 100 });
    useStore
      .getState()
      .setNodes(
        useStore.getState().nodes.map((n) => ({ ...n, selected: true })),
      );
    await user.keyboard("{ArrowRight}");
    expect(useStore.getState().nodes[0].position.x).toBe(108);
  });
});
