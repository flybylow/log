# Graph reset and clearing build cache

The dashboard graph (**`react-force-graph-2d`**) reads **`GET /graph`**, which merges **in-memory** Turtle with whatever is on **disk** (default **`data/products.ttl`**, or **`DPP_GRAPH_PATH`**). If you still see many nodes after “starting fresh,” the old **persisted triples** are usually still there, or the **running process** has not reloaded an empty file.

## One command: graph + build artifacts (recommended for a clean slate)

From the **repository root**:

```bash
npm run clear:cache
```

This runs, in order:

1. **`npm run clear:graph`** — calls `scripts/clear-graph.ts`. If **`DPP_GRAPH_RESET_SECRET`** is set, it **`DELETE`**s the running API (see below) so **memory, file, timeline, and counters** stay in sync; otherwise it rewrites the Turtle file to **@prefix headers only** (same as `clearPersistedGraph()` in `src/graph.ts`). Respects **`DPP_GRAPH_PATH`** if set in `.env`.
2. **`npm run clear:build`** — removes **`dist/`**, **`frontend/dist/`**, and Vite’s cache **`frontend/node_modules/.vite`** so the next **`npm run build`** is a full rebuild.

If **`DPP_GRAPH_RESET_SECRET`** is set in `.env`, **`npm run clear:graph`** first tries **`DELETE`** on the **running** API (default **`http://127.0.0.1:$PORT`**, override with **`DPP_API_ORIGIN`**). That clears **memory, file, timeline, and counters** in one step — no restart needed.

If the secret is **not** set, or no process is listening (connection refused), the script only rewrites the Turtle file; **restart the API** so its in-memory graph and timeline match disk. You can also use the dashboard **Clear graph…** button or **`curl`** **`DELETE /graph`** when the secret is configured (see below).

## Individual scripts

| Script | What it does |
|--------|----------------|
| `npm run clear:graph` | Empty persisted file; if **`DPP_GRAPH_RESET_SECRET`** is set, also **`DELETE`** the running API (clears memory + timeline). Otherwise **restart the API** if it was running. Targets **`http://127.0.0.1:$PORT`** from **`.env`** unless **`DPP_API_ORIGIN`** is set (use that when the API is not on the default origin, e.g. another port). |
| `npm run dev:clean` | Runs **`clear:graph`** then **`npm run dev`**. Use when the dev server is **stopped**: you get a rewritten file and a **new** process with empty memory/timeline. If a server is still bound to **`PORT`**, stop it first or use **`clear:graph`** only. |
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

## Why restart still matters without a secret

Without **`DPP_GRAPH_RESET_SECRET`**, the script updates **disk** only. A running Node process holds the old **`graphBody`** and **timeline** in memory. **Restart** the process, or set the secret and rerun **`clear:graph`** (or call **`DELETE /graph`**) so the running app clears itself.

The dashboard is **not** holding the RDF in `localStorage` — it reflects **`GET /graph`** and **`GET /api/timeline`**. If those stay “full,” the **server** still has old state (or you are pointed at another host/port).
