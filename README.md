# dpp-event

**DPP Event Log Service** — accepts EPCIS 2.0 JSON-LD lifecycle events (`POST /events`), validates and transforms them to Turtle, hashes and classifies them, notarizes hashes to IOTA (stub until SDK is wired), and appends triples to a persisted RDF graph (`GET /graph`). Intended deployment: **events.tabulas.eu** (Combell, Node.js 22); read layer: **tabulas.eu** (Vercel).

## Quick start

```bash
npm install
cp .env.example .env
npm run build   # npm ci at root, then frontend + server compile (use npm run build:quick if deps already installed)
npm run dev
```

**Open the app at the API root:** **`http://localhost:3001/`** (or whatever **`PORT`** is in `.env`). One process serves the **React dashboard at `/`** and the **API on the same origin** — same shape as production (Combell), no extra proxy, no CORS surprises. That is usually the smoothest way to use the project day to day. The dashboard is **1. Sync** and **2. Check** (graph + timeline).

**Optional — Vite on port 5173:** For **frontend-only** work with hot reload, run `cd frontend && npm install && npm run dev` and open **`http://localhost:5173/`**. Vite proxies `/graph`, `/status`, `/api`, and `/events` to the API using **`PORT` from the repo root `.env`** (default **3001**, so **Next.js** or anything else can use **3000**). Keep **`npm run dev`** running in the repo root so the API is up.

Automated tests:

```bash
npm test
```

Optional manual pipeline printout (no HTTP server):

```bash
npm run smoke
```

Try the HTTP API (with `npm run dev` running):

```bash
curl -X POST http://localhost:3001/events \
  -H "Content-Type: application/json" \
  -d @examples/vanmarcke-inloopdouche.json
```

Production-style run: `npm run build` then `npm run serve` (same as Combell’s `serve` script).

**Event detail page:** open **`/event/<64-hex-SHA-256>`** (from the timeline or “Event details →” on an event node). The server exposes **`eventUri`** on **`GET /api/timeline`** so each row links to the RDF event subject for that submission.

After deploy, **`GET /`** serves the **React graph UI** (built from `frontend/` into `frontend/dist`). If you see **`Cannot GET /`** or **`Frontend not built`**, run **`npm run build`** from the repo root (it builds the frontend and compiles the server). The API **`GET /api/timeline`** still returns the JSON event timeline.

**Timeline layout:** Each accepted `POST /events` is stored as its **own RDF event resource** (a unique subject URI per submission). In the graph, steps are laid out **left → right** by `eventTime` (older on the left, newer on the right): **each new event is a new point on the horizontal timeline**. Detail nodes for that step (actors, products, locations, hash, etc.) stack **vertically** within that column. Sending the same sample JSON twice still creates **two** horizontal steps because each request gets a distinct event URI.

**Start from a clean graph (empty RDF + timeline + zero event count):**

1. **`DPP_GRAPH_RESET_SECRET`** is set in **`.env.example`** for local dev (`dev-local-reset`). Copy it into your **`.env`** if missing, then **restart** `npm run dev` once so the server loads it.
2. Run **`npm run clear:graph`** — it **`DELETE`**s the running API (same as the dashboard **Clear graph…** button), which wipes **memory**, **`data/products.ttl`**, **timeline**, and **counters**. No restart needed if the dev server is already up with the secret loaded.
3. **Or** stop the dev server, then run **`npm run dev:clean`** — clears the persisted file (and hits the API only if something is still listening), then starts a **fresh** process so memory starts empty.

If the secret is unset, `DELETE /graph` returns **404** and `clear:graph` only rewrites the file — **restart** the API afterward, or set the secret and run `clear:graph` again. Full detail: [`docs/graph-and-cache-reset.md`](docs/graph-and-cache-reset.md).

## Documentation

- **Reset persisted graph + clear build cache** (`npm run clear:cache`): [`docs/graph-and-cache-reset.md`](docs/graph-and-cache-reset.md)
- **Full developer handoff** (architecture, trust layers, deployment, source reference): [`docs/dpp-event-developer-handoff.md`](docs/dpp-event-developer-handoff.md)
- **Deploy path (GitHub, CI, Combell):** [`docs/deployment-setup.md`](docs/deployment-setup.md)
- **Conventions & knowledge base:** [`docs/BASE.md`](docs/BASE.md)
- **Docs index:** [`docs/README.md`](docs/README.md)

Upstream reference repo: [github.com/flybylow/log](https://github.com/flybylow/log).
