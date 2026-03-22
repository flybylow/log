# Knowledge base (BASE)

This file is the project’s **internal knowledge base**: conventions, decisions, and facts we want future work (and tooling) to remember.

## How we organize docs

- **Root stays clean.** Do not add guides, runbooks, or internal knowledge as loose `.md` files at the project root.
- **Everything lives under `docs/`.** Put how-tos, architecture notes, ADRs, and similar material here.
- **One exception:** a single root `README.md` is allowed for a short project pointer and links into `docs/`.

## What to put here (`BASE.md`)

Update `BASE.md` when you establish or change:

- Naming or folder conventions
- Build, test, and deploy assumptions
- Environment variables and secrets handling (describe *what* exists, not secret values)
- External services the project depends on
- Anything you would otherwise repeat in chat

Keep entries short and factual. Link to longer docs in `docs/` when needed.

## Language

- **English only** for this repository’s **documentation**, **knowledge base** (`docs/BASE.md`, `docs/*`), **root `README.md`**, **inline comments** intended for maintainers, **commit messages**, and **PR descriptions**. Tools and collaborators should default to **English** when changing or explaining code here.
- **EPCIS payloads and domain terms** (e.g. event field names, `bizStep` values) stay as defined by GS1 / project examples; surrounding prose stays in **English**.

## Deploy discipline

- **Test first, then deploy (“play”).** Before triggering a hosting pipeline (e.g. Combell) or treating a release as done, run **`npm test`** and **`npm run build`** locally or rely on **CI** on `main`. Do not skip green tests for production deploys.

## dpp-event (project facts)

