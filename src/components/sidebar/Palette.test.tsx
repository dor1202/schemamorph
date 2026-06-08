import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReactFlowProvider } from "@xyflow/react";
import { Palette } from "./Palette";
import { useStore } from "@/state/store";
import type { BoundaryNode, SysNode } from "@/lib/types";

const setup = () =>
  render(
    <ReactFlowProvider>
      <Palette />
    </ReactFlowProvider>,
  );

describe("Palette", () => {
  beforeEach(() => useStore.getState().reset());

  it("lists all archetypes", () => {
    setup();
    for (const label of ["Database", "Queue", "Compute", "Cache", "Gateway"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("lists new archetypes added in catalog expansion", () => {
    setup();
    for (const label of [
      "Observability",
      "Object Storage",
      "Search",
      "CDN",
      "Client",
      "Auth / Identity",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  describe("minimalist mode (default)", () => {
    it("row click spawns its default tool (redis for Cache)", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Cache"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect((useStore.getState().nodes[0] as SysNode).data.concreteTool).toBe(
        "redis",
      );
    });

    it("does NOT render expand buttons in minimalist mode", () => {
      setup();
      expect(
        screen.queryByRole("button", { name: /expand database/i }),
      ).toBeNull();
    });

    it("variants are not visible in minimalist mode", () => {
      setup();
      expect(screen.queryByText("MySQL")).toBeNull();
      expect(screen.queryByText("PostgreSQL")).toBeNull();
    });
  });

  describe("real mode", () => {
    beforeEach(() => {
      useStore.setState({ viewMode: "real" });
    });

    it("row click expands variants (MySQL visible) without spawning", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Database"));
      expect(screen.getByText("MySQL")).toBeInTheDocument();
      expect(useStore.getState().nodes).toHaveLength(0);
    });

    it("second row click folds variants back", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Database"));
      expect(screen.getByText("MySQL")).toBeInTheDocument();
      await user.click(screen.getByText("Database"));
      expect(screen.queryByText("MySQL")).toBeNull();
    });

    it("variant click spawns the concrete tool", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Database"));
      await user.click(screen.getByText("MongoDB"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect((useStore.getState().nodes[0] as SysNode).data.concreteTool).toBe(
        "mongodb",
      );
    });

    it("row click never spawns a node", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Database"));
      await user.click(screen.getByText("Cache"));
      expect(useStore.getState().nodes).toHaveLength(0);
    });

    it("expand button is rendered with correct aria-label in real mode", () => {
      setup();
      expect(
        screen.getByRole("button", { name: /expand database/i }),
      ).toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("renders the search input", () => {
      setup();
      expect(
        screen.getByRole("textbox", { name: "Search tools" }),
      ).toBeInTheDocument();
    });

    it("empty query shows archetype rows (not search results)", () => {
      setup();
      expect(screen.getByText("Database")).toBeInTheDocument();
      expect(screen.queryByText("No tools found")).toBeNull();
      expect(screen.queryByText("No matches")).toBeNull();
    });

    it("real mode: typing 'mong' shows MongoDB and hides archetype rows", async () => {
      useStore.setState({ viewMode: "real" });
      const user = userEvent.setup();
      setup();
      await user.type(
        screen.getByRole("textbox", { name: "Search tools" }),
        "mong",
      );
      expect(screen.getByText("MongoDB")).toBeInTheDocument();
      // Archetype expand buttons should not be visible while searching
      expect(
        screen.queryByRole("button", { name: /expand database/i }),
      ).toBeNull();
      // Queue and Cache archetype rows should not be clickable rows
      expect(screen.queryByText("Queue")).toBeNull();
      expect(screen.queryByText("Cache")).toBeNull();
    });

    it("real mode: search result click spawns the tool (mongodb)", async () => {
      useStore.setState({ viewMode: "real" });
      const user = userEvent.setup();
      setup();
      await user.type(
        screen.getByRole("textbox", { name: "Search tools" }),
        "mong",
      );
      await user.click(screen.getByText("MongoDB"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect((useStore.getState().nodes[0] as SysNode).data.concreteTool).toBe(
        "mongodb",
      );
    });

    it("minimalist: 'zzz' shows 'No matches' empty state", async () => {
      const user = userEvent.setup();
      setup();
      await user.type(
        screen.getByRole("textbox", { name: "Search tools" }),
        "zzz",
      );
      expect(screen.getByText("No matches")).toBeInTheDocument();
    });

    it("real: 'zzz' shows 'No tools found' empty state", async () => {
      useStore.setState({ viewMode: "real" });
      const user = userEvent.setup();
      setup();
      await user.type(
        screen.getByRole("textbox", { name: "Search tools" }),
        "zzz",
      );
      expect(screen.getByText("No tools found")).toBeInTheDocument();
    });

    it("clearing query restores archetype rows", async () => {
      useStore.setState({ viewMode: "real" });
      const user = userEvent.setup();
      setup();
      const input = screen.getByRole("textbox", { name: "Search tools" });
      await user.type(input, "mong");
      // While searching, Queue archetype row is hidden
      expect(screen.queryByText("Queue")).toBeNull();
      // Click the clear button
      await user.click(screen.getByRole("button", { name: "Clear search" }));
      // After clearing, Queue row is restored
      expect(screen.getByText("Queue")).toBeInTheDocument();
    });

    it("Escape clears query and restores rows", async () => {
      useStore.setState({ viewMode: "real" });
      const user = userEvent.setup();
      setup();
      const input = screen.getByRole("textbox", { name: "Search tools" });
      await user.type(input, "mong");
      // While searching, Queue archetype row is hidden
      expect(screen.queryByText("Queue")).toBeNull();
      await user.keyboard("{Escape}");
      // After Escape, Queue row is restored
      expect(screen.getByText("Queue")).toBeInTheDocument();
    });

    it("search result click spawns in real mode", async () => {
      useStore.setState({ viewMode: "real" });
      const user = userEvent.setup();
      setup();
      await user.type(
        screen.getByRole("textbox", { name: "Search tools" }),
        "mongo",
      );
      await user.click(screen.getByText("MongoDB"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect((useStore.getState().nodes[0] as SysNode).data.concreteTool).toBe(
        "mongodb",
      );
    });

    it("real mode: shows muted archetype label next to each search result", async () => {
      useStore.setState({ viewMode: "real" });
      const user = userEvent.setup();
      setup();
      await user.type(
        screen.getByRole("textbox", { name: "Search tools" }),
        "mong",
      );
      // The archetype label "Database" should appear as the right-aligned muted label
      expect(screen.getByText("Database")).toBeInTheDocument();
    });
  });

  describe("Annotations section", () => {
    it("renders Annotations heading", () => {
      setup();
      expect(screen.getByText(/annotations/i)).toBeInTheDocument();
    });

    it("Note item is present", () => {
      setup();
      expect(screen.getByText("Note")).toBeInTheDocument();
    });

    it("Boundary item is present", () => {
      setup();
      expect(screen.getByText("Boundary")).toBeInTheDocument();
    });

    it("Note click spawns a noteNode", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Note"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect(useStore.getState().nodes[0].type).toBe("noteNode");
    });

    it("Boundary click spawns a boundaryNode", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Boundary"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect(useStore.getState().nodes[0].type).toBe("boundaryNode");
    });

    it("Note not visible when locked (palette collapses)", () => {
      useStore.setState({ locked: true });
      setup();
      // Locked forces collapsed strip — annotation items not rendered
      expect(screen.queryByText("Note")).not.toBeInTheDocument();
    });

    it("Annotations section appears BEFORE archetype rows (DOM order)", () => {
      setup();
      const aside = screen.getByRole("complementary");
      const allText = aside.textContent ?? "";
      // "Annotations" heading should appear before "Database" in text order
      const annotationsIdx = allText.indexOf("Annotations");
      const databaseIdx = allText.indexOf("Database");
      expect(annotationsIdx).toBeGreaterThanOrEqual(0);
      expect(databaseIdx).toBeGreaterThanOrEqual(0);
      expect(annotationsIdx).toBeLessThan(databaseIdx);
    });

    it("Title item is present", () => {
      setup();
      expect(screen.getByText("Title")).toBeInTheDocument();
    });

    it("Step item is present", () => {
      setup();
      expect(screen.getByText("Step")).toBeInTheDocument();
    });

    it("Arrow item is present", () => {
      setup();
      expect(screen.getByText("Arrow")).toBeInTheDocument();
    });

    it("Title click spawns a noteNode with size 'title'", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Title"));
      expect(useStore.getState().nodes).toHaveLength(1);
      const n = useStore.getState().nodes[0] as import("@/lib/types").NoteNode;
      expect(n.type).toBe("noteNode");
      expect(n.data.size).toBe("title");
    });

    it("Step click spawns a stepNode", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Step"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect(useStore.getState().nodes[0].type).toBe("stepNode");
    });

    it("Arrow click spawns an arrowNode", async () => {
      const user = userEvent.setup();
      setup();
      await user.click(screen.getByText("Arrow"));
      expect(useStore.getState().nodes).toHaveLength(1);
      expect(useStore.getState().nodes[0].type).toBe("arrowNode");
    });

    it("Step not visible when locked (palette collapses)", () => {
      useStore.setState({ locked: true });
      setup();
      expect(screen.queryByText("Step")).not.toBeInTheDocument();
    });

    it("Arrow not visible when locked (palette collapses)", () => {
      useStore.setState({ locked: true });
      setup();
      expect(screen.queryByText("Arrow")).not.toBeInTheDocument();
    });

    it("Title not visible when locked (palette collapses)", () => {
      useStore.setState({ locked: true });
      setup();
      expect(screen.queryByText("Title")).not.toBeInTheDocument();
    });

    it("Palette order: Note before Title before Step before Arrow before Boundary", () => {
      setup();
      const aside = screen.getByRole("complementary");
      const allText = aside.textContent ?? "";
      const noteIdx = allText.indexOf("Note");
      const titleIdx = allText.indexOf("Title");
      const stepIdx = allText.indexOf("Step");
      const arrowIdx = allText.indexOf("Arrow");
      const boundaryIdx = allText.indexOf("Boundary");
      expect(noteIdx).toBeLessThan(titleIdx);
      expect(titleIdx).toBeLessThan(stepIdx);
      expect(stepIdx).toBeLessThan(arrowIdx);
      expect(arrowIdx).toBeLessThan(boundaryIdx);
    });
  });

  describe("Tidy layout button", () => {
    it("renders the Tidy layout button in the expanded palette", () => {
      setup();
      expect(
        screen.getByRole("button", { name: "Tidy layout" }),
      ).toBeInTheDocument();
    });

    it("Tidy layout button appears BEFORE archetype rows (DOM order)", () => {
      setup();
      const aside = screen.getByRole("complementary");
      const allText = aside.textContent ?? "";
      const tidyIdx = allText.indexOf("Tidy layout");
      const databaseIdx = allText.indexOf("Database");
      expect(tidyIdx).toBeGreaterThanOrEqual(0);
      expect(databaseIdx).toBeGreaterThanOrEqual(0);
      expect(tidyIdx).toBeLessThan(databaseIdx);
    });

    it("clicking Tidy layout applies dagre layout and is undoable", async () => {
      const user = userEvent.setup();
      setup();
      useStore.getState().addNode("gateway", "nginx", { x: 500, y: 500 });
      useStore.getState().addNode("database", "mysql", { x: 0, y: 0 });
      const [a, b] = useStore.getState().nodes.map((n) => n.id);
      useStore
        .getState()
        .setEdges([
          { id: "e", source: a, target: b, type: "sysEdge", data: {} },
        ]);
      const before = useStore.getState().nodes.map((n) => ({ ...n.position }));
      await user.click(screen.getByRole("button", { name: "Tidy layout" }));
      const after = useStore.getState().nodes;
      expect(after.find((n) => n.id === a)!.position.x).toBeLessThan(
        after.find((n) => n.id === b)!.position.x,
      );
      useStore.getState().undo();
      expect(useStore.getState().nodes.map((n) => ({ ...n.position }))).toEqual(
        before,
      );
    });

    it("tidy absolutizes member positions before layout (regression: relative pos not treated as absolute)", async () => {
      const user = userEvent.setup();
      setup();
      // Place a boundary at (400, 300) and a sysNode inside it.
      // setAll absolutizes and applyGrouping will give sysNode a parentId + relative position.
      const boundary: BoundaryNode = {
        id: "b1",
        type: "boundaryNode",
        position: { x: 400, y: 300 },
        width: 320,
        height: 220,
        zIndex: -1,
        data: { label: "Region" },
      };
      const sysNode: SysNode = {
        id: "n1",
        type: "sysNode",
        position: { x: 500, y: 380 }, // absolute — center inside boundary
        data: { archetype: "database", concreteTool: "mysql", label: "MySQL" },
      };
      // Use setAll which calls applyGrouping, so sysNode gets parentId + relative pos
      useStore.getState().setAll([boundary, sysNode], []);

      const stateAfterSetAll = useStore
        .getState()
        .nodes.find((n) => n.id === "n1");
      expect(stateAfterSetAll?.parentId).toBe("b1");
      const relPos = stateAfterSetAll!.position;
      // relative pos should be (100, 80): absolute(500,380) - parent(400,300)
      expect(relPos.x).toBe(100);
      expect(relPos.y).toBe(80);

      // Now click Tidy — should NOT crash, and member should retain parentId
      await user.click(screen.getByRole("button", { name: "Tidy layout" }));
      const after = useStore.getState().nodes.find((n) => n.id === "n1");
      // Member should still be grouped (parentId preserved after tidy)
      expect(after?.parentId).toBe("b1");
      // Member absolute position = parent.position + member.position should be finite
      const parentAfter = useStore.getState().nodes.find((n) => n.id === "b1");
      if (parentAfter && after) {
        const absX = parentAfter.position.x + after.position.x;
        const absY = parentAfter.position.y + after.position.y;
        expect(isFinite(absX)).toBe(true);
        expect(isFinite(absY)).toBe(true);
      }
    });
  });

  describe("mode-aware search", () => {
    describe("minimalist mode", () => {
      beforeEach(() => {
        useStore.setState({ viewMode: "minimalist" });
      });

      it("'data' matches Database and Data Pipeline archetypes", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "data",
        );
        expect(screen.getByText("Database")).toBeInTheDocument();
        expect(screen.getByText("Data Pipeline")).toBeInTheDocument();
      });

      it("'data' result click spawns defaultTool of the archetype", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "data",
        );
        // Click the Database row — should spawn postgresql (its defaultTool)
        await user.click(screen.getByText("Database"));
        expect(useStore.getState().nodes).toHaveLength(1);
        expect(
          (useStore.getState().nodes[0] as SysNode).data.concreteTool,
        ).toBe("postgresql");
      });

      it("'mongo' shows no matches (tools not searched in minimalist)", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "mongo",
        );
        expect(screen.getByText("No matches")).toBeInTheDocument();
        expect(screen.queryByText("MongoDB")).toBeNull();
      });

      it("no tool rows shown for 'mongo' in minimalist", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "mongo",
        );
        // No archetype rows for unrelated archetypes
        expect(screen.queryByText("Cache")).toBeNull();
      });
    });

    describe("real mode", () => {
      beforeEach(() => {
        useStore.setState({ viewMode: "real" });
      });

      it("'mongo' shows MongoDB tool row", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "mongo",
        );
        expect(screen.getByText("MongoDB")).toBeInTheDocument();
      });

      it("'mongo' click spawns mongodb tool", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "mongo",
        );
        await user.click(screen.getByText("MongoDB"));
        expect(useStore.getState().nodes).toHaveLength(1);
        expect(
          (useStore.getState().nodes[0] as SysNode).data.concreteTool,
        ).toBe("mongodb");
      });

      it("'cache' group match shows Redis AND Memcached", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "cache",
        );
        expect(screen.getByText("Redis")).toBeInTheDocument();
        expect(screen.getByText("Memcached")).toBeInTheDocument();
      });

      it("'redis' shows only Redis (no dedupe duplicate)", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "redis",
        );
        // Redis matches both by tool label and by key, should appear exactly once
        const redisCells = screen.getAllByText("Redis");
        expect(redisCells).toHaveLength(1);
      });

      it("'service' shows Service tool, click spawns compute/service", async () => {
        const user = userEvent.setup();
        setup();
        await user.type(
          screen.getByRole("textbox", { name: "Search tools" }),
          "service",
        );
        expect(screen.getByText("Service")).toBeInTheDocument();
        await user.click(screen.getByText("Service"));
        expect(useStore.getState().nodes).toHaveLength(1);
        expect(
          (useStore.getState().nodes[0] as SysNode).data.concreteTool,
        ).toBe("service");
        expect((useStore.getState().nodes[0] as SysNode).data.archetype).toBe(
          "compute",
        );
      });
    });
  });
});
