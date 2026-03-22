# Documentation

All project documentation lives in this folder so the **repository root stays clean** (no scattered guides or runbooks at the top level).

## Start here

| Document | Purpose |
|----------|---------|
| [BASE.md](./BASE.md) | Internal knowledge base: conventions, decisions, and facts to preserve |
| [graph-tab-force-graph.md](./graph-tab-force-graph.md) | `react-force-graph-2d` behavior: shadow canvas, layout, Marke/PRD cross-refs |
| [graph-minimal-test.md](./graph-minimal-test.md) | **`data/graph-minimal.ttl`**: tiny graph + **`DPP_GRAPH_PATH`** for quick UI tests |
| [simple-graph-demo.md](./simple-graph-demo.md) | **`/simple-graph`**: hard-coded Turtle in the SPA + tests (no API) |
| [graph-and-cache-reset.md](./graph-and-cache-reset.md) | Empty persisted graph + clear `dist` / Vite cache (`npm run clear:cache`) |
| [deployment-setup.md](./deployment-setup.md) | GitHub repo, CI, Combell production checklist + **Troubleshooting (Combell)** |
| [dpp-event-developer-handoff.md](./dpp-event-developer-handoff.md) | Full developer handoff: DPP Event Log Service (EPCIS → Turtle → IOTA), Combell, examples |

## Suggested layout (as the project grows)

- **`BASE.md`** — Living index of conventions and pointers to other docs.
- **Topic guides** — e.g. `setup.md`, `architecture.md`, `deployment.md` (add names that match your stack).
- **Optional:** `adr/` for Architecture Decision Records if you use that pattern.

Add new documents under `docs/` only; link them from `BASE.md` or this README.
