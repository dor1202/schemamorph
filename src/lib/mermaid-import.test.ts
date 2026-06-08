// src/lib/mermaid-import.test.ts
import { describe, it, expect } from "vitest";
import { parseMermaid } from "./mermaid-import";

describe("parseMermaid", () => {
  it("parses flowchart header direction", () => {
    const r = parseMermaid("flowchart TD\n A --> B");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.direction).toBe("TB");
    expect(r.nodes).toHaveLength(2);
    expect(r.edges).toHaveLength(1);
  });

  it("maps TD/TB/BT to TB and LR/RL to LR; defaults LR without header", () => {
    const td = parseMermaid("graph BT\n A --> B");
    const rl = parseMermaid("graph RL\n A --> B");
    const none = parseMermaid("A --> B");
    expect(td.ok && td.direction).toBe("TB");
    expect(rl.ok && rl.direction).toBe("LR");
    expect(none.ok && none.direction).toBe("LR");
  });

  it("maps shapes to archetypes with defaultTool", () => {
    const src = [
      "flowchart LR",
      'db[("Users DB")]',
      "gw{{API Gateway}}",
      "svc([Auth Service])",
      "proc[/ETL/]",
      "c((Session Cache))",
      "q>Events]",
      "plain[Worker]",
    ].join("\n");
    const r = parseMermaid(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byId = Object.fromEntries(r.nodes.map((n) => [n.id, n]));
    expect(byId.db.data).toMatchObject({
      archetype: "database",
      concreteTool: "postgresql",
      label: "Users DB",
    });
    expect(byId.gw.data).toMatchObject({
      archetype: "gateway",
      concreteTool: "nginx",
    });
    expect(byId.svc.data.archetype).toBe("compute");
    expect(byId.proc.data.archetype).toBe("compute");
    expect(byId.c.data).toMatchObject({
      archetype: "cache",
      concreteTool: "redis",
    });
    expect(byId.q.data).toMatchObject({
      archetype: "queue",
      concreteTool: "kafka",
    });
    expect(byId.plain.data).toMatchObject({
      archetype: "compute",
      concreteTool: "docker",
      label: "Worker",
    });
  });

  it("bare ids become compute nodes labeled by id", () => {
    const r = parseMermaid("flowchart LR\n A --> B");
    expect(r.ok && r.nodes[0].data).toMatchObject({
      archetype: "compute",
      label: "A",
    });
  });

  it("parses edge labels in both syntaxes", () => {
    const r = parseMermaid("flowchart LR\n A -- query --> B\n B -->|stream| C");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.edges[0].data?.label).toBe("query");
    expect(r.edges[1].data?.label).toBe("stream");
  });

  it("treats dotted and thick arrows as edges", () => {
    const r = parseMermaid("flowchart LR\n A -.-> B\n B ==> C");
    expect(r.ok && r.edges).toHaveLength(2);
  });

  it("normalizes multi-dot dotted arrows", () => {
    const r = parseMermaid("flowchart LR\n A -..-> B\n B -...-> C");
    expect(r.ok && r.edges).toHaveLength(2);
  });

  it("supports chains A --> B --> C", () => {
    const r = parseMermaid("flowchart LR\n A --> B --> C");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes).toHaveLength(3);
    expect(r.edges.map((e) => [e.source, e.target])).toEqual([
      ["A", "B"],
      ["B", "C"],
    ]);
  });

  it("inline node definitions on edge lines register shape + label", () => {
    const r = parseMermaid('flowchart LR\n api[API] --> db[("Postgres")]');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const db = r.nodes.find((n) => n.id === "db")!;
    expect(db.data).toMatchObject({ archetype: "database", label: "Postgres" });
  });

  it("later explicit definition upgrades a bare reference", () => {
    const r = parseMermaid('flowchart LR\n A --> db\n db[("Users")]');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const db = r.nodes.find((n) => n.id === "db")!;
    expect(db.data).toMatchObject({ archetype: "database", label: "Users" });
  });

  it("ignores subgraph/end/classDef/style/linkStyle/click/%% lines", () => {
    const src = [
      "flowchart LR",
      "%% a comment",
      "subgraph cluster",
      "A --> B",
      "end",
      "classDef red fill:#f00",
      "style A fill:#f00",
      "linkStyle 0 stroke:#f00",
      'click A href "http://x"',
    ].join("\n");
    const r = parseMermaid(src);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes).toHaveLength(2);
    expect(r.edges).toHaveLength(1);
  });

  it("returns error when no nodes parse", () => {
    const r = parseMermaid("classDef red fill:#f00\n%% nothing");
    expect(r).toEqual({
      ok: false,
      error: "No nodes found — check your Mermaid syntax.",
    });
  });

  it("captures edge labels containing hyphens", () => {
    const r = parseMermaid("flowchart LR\n A -- two-phase commit --> B");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes.map((n) => n.id).sort()).toEqual(["A", "B"]);
    expect(r.edges).toHaveLength(1);
    expect(r.edges[0].data?.label).toBe("two-phase commit");
  });

  it("hyphenated label coexists with chains", () => {
    const r = parseMermaid("flowchart LR\n A -- re-try --> B --> C");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(
      r.edges.map((e) => [e.source, e.target, e.data?.label ?? null]),
    ).toEqual([
      ["A", "B", "re-try"],
      ["B", "C", null],
    ]);
  });

  it("all edges are typed sysEdge and ids unique", () => {
    const r = parseMermaid("flowchart LR\n A --> B\n A --> B");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.edges.every((e) => e.type === "sysEdge")).toBe(true);
    expect(new Set(r.edges.map((e) => e.id)).size).toBe(2);
  });

  it("accepts numeric-start node ids (draw.io/GitHub exports)", () => {
    const r = parseMermaid("flowchart LR\n 1A --> 2B[Worker]");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.nodes.map((n) => n.id).sort()).toEqual(["1A", "2B"]);
    expect(r.edges).toHaveLength(1);
  });
});
