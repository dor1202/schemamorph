import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { SysNodeComponent } from "./SysNode";
import { useStore } from "@/state/store";
import type { SysNode } from "@/lib/types";

const nodeTypes = { sysNode: SysNodeComponent };

function renderNode(data: SysNode["data"]) {
  const nodes: SysNode[] = [
    { id: "n1", type: "sysNode", position: { x: 0, y: 0 }, data },
  ];
  return render(
    <ReactFlowProvider>
      <div style={{ width: 800, height: 600 }}>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} />
      </div>
    </ReactFlowProvider>,
  );
}

beforeEach(() => useStore.getState().reset());

describe("SysNode", () => {
  it("minimalist mode shows archetype symbol and archetype sublabel", () => {
    useStore.setState({ viewMode: "minimalist", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "mysql",
      label: "Users DB",
    });
    expect(screen.getByText("Users DB")).toBeInTheDocument();
    expect(screen.getByText("database")).toBeInTheDocument();
    expect(screen.getByTestId("symbol-icon")).toBeInTheDocument();
  });

  it("real mode shows tool logo and tool sublabel", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "mysql",
      label: "Users DB",
    });
    expect(screen.getByText("MySQL")).toBeInTheDocument();
    expect(screen.getByTestId("logo-icon")).toBeInTheDocument();
  });

  it("unknown tool falls back to initials badge with warning", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "ghost-db",
      label: "Ghost",
    });
    expect(screen.getByTestId("fallback-badge")).toBeInTheDocument();
    expect(screen.getByTitle(/unknown tool/i)).toBeInTheDocument();
  });

  it("tool without iconSlug renders its svgPath glyph in real mode", () => {
    // sqs has no simple-icons slug; it ships an inline svgPath (shared AWS glyph)
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({ archetype: "queue", concreteTool: "sqs", label: "Jobs" });
    expect(screen.getByTestId("logo-icon")).toBeInTheDocument();
  });

  it("symbol style renders without card chrome", () => {
    useStore.setState({ viewMode: "minimalist", nodeStyle: "symbol" });
    renderNode({
      archetype: "cache",
      concreteTool: "redis",
      label: "Sessions",
    });
    expect(screen.getByTestId("sysnode-symbol")).toBeInTheDocument();
  });

  it("unknown archetype in minimalist mode shows warning badge", () => {
    useStore.setState({ viewMode: "minimalist", nodeStyle: "card" });
    renderNode({
      archetype: "ghost-arch",
      concreteTool: "mysql",
      label: "Mystery",
    });
    expect(screen.getByTitle(/unknown tool/i)).toBeInTheDocument();
    expect(screen.getByTestId("fallback-badge")).toBeInTheDocument();
  });

  // --- Metadata Pins badge tests ---

  it("card node with matching customProperties shows pin badges", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { replication: "primary-replica", shards: "4" },
    });
    const badges = screen.getByTestId("pin-badges");
    expect(badges).toBeInTheDocument();
    expect(badges.textContent).toContain("replication:primary-replica");
    expect(badges.textContent).toContain("shards:4");
  });

  it("plate node shows pin badges", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "plate" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { replication: "none" },
    });
    expect(screen.getByTestId("pin-badges")).toBeInTheDocument();
  });

  it("symbol style does not show pin badges", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "symbol" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { replication: "none" },
    });
    expect(screen.queryByTestId("pin-badges")).not.toBeInTheDocument();
  });

  it("more than 3 pins shows +n overflow chip", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: {
        replication: "none",
        shards: "3",
        consistency: "strong",
        backups: "true",
      },
    });
    const badges = screen.getByTestId("pin-badges");
    expect(badges.textContent).toMatch(/\+\d+/);
  });

  it("boolean true pin shows key only (no value)", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { backups: "true" },
    });
    const badges = screen.getByTestId("pin-badges");
    // boolean true: key only, no colon
    expect(badges.textContent).toContain("backups");
    expect(badges.textContent).not.toContain("backups:true");
  });

  it("boolean false pin is omitted from badges", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { backups: "false" },
    });
    // When only a boolean-false pin exists, pin-badges should not render at all
    // (no visible badges — false boolean is omitted)
    const badges = screen.queryByTestId("pin-badges");
    expect(badges).toBeNull();
  });

  it("free-form customProperties not in archetype attributes ARE shown as badges after schema pins", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { "my-custom-key": "somevalue" },
    });
    // free-form props should appear as badges with key:value format
    const badges = screen.getByTestId("pin-badges");
    expect(badges.textContent).toContain("my-custom-key:somevalue");
  });

  it("node with only free-form props (no schema pins) shows badges", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { owner: "platform-team", env: "prod" },
    });
    const badges = screen.getByTestId("pin-badges");
    expect(badges.textContent).toContain("owner:platform-team");
    expect(badges.textContent).toContain("env:prod");
  });

  it("mixed schema pins and free-form props: schema first, free-form after", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { replication: "primary-replica", "my-tag": "xyz" },
    });
    const badges = screen.getByTestId("pin-badges");
    const text = badges.textContent ?? "";
    // schema pin comes before free-form
    const schemaIdx = text.indexOf("replication:primary-replica");
    const freeformIdx = text.indexOf("my-tag:xyz");
    expect(schemaIdx).toBeGreaterThanOrEqual(0);
    expect(freeformIdx).toBeGreaterThanOrEqual(0);
    expect(schemaIdx).toBeLessThan(freeformIdx);
  });

  it("badge row has a native tooltip listing all props (key: value, one per line)", () => {
    useStore.setState({ viewMode: "real", nodeStyle: "card" });
    renderNode({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Main DB",
      customProperties: { replication: "none", env: "prod" },
    });
    const badges = screen.getByTestId("pin-badges");
    const title = badges.getAttribute("title") ?? "";
    expect(title).toContain("replication: none");
    expect(title).toContain("env: prod");
  });
});
