# dpp-event

**DPP Event Log Service** — accepts EPCIS 2.0 JSON-LD lifecycle events (`POST /events`), validates and transforms them to Turtle, hashes and classifies them, notarizes hashes to IOTA (stub until SDK is wired), and appends triples to a persisted RDF graph (`GET /graph`). Intended deployment: **events.tabulas.eu** (Combell, Node.js 22); read layer: **tabulas.eu** (Vercel).

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

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

## Documentation

- **Full developer handoff** (architecture, trust layers, deployment, source reference): [`docs/dpp-event-developer-handoff.md`](docs/dpp-event-developer-handoff.md)
- **Deploy path (GitHub, CI, Combell):** [`docs/deployment-setup.md`](docs/deployment-setup.md)
- **Conventions & knowledge base:** [`docs/BASE.md`](docs/BASE.md)
- **Docs index:** [`docs/README.md`](docs/README.md)

Upstream reference repo: [github.com/flybylow/log](https://github.com/flybylow/log).
