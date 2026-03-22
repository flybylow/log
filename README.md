# dpp-event

**DPP Event Log Service** — accepts EPCIS 2.0 JSON-LD lifecycle events (`POST /events`), validates and transforms them to Turtle, hashes and classifies them, notarizes hashes to IOTA (stub until SDK is wired), and appends triples to a persisted RDF graph (`GET /graph`). Intended deployment: **events.tabulas.eu** (Combell, Node.js 22); read layer: **tabulas.eu** (Vercel).

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

Graph UI (optional during development): in another terminal, `cd frontend && npm install && npm run dev` — Vite proxies `/graph`, `/status`, and `/api` to the API on port 3000. Production serves the built app from `GET /` after `npm run build`.

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
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d @examples/vanmarcke-inloopdouche.json
```

Production-style run: `npm run build` then `npm run serve` (same as Combell’s `serve` script).

After deploy, **`GET /`** serves the **React graph UI** (built from `frontend/` into `frontend/dist`). If you see **`Cannot GET /`** or **`Frontend not built`**, run **`npm run build`** from the repo root (it builds the frontend and compiles the server). The API **`GET /api/timeline`** still returns the JSON event timeline.

## Documentation

- **Full developer handoff** (architecture, trust layers, deployment, source reference): [`docs/dpp-event-developer-handoff.md`](docs/dpp-event-developer-handoff.md)
- **Deploy path (GitHub, CI, Combell):** [`docs/deployment-setup.md`](docs/deployment-setup.md)
- **Conventions & knowledge base:** [`docs/BASE.md`](docs/BASE.md)
- **Docs index:** [`docs/README.md`](docs/README.md)

Upstream reference repo: [github.com/flybylow/log](https://github.com/flybylow/log).
