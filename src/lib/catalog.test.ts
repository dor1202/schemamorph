import { describe, it, expect } from "vitest";
import {
  archetypes,
  tools,
  protocols,
  protocolGroups,
  getArchetype,
  getTool,
  toolsForArchetype,
} from "./catalog";
import {
  archetypesFileSchema,
  toolsFileSchema,
  attributeSchema,
} from "./catalog-schema";

describe("catalog", () => {
  it("loads twenty-two archetypes (18 original + 4 new)", () => {
    expect(Object.keys(archetypes)).toEqual(
      expect.arrayContaining([
        "database",
        "queue",
        "compute",
        "cache",
        "gateway",
        "observability",
        "storage",
        "search",
        "cdn",
        "client",
        "auth",
        "ml",
        "warehouse",
        "pipeline",
        "cicd",
        "iac",
        "serverless",
        "secrets",
        "external",
        "notification",
        "realtime",
        "workflow",
      ]),
    );
    expect(Object.keys(archetypes)).toHaveLength(22);
  });

  it("toolsForArchetype('ml') includes openai", () => {
    const keys = toolsForArchetype("ml").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["openai"]));
  });

  it("toolsForArchetype('warehouse') includes snowflake", () => {
    const keys = toolsForArchetype("warehouse").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["snowflake"]));
  });

  it("toolsForArchetype('cicd') includes githubactions and gitlab", () => {
    const keys = toolsForArchetype("cicd").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["githubactions", "gitlab"]));
  });

  it("toolsForArchetype('secrets') includes vault", () => {
    const keys = toolsForArchetype("secrets").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["vault"]));
  });

  it("toolsForArchetype('database') includes bigtable and spanner", () => {
    const keys = toolsForArchetype("database").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["bigtable", "spanner"]));
  });

  it("toolsForArchetype('compute') includes gke, eks, ecs, fargate, aks", () => {
    const keys = toolsForArchetype("compute").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["gke", "eks", "ecs", "fargate", "aks"]),
    );
  });

  it("toolsForArchetype('database') includes rds, aurora, cloudsql, cosmosdb", () => {
    const keys = toolsForArchetype("database").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["rds", "aurora", "cloudsql", "cosmosdb"]),
    );
  });

  it("toolsForArchetype('queue') includes pubsub and servicebus", () => {
    const keys = toolsForArchetype("queue").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["pubsub", "servicebus"]));
  });

  it("toolsForArchetype('storage') includes azureblob", () => {
    const keys = toolsForArchetype("storage").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["azureblob"]));
  });

  it("toolsForArchetype('warehouse') includes synapse", () => {
    const keys = toolsForArchetype("warehouse").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["synapse"]));
  });

  it("every tool references an existing archetype", () => {
    for (const [key, tool] of Object.entries(tools)) {
      expect(
        archetypes[tool.archetype],
        `${key} -> ${tool.archetype}`,
      ).toBeDefined();
    }
  });

  it("toolsForArchetype(database) includes mysql/postgresql/mongodb", () => {
    const keys = toolsForArchetype("database").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["mysql", "postgresql", "mongodb"]),
    );
  });

  it("every archetype defaultTool exists and matches archetype", () => {
    for (const [key, a] of Object.entries(archetypes)) {
      expect(tools[a.defaultTool], `${key}.defaultTool`).toBeDefined();
      expect(tools[a.defaultTool].archetype).toBe(key);
    }
  });

  it("getArchetype/getTool return undefined for unknown keys", () => {
    expect(getArchetype("nope")).toBeUndefined();
    expect(getTool("nope")).toBeUndefined();
  });

  it("protocol groups flatten to include classic presets and expansions", () => {
    const flat = Object.values(protocolGroups).flat();
    expect(flat).toEqual(
      expect.arrayContaining([
        "HTTPS",
        "REST",
        "GraphQL",
        "gRPC",
        "WebSocket",
        "TCP",
        "CDC Stream",
        "AMQP",
        "MQTT",
      ]),
    );
  });

  it("protocols (flat list) is derived from groups", () => {
    expect(protocols).toEqual(Object.values(protocolGroups).flat());
  });

  it("schema rejects archetype with invalid brandColor", () => {
    const result = archetypesFileSchema.safeParse({
      x: {
        label: "X",
        brandColor: "blue",
        symbolViewBox: "0 0 10 10",
        symbolSvg: "<p/>",
        defaultTool: "y",
      },
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].path.join(".")).toBe(
      "x.brandColor",
    );
  });

  it("schema rejects tool with empty-string archetype reference", () => {
    const result = toolsFileSchema.safeParse({
      t: { archetype: "", label: "T", brandColor: "#aabbcc" },
    });
    expect(result.success).toBe(false);
  });

  // --- Attribute / metadata pins tests ---

  // --- New archetype spot checks ---

  it("toolsForArchetype('external') includes stripe", () => {
    const keys = toolsForArchetype("external").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["stripe"]));
  });

  it("toolsForArchetype('notification') includes fcm and apns", () => {
    const keys = toolsForArchetype("notification").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["fcm", "apns"]));
  });

  it("toolsForArchetype('realtime') includes pusher and socketio", () => {
    const keys = toolsForArchetype("realtime").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["pusher", "socketio"]));
  });

  it("toolsForArchetype('workflow') includes temporal and n8n", () => {
    const keys = toolsForArchetype("workflow").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["temporal", "n8n"]));
  });

  it("external archetype has provider-sla and auth attributes", () => {
    const ext = archetypes["external"];
    const sla = ext.attributes?.find((a) => a.key === "provider-sla");
    const auth = ext.attributes?.find((a) => a.key === "auth");
    expect(sla?.type).toBe("text");
    expect(auth?.type).toBe("enum");
    expect(auth?.options).toEqual(
      expect.arrayContaining(["api-key", "oauth2"]),
    );
  });

  it("workflow archetype has schedule, retries, and durable attributes", () => {
    const wf = archetypes["workflow"];
    const schedule = wf.attributes?.find((a) => a.key === "schedule");
    const retries = wf.attributes?.find((a) => a.key === "retries");
    const durable = wf.attributes?.find((a) => a.key === "durable");
    expect(schedule?.type).toBe("text");
    expect(retries?.type).toBe("number");
    expect(durable?.type).toBe("boolean");
  });

  it("cdn archetype includes route53 and clouddns tools", () => {
    const keys = toolsForArchetype("cdn").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["route53", "clouddns"]));
  });

  it("every archetype has an attributes array", () => {
    for (const [key, a] of Object.entries(archetypes)) {
      expect(
        Array.isArray(a.attributes),
        `${key}.attributes should be an array`,
      ).toBe(true);
    }
  });

  it("enum attributes always have non-empty options", () => {
    for (const [key, a] of Object.entries(archetypes)) {
      for (const attr of a.attributes ?? []) {
        if (attr.type === "enum") {
          expect(
            attr.options && attr.options.length > 0,
            `${key}.${attr.key} (enum) must have options`,
          ).toBe(true);
        }
      }
    }
  });

  it("attributeSchema rejects enum without options", () => {
    const result = attributeSchema.safeParse({
      key: "mode",
      label: "Mode",
      type: "enum",
    });
    expect(result.success).toBe(false);
  });

  it("attributeSchema rejects enum with empty options array", () => {
    const result = attributeSchema.safeParse({
      key: "mode",
      label: "Mode",
      type: "enum",
      options: [],
    });
    expect(result.success).toBe(false);
  });

  it("attributeSchema accepts valid enum with options", () => {
    const result = attributeSchema.safeParse({
      key: "mode",
      label: "Mode",
      type: "enum",
      options: ["a", "b"],
    });
    expect(result.success).toBe(true);
  });

  it("attributeSchema accepts boolean type", () => {
    const result = attributeSchema.safeParse({
      key: "enabled",
      label: "Enabled",
      type: "boolean",
    });
    expect(result.success).toBe(true);
  });

  it("attributeSchema accepts text type with suggestions", () => {
    const result = attributeSchema.safeParse({
      key: "retention",
      label: "Retention",
      type: "text",
      suggestions: ["7d", "30d"],
    });
    expect(result.success).toBe(true);
  });

  it("attributeSchema accepts number type", () => {
    const result = attributeSchema.safeParse({
      key: "shards",
      label: "Shards",
      type: "number",
    });
    expect(result.success).toBe(true);
  });

  it("database archetype has replication enum and shards number", () => {
    const db = archetypes["database"];
    const rep = db.attributes?.find((a) => a.key === "replication");
    const shards = db.attributes?.find((a) => a.key === "shards");
    expect(rep?.type).toBe("enum");
    expect(rep?.options).toEqual(
      expect.arrayContaining(["none", "primary-replica"]),
    );
    expect(shards?.type).toBe("number");
  });

  it("cache archetype has eviction enum", () => {
    const a = archetypes["cache"].attributes?.find((x) => x.key === "eviction");
    expect(a?.type).toBe("enum");
    expect(a?.options).toEqual(expect.arrayContaining(["lru", "lfu"]));
  });

  // ─── Feature 3: new tools ──────────────────────────────────────────────────

  it("toolsForArchetype('database') includes scylladb", () => {
    const keys = toolsForArchetype("database").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["scylladb"]));
  });

  it("toolsForArchetype('database') includes couchbase, oracle, sqlserver, firestore, questdb, arangodb", () => {
    const keys = toolsForArchetype("database").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining([
        "couchbase",
        "oracle",
        "sqlserver",
        "firestore",
        "questdb",
        "arangodb",
      ]),
    );
  });

  it("toolsForArchetype('warehouse') includes trino, apachedruid, apachepinot", () => {
    const keys = toolsForArchetype("warehouse").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["trino", "apachedruid", "apachepinot"]),
    );
  });

  it("toolsForArchetype('queue') includes awskinesis", () => {
    const keys = toolsForArchetype("queue").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["awskinesis"]));
  });

  it("oracle, sqlserver, questdb, apachepinot, awskinesis have no iconSlug (use svgPath)", () => {
    for (const key of ["sqlserver", "questdb", "apachepinot", "awskinesis"]) {
      const tool = getTool(key);
      expect(tool, `${key} should exist`).toBeDefined();
      if (!tool) continue;
      expect(
        (tool as { iconSlug?: string }).iconSlug,
        `${key} should not have iconSlug`,
      ).toBeUndefined();
    }
  });

  it("scylladb, couchbase, arangodb, trino, apachedruid, timescaledb, firestore have iconSlug", () => {
    const expected: Record<string, string> = {
      scylladb: "scylladb",
      couchbase: "couchbase",
      arangodb: "arangodb",
      trino: "trino",
      apachedruid: "apachedruid",
      timescaledb: "timescale",
      firestore: "firebase",
    };
    for (const [key, slug] of Object.entries(expected)) {
      const tool = getTool(key);
      expect(tool, `${key} should exist`).toBeDefined();
      if (!tool) continue;
      expect(
        (tool as { iconSlug?: string }).iconSlug,
        `${key} should have iconSlug "${slug}"`,
      ).toBe(slug);
    }
  });

  it("archetypeSchema rejects attributes with enum and no options", () => {
    const result = archetypesFileSchema.safeParse({
      x: {
        label: "X",
        brandColor: "#aabbcc",
        symbolViewBox: "0 0 10 10",
        symbolSvg: "<p/>",
        defaultTool: "y",
        attributes: [{ key: "m", label: "M", type: "enum" }],
      },
    });
    expect(result.success).toBe(false);
  });

  // ─── Catalog sweep additions ───────────────────────────────────────────────

  it("total tools count is 190", () => {
    expect(Object.keys(tools)).toHaveLength(190);
  });

  it("toolsForArchetype('observability') includes dynatrace, pagerduty, victoriametrics, fluentd, fluentbit", () => {
    const keys = toolsForArchetype("observability").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining([
        "dynatrace",
        "pagerduty",
        "victoriametrics",
        "fluentd",
        "fluentbit",
      ]),
    );
  });

  it("toolsForArchetype('compute') includes digitalocean, railway, render", () => {
    const keys = toolsForArchetype("compute").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["digitalocean", "railway", "render"]),
    );
  });

  it("toolsForArchetype('database') includes neon (vector DB)", () => {
    const keys = toolsForArchetype("database").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["neon"]));
  });

  it("toolsForArchetype('search') includes milvus, qdrant (vector DBs)", () => {
    const keys = toolsForArchetype("search").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["milvus", "qdrant"]));
  });

  it("toolsForArchetype('search') includes the vector-DB additions", () => {
    const keys = toolsForArchetype("search").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining([
        "pinecone",
        "weaviate",
        "chroma",
        "lancedb",
        "pgvector",
        "vespa",
      ]),
    );
  });

  it("toolsForArchetype('ml') includes cohere, togetherai, groq", () => {
    const keys = toolsForArchetype("ml").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["cohere", "togetherai", "groq"]),
    );
  });

  it("toolsForArchetype('ml') includes googlegemini, mistralai, replicate, langchain", () => {
    const keys = toolsForArchetype("ml").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining([
        "googlegemini",
        "mistralai",
        "replicate",
        "langchain",
      ]),
    );
  });

  it("toolsForArchetype('cicd') includes travisci, buildkite, teamcity, drone", () => {
    const keys = toolsForArchetype("cicd").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["travisci", "buildkite", "teamcity", "drone"]),
    );
  });

  it("toolsForArchetype('auth') includes ory", () => {
    const keys = toolsForArchetype("auth").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["ory"]));
  });

  it("toolsForArchetype('pipeline') includes prefect and airbyte", () => {
    const keys = toolsForArchetype("pipeline").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["prefect", "airbyte"]));
  });

  it("toolsForArchetype('iac') includes opentofu", () => {
    const keys = toolsForArchetype("iac").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["opentofu"]));
  });

  it("toolsForArchetype('external') includes github, hubspot, shopify", () => {
    const keys = toolsForArchetype("external").map(([k]) => k);
    expect(keys).toEqual(
      expect.arrayContaining(["github", "hubspot", "shopify"]),
    );
  });

  it("toolsForArchetype('queue') includes redpanda", () => {
    const keys = toolsForArchetype("queue").map(([k]) => k);
    expect(keys).toEqual(expect.arrayContaining(["redpanda"]));
  });

  it("new tools with iconSlug have valid slugs (dynatrace, pagerduty, digitalocean, neon, ory, opentofu)", () => {
    const expected: Record<string, string> = {
      dynatrace: "dynatrace",
      pagerduty: "pagerduty",
      victoriametrics: "victoriametrics",
      fluentd: "fluentd",
      fluentbit: "fluentbit",
      digitalocean: "digitalocean",
      railway: "railway",
      render: "render",
      neon: "neon",
      milvus: "milvus",
      qdrant: "qdrant",
      googlegemini: "googlegemini",
      mistralai: "mistralai",
      replicate: "replicate",
      langchain: "langchain",
      travisci: "travisci",
      buildkite: "buildkite",
      teamcity: "teamcity",
      drone: "drone",
      ory: "ory",
      prefect: "prefect",
      airbyte: "airbyte",
      opentofu: "opentofu",
      github: "github",
      hubspot: "hubspot",
      shopify: "shopify",
    };
    for (const [key, slug] of Object.entries(expected)) {
      const tool = getTool(key);
      expect(tool, `${key} should exist`).toBeDefined();
      if (!tool) continue;
      expect(
        (tool as { iconSlug?: string }).iconSlug,
        `${key} should have iconSlug "${slug}"`,
      ).toBe(slug);
    }
  });

  it("redpanda has svgPath (no iconSlug)", () => {
    const tool = getTool("redpanda");
    expect(tool).toBeDefined();
    expect((tool as { iconSlug?: string }).iconSlug).toBeUndefined();
  });

  // ─── Pass 2: new archetype attribute spot-checks ──────────────────────────

  it("database archetype has indexes (text) and connection-pool (number)", () => {
    const db = archetypes["database"];
    const indexes = db.attributes?.find((a) => a.key === "indexes");
    const pool = db.attributes?.find((a) => a.key === "connection-pool");
    expect(indexes?.type).toBe("text");
    expect(pool?.type).toBe("number");
  });

  it("queue archetype has max-message-size attribute", () => {
    const q = archetypes["queue"];
    const attr = q.attributes?.find((a) => a.key === "max-message-size");
    expect(attr?.type).toBe("text");
  });

  it("compute archetype has cpu attribute", () => {
    const c = archetypes["compute"];
    const attr = c.attributes?.find((a) => a.key === "cpu");
    expect(attr?.type).toBe("text");
  });

  it("cache archetype has size attribute", () => {
    const c = archetypes["cache"];
    const attr = c.attributes?.find((a) => a.key === "size");
    expect(attr?.type).toBe("text");
  });

  it("gateway archetype has timeout attribute", () => {
    const g = archetypes["gateway"];
    const attr = g.attributes?.find((a) => a.key === "timeout");
    expect(attr?.type).toBe("text");
  });

  it("observability archetype has alerting (boolean)", () => {
    const o = archetypes["observability"];
    const attr = o.attributes?.find((a) => a.key === "alerting");
    expect(attr?.type).toBe("boolean");
  });

  it("storage archetype has region-replication enum", () => {
    const s = archetypes["storage"];
    const attr = s.attributes?.find((a) => a.key === "region-replication");
    expect(attr?.type).toBe("enum");
    expect(attr?.options).toEqual(
      expect.arrayContaining(["single-region", "multi-region"]),
    );
  });

  it("cdn archetype has invalidation attribute", () => {
    const c = archetypes["cdn"];
    const attr = c.attributes?.find((a) => a.key === "invalidation");
    expect(attr?.type).toBe("text");
  });

  it("client archetype has auth-method enum", () => {
    const c = archetypes["client"];
    const attr = c.attributes?.find((a) => a.key === "auth-method");
    expect(attr?.type).toBe("enum");
    expect(attr?.options).toEqual(expect.arrayContaining(["jwt", "oauth2"]));
  });

  it("auth archetype has token-ttl attribute", () => {
    const a = archetypes["auth"];
    const attr = a.attributes?.find((x) => x.key === "token-ttl");
    expect(attr?.type).toBe("text");
  });

  it("ml archetype has latency-slo attribute", () => {
    const m = archetypes["ml"];
    const attr = m.attributes?.find((a) => a.key === "latency-slo");
    expect(attr?.type).toBe("text");
  });

  it("warehouse archetype has partitioned (boolean)", () => {
    const w = archetypes["warehouse"];
    const attr = w.attributes?.find((a) => a.key === "partitioned");
    expect(attr?.type).toBe("boolean");
  });

  it("pipeline archetype has checkpointing (boolean)", () => {
    const p = archetypes["pipeline"];
    const attr = p.attributes?.find((a) => a.key === "checkpointing");
    expect(attr?.type).toBe("boolean");
  });

  it("iac archetype has modules (number)", () => {
    const i = archetypes["iac"];
    const attr = i.attributes?.find((a) => a.key === "modules");
    expect(attr?.type).toBe("number");
  });

  it("serverless archetype has timeout attribute", () => {
    const s = archetypes["serverless"];
    const attr = s.attributes?.find((a) => a.key === "timeout");
    expect(attr?.type).toBe("text");
  });

  it("secrets archetype has versioning (boolean)", () => {
    const s = archetypes["secrets"];
    const attr = s.attributes?.find((a) => a.key === "versioning");
    expect(attr?.type).toBe("boolean");
  });

  it("external archetype has webhook-callbacks (boolean)", () => {
    const e = archetypes["external"];
    const attr = e.attributes?.find((a) => a.key === "webhook-callbacks");
    expect(attr?.type).toBe("boolean");
  });

  it("notification archetype has delivery-guarantee enum", () => {
    const n = archetypes["notification"];
    const attr = n.attributes?.find((a) => a.key === "delivery-guarantee");
    expect(attr?.type).toBe("enum");
    expect(attr?.options).toEqual(
      expect.arrayContaining(["at-least-once", "exactly-once"]),
    );
  });

  it("realtime archetype has presence (boolean)", () => {
    const r = archetypes["realtime"];
    const attr = r.attributes?.find((a) => a.key === "presence");
    expect(attr?.type).toBe("boolean");
  });

  it("workflow archetype has idempotency (boolean)", () => {
    const wf = archetypes["workflow"];
    const attr = wf.attributes?.find((a) => a.key === "idempotency");
    expect(attr?.type).toBe("boolean");
  });
});
