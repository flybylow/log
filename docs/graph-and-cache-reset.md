# Graph reset and clearing build cache

The React Flow UI reads **`GET /graph`**, which merges **in-memory** Turtle with whatever is on **disk** (default **`data/products.ttl`**, or **`DPP_GRAPH_PATH`**). If you still see many nodes after “starting fresh,” the old **persisted triples** are usually still there, or the **running process** has not reloaded an empty file.

## One command: graph + build artifacts (recommended for a clean slate)

From the **repository root**:

```bash
npm run clear:cache
```

This runs, in order:

1. **`npm run clear:graph`** — calls `scripts/clear-graph.ts`, which uses the same logic as the server’s `clearPersistedGraph()` in `src/graph.ts`: rewrites the Turtle file to **@prefix headers only** (no event/product/hash triples). Respects **`DPP_GRAPH_PATH`** if set in `.env`.
2. **`npm run clear:build`** — removes **`dist/`**, **`frontend/dist/`**, and Vite’s cache **`frontend/node_modules/.vite`** so the next **`npm run build`** is a full rebuild.

After **`clear:graph`**, **restart the API** (`npm run dev` / `npm run serve`) if it was already running. The process keeps the previous graph in memory until restart (unless you use **`DELETE /graph`** with **`DPP_GRAPH_RESET_SECRET`**, which clears memory and file while the server stays up — see below).

## Individual scripts

| Script | What it does |
|--------|----------------|
| `npm run clear:graph` | Empty persisted graph file (prefixes only). **Restart the API** afterward if it is running. |
| `npm run clear:build` | Delete compiled output and Vite cache (see above). |
| `npm run clear:cache` | `clear:graph` then `clear:build`. |

## Clear graph in the dashboard UI

If **`DPP_GRAPH_RESET_SECRET`** is set and the API was restarted so it loaded that variable, **`GET /status`** includes **`graphResetEnabled: true`**. The React dashboard then shows a **Clear graph…** button (next to **Refresh**). It opens a confirmation dialog: enter the **same** secret as in `.env`, submit, and the UI calls **`DELETE /graph`** then refreshes the graph and timeline. If the secret is not configured, the button is **hidden**.

## Clear graph via HTTP (no restart)

If **`DPP_GRAPH_RESET_SECRET`** is set in `.env` and the server was started with it loaded:

```bash
curl -X DELETE "http://127.0.0.1:${PORT:-3001}/graph" \
  -H "Authorization: Bearer YOUR_SECRET"
```

(Use your real **`PORT`** and secret.) This clears **both** the file and **in-memory** timeline/counters — see root **`README.md`**.

## Manual equivalent (what the script does on disk)

The persisted file is overwritten with the same **@prefix** block the server uses in `src/graph.ts` — no data statements. If you edit the file by hand, keep that block consistent.

## Why restart matters after `clear:graph` only

`clear:graph` updates **disk** only. A running Node process has already called `loadFromDiskIfNeeded()` and holds the old **`graphBody`** in memory. **Restart** the process, or use **`DELETE /graph`** so the running app clears itself.