- **Runnable service code** lives at this repository root (`package.json`, `src/`, `examples/`). The handoff document is the detailed archive and may lag the repo; prefer the source tree for behavior.
- **Local port:** Default **`PORT` is 3001** (`src/server.ts`) so **Next.js** (or anything else) can use **3000** without `EADDRINUSE`. Set **`PORT`** in `.env` for production (e.g. Combell). Vite dev reads **`PORT` from the repo root** for API proxy targets (`frontend/vite.config.ts`).
- **Empty graph / clean build:** Persisted Turtle lives in **`data/products.ttl`** (or **`DPP_GRAPH_PATH`**). Set **`DPP_GRAPH_RESET_SECRET`** in `.env` (see **`.env.example`**) so **`npm run clear:graph`** can **`DELETE`** the running API and clear memory + file + timeline; **`npm run dev:clean`** clears the file then starts **`dev`** cold. If the API listens on another host/port, set **`DPP_API_ORIGIN`** (e.g. **`http://127.0.0.1:3002`**) for **`clear:graph`**. **`npm run clear:cache`** also clears `dist` + Vite cache. Details: [graph-and-cache-reset.md](./graph-and-cache-reset.md).
- **Minimal graph smoke test:** **`data/graph-minimal.ttl`** (two events, one product). Point **`DPP_GRAPH_PATH`** at it for a tiny graph UI check — [graph-minimal-test.md](./graph-minimal-test.md).
- **Simple graph demo (no API):** SPA route **`/simple-graph`** uses inlined Turtle in [`hardcodedDemoGraph.ts`](../frontend/src/hardcodedDemoGraph.ts) and the same graph component as **2. Check** — [simple-graph-demo.md](./simple-graph-demo.md).
- **Upstream repo:** https://github.com/flybylow/log
- **Production write API:** `events.tabulas.eu` — Express on Combell, Node.js 22
- **Read layer:** `tabulas.eu` on Vercel (Next.js, Comunica/SPARQL)
- **Pipeline:** EPCIS JSON-LD → validate → Turtle → SHA-256 → classify → IOTA notarization (stub) → append graph + persist Turtle (default `data/products.ttl`, override with `DPP_GRAPH_PATH`). **`DELETE /graph`** wipes triples (memory + file) and resets timeline/counters when **`DPP_GRAPH_RESET_SECRET`** is set; use `Authorization: Bearer …` or `X-DPP-Graph-Reset`.
- **Construction EPCIS examples:** The JSON files under **`examples/`** (e.g. commissioning, mixer shipped, installer installed) are the **canonical** sample events for the **construction** vertical. Use them for **`curl`**, tests, demos, and the in-app “send event” flow. The **API surface** is unchanged: **`POST /events`** with the same JSON-LD shape; only the payload content reflects construction scenarios.
- **Frontend:** `frontend/` is a Vite + React + Tailwind SPA: **Turtle** from **`GET /graph`** → **2. Check** knowledge graph uses **`react-force-graph-2d`** ([`KnowledgeForceGraph.tsx`](../frontend/src/KnowledgeForceGraph.tsx)) with a **timeline** layout: events ordered by `eventTime` (**older left, newer right**); per-event nodes stack **vertically** in columns. **Each accepted POST** gets a **distinct RDF event URI** (see `transform.ts`: instance id in the path) so identical sample payloads still render as **separate horizontal steps**. **`/api/timeline`** includes **`eventUri`** per row; the UI routes **`/event/<SHA-256 hex>`** to a **single-event** detail view (timeline row + graph column). **`/api/timeline`** + **Send EPCIS** use `embeddedExamples.ts` (21 construction lifecycle samples + custom JSON; repo `examples/` holds reference payloads). **`npm run build`** runs `build:frontend` then **`build:server`** (`node node_modules/typescript/bin/tsc`; root **`npm ci`** must include devDependencies so **TypeScript** is installed). Express serves **`GET /`** from `frontend/dist` when present; otherwise **`503`** with a build hint; **`GET /event/*`** (non-API) **falls through** to **`index.html`** for SPA routing. **Local dev:** Prefer **`http://localhost:${PORT}/`** (default **3001**) for the full SPA + API on one origin; use Vite **`http://localhost:5173/`** only when you want HMR on the React app. **GS1 Digital Link** URLs (`https://id.gs1.org/01/…`) in the UI: optional **`VITE_IDENTIFIER_DOCS_BASE`** (root **`.env`**) makes links open **your** docs page with **`?uri=`** (canonical URI); otherwise links stay on the GS1 resolver with tooltips explaining demo vs resolver (`identifierLinks.ts`). Graph canvas behavior and pitfalls: [graph-tab-force-graph.md](./graph-tab-force-graph.md). A separate **Tabulas product graph explorer** PRD (3D, Comunica SPARQL on `public/products.ttl`) lives in another repo — see cross-links in that doc.
- **Tests:** `npm test` runs `tsx --test` on `src/*.test.ts` (incl. `supertest` against `app.ts`); run **`npm run build` first** so `GET /` tests see the built SPA. `npm run smoke` is a manual printout only
- **Combell Node.js:** Control panel expects `package.json` scripts **`build`** and **`serve`**; pipeline runs build then starts `serve` ([deployment-setup.md](./deployment-setup.md)). **`build`** must include **`build:frontend`** (not `tsc` alone). Set **`PORT`** in hosting env (often **3000**) so it matches the instance — the code default is **3001** only when **`PORT` is unset**. See **Troubleshooting (Combell)** in that doc for 502/CORS/SPA-missing cases. Optional **`CANONICAL_HOST`** (e.g. `log.tabulas.eu`) issues **301** from **`www.<host>`** to **`https://<host>`** when both DNS names hit this app.
- **CORS:** Set `CORS_ORIGINS` on the write API (e.g. `https://aiactscan.eu,https://tabulas.eu`) so the Vercel frontend and Tabulas can call `log.tabulas.eu` / `events.tabulas.eu`; browser `Origin` has no path (so `https://aiactscan.eu` covers `/log`).
- **Secrets:** `IOTA_PRIVATE_KEY` and Combell env vars live in hosting only; never commit `.env`

Full handoff (architecture, file layout, source snapshots, examples, deployment): [dpp-event-developer-handoff.md](./dpp-event-developer-handoff.md).

## Index

| Topic | Document |
|--------|----------|
| dpp-event developer handoff (full) | [dpp-event-developer-handoff.md](./dpp-event-developer-handoff.md) |
| Dashboard graph tab (`react-force-graph-2d`) | [graph-tab-force-graph.md](./graph-tab-force-graph.md) |
| GitHub → CI → Combell checklist | [deployment-setup.md](./deployment-setup.md) |
| Docs folder layout | [README.md](./README.md) |

---

*Last updated: 2026-03-22 (graph reset via `clear:graph` / `DPP_GRAPH_RESET_SECRET`; Docker files removed — use `DPP_API_ORIGIN` when the API is not on the default origin)*
