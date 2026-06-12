# Example diagrams

Ready-made `.schemamorph` files for README screenshots and demos.

| File | Description | Best for |
|------|-------------|----------|
| [ecommerce-checkout.schemamorph](./ecommerce-checkout.schemamorph) | ShopStream checkout — CDN, K8s microservices, Kafka, Postgres, Stripe | Real-world system design; toggle **M** to flip symbols ↔ vendor logos |
| [ai-rag-pipeline.schemamorph](./ai-rag-pipeline.schemamorph) | DocMind RAG assistant — embeddings, vector search, streaming LLM, Flink ingestion | Feature showcase: boundaries, step markers, notes, animated CDC edges, free-form arrows |

## Snapshot workflow

1. `npm run dev` → http://localhost:5173
2. **Load** (toolbar settings → File) and pick an example from this folder
3. **Fit view** (bottom-left controls) so the full diagram is visible
4. Toggle **M** for minimalist vs real-tools mode — same layout, different look
5. Export **PNG** from the toolbar, or grab a browser screenshot

### Suggested README shots

- **Dual-mode hero** — load `ecommerce-checkout`, capture minimalist then real mode side-by-side
- **Annotations** — load `ai-rag-pipeline` (already set to real mode + card style); shows boundaries, sticky notes, step markers, and animated streams

Both files use `nodeStyle: card` (logo + label). Switch to **Symbol** or **Plate** in the toolbar if you prefer a different look.
