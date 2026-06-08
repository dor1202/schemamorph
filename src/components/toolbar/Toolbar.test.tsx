import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { Toolbar } from "./Toolbar";
import { useStore } from "@/state/store";
import { GITHUB_REPO_URL } from "@/config";

const setup = () =>
  render(
    <ReactFlowProvider>
      <Toolbar />
    </ReactFlowProvider>,
  );

describe("Toolbar", () => {
  beforeEach(() => {
    localStorage.clear();
    useStore.getState().reset();
    useStore.getState().setTheme("dark");
  });
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it("mode toggle switches viewMode", async () => {
    const user = userEvent.setup();
    setup();
    expect(useStore.getState().viewMode).toBe("minimalist");
    await user.click(screen.getByRole("button", { name: "Real Tools" }));
    expect(useStore.getState().viewMode).toBe("real");
  });

  it("Undo and Redo buttons are NOT in the Toolbar (they live in CanvasControls)", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: "Undo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Redo" }),
    ).not.toBeInTheDocument();
  });

  it("Tidy layout button is NOT in the Toolbar (it lives in the Palette)", () => {
    setup();
    expect(
      screen.queryByRole("button", { name: "Tidy layout" }),
    ).not.toBeInTheDocument();
  });

  it("GitHub link points at repo and opens new tab", () => {
    setup();
    const link = screen.getByRole("link", { name: /github/i });
    expect(link).toHaveAttribute("href", GITHUB_REPO_URL);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("settings menu changes node style", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Symbol" }));
    expect(useStore.getState().nodeStyle).toBe("symbol");
  });

  it("Toggle theme button switches from dark to light", async () => {
    const user = userEvent.setup();
    setup();
    expect(useStore.getState().theme).toBe("dark");
    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(useStore.getState().theme).toBe("light");
  });

  it("Toggle theme button switches from light to dark", async () => {
    const user = userEvent.setup();
    useStore.getState().setTheme("light");
    setup();
    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(useStore.getState().theme).toBe("dark");
  });

  it("settings popover has no Theme control (toolbar toggle is the only one)", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Light" }),
    ).not.toBeInTheDocument();
  });

  describe("settings popover outside-click / Escape close", () => {
    it("opens on Settings button click and popover is visible", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      expect(
        screen.getByRole("button", { name: "Symbol" }),
      ).toBeInTheDocument();
    });

    it("closes when clicking outside the popover and outside the button", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      expect(
        screen.getByRole("button", { name: "Symbol" }),
      ).toBeInTheDocument();
      fireEvent.pointerDown(document.body);
      expect(
        screen.queryByRole("button", { name: "Symbol" }),
      ).not.toBeInTheDocument();
    });

    it("stays open when clicking inside the popover", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      const popover = screen
        .getByRole("button", { name: "Symbol" })
        .closest("div[data-testid='settings-popover']")!;
      fireEvent.pointerDown(popover);
      expect(
        screen.getByRole("button", { name: "Symbol" }),
      ).toBeInTheDocument();
    });

    it("closes when Escape key is pressed", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      expect(
        screen.getByRole("button", { name: "Symbol" }),
      ).toBeInTheDocument();
      await user.keyboard("{Escape}");
      expect(
        screen.queryByRole("button", { name: "Symbol" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("File section in settings popover", () => {
    it("Load file, Export .schemamorph, Export PNG buttons are NOT in the main toolbar row", () => {
      setup();
      // These buttons only exist inside the settings popover (not in the always-visible toolbar)
      expect(
        screen.queryByRole("button", { name: "Load file" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Export .schemamorph" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Export PNG" }),
      ).not.toBeInTheDocument();
    });

    it("settings popover shows Load file, Export .schemamorph, Export PNG", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      expect(
        screen.getByRole("button", { name: "Load file" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Export .schemamorph" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Export PNG" }),
      ).toBeInTheDocument();
    });

    it("file-input element with data-testid='file-input' is always in DOM", () => {
      setup();
      expect(screen.getByTestId("file-input")).toBeInTheDocument();
    });

    it("Export .schemamorph closes the popover", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      await user.click(
        screen.getByRole("button", { name: "Export .schemamorph" }),
      );
      expect(
        screen.queryByRole("button", { name: "Export .schemamorph" }),
      ).not.toBeInTheDocument();
    });

    it("Export PNG closes the popover", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      await user.click(screen.getByRole("button", { name: "Export PNG" }));
      expect(
        screen.queryByRole("button", { name: "Export PNG" }),
      ).not.toBeInTheDocument();
    });
  });

  it("Copy share link button is in the main toolbar row (not the popover)", () => {
    setup();
    // Visible in main row without opening settings
    expect(
      screen.getByRole("button", { name: "Copy share link" }),
    ).toBeInTheDocument();
  });

  it("Copy share link button is NOT inside the settings popover", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const popover = screen.getByTestId("settings-popover");
    expect(popover.querySelector('[aria-label="Copy share link"]')).toBeNull();
  });

  describe("Mermaid import in settings popover", () => {
    it("opens the Mermaid dialog from the settings popover", () => {
      setup();
      fireEvent.click(screen.getByLabelText("Settings"));
      fireEvent.click(screen.getByLabelText("Import Mermaid"));
      expect(
        screen.getByLabelText("Paste Mermaid diagram"),
      ).toBeInTheDocument();
    });

    it("disables Import Mermaid when locked", () => {
      useStore.setState({ locked: true });
      setup();
      fireEvent.click(screen.getByLabelText("Settings"));
      expect(screen.getByLabelText("Import Mermaid")).toBeDisabled();
    });
  });

  describe("app-version display in settings popover", () => {
    it("shows version string matching /v\\d+\\.\\d+\\.\\d+/ in settings popover footer", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      expect(screen.getByTestId("app-version").textContent).toMatch(
        /v\d+\.\d+\.\d+/,
      );
    });
  });

  describe("Minimap toggle in settings popover", () => {
    it("settings popover shows a Toggle minimap button", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByRole("button", { name: "Settings" }));
      expect(
        screen.getByRole("button", { name: "Toggle minimap" }),
      ).toBeInTheDocument();
    });

    it("clicking Toggle minimap flips showMinimap in store", async () => {
      const user = userEvent.setup();
      setup();
      expect(useStore.getState().showMinimap).toBe(false);
      await user.click(screen.getByRole("button", { name: "Settings" }));
      await user.click(screen.getByRole("button", { name: "Toggle minimap" }));
      expect(useStore.getState().showMinimap).toBe(true);
    });
  });
});
