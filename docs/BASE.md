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

## dpp-event (project facts)

- **Runnable service code** lives at this repository root (`package.json`, `src/`, `examples/`). The handoff document is the detailed archive and may lag the repo; prefer the source tree for behavior.
- **Upstream repo:** https://github.com/flybylow/dpp-event
- **Production write API:** `events.tabulas.eu` — Express on Combell, Node.js 22
- **Read layer:** `tabulas.eu` on Vercel (Next.js, Comunica/SPARQL)
- **Pipeline:** EPCIS JSON-LD → validate → Turtle → SHA-256 → classify → IOTA notarization (stub/SDK) → append graph + persist `data/products.ttl`
- **Combell Node.js:** Control panel expects `package.json` scripts **`build`** and **`serve`**; pipeline runs build then starts `serve` ([deployment-setup.md](./deployment-setup.md)).
- **Secrets:** `IOTA_PRIVATE_KEY` and Combell env vars live in hosting only; never commit `.env`

Full handoff (architecture, file layout, source snapshots, examples, deployment): [dpp-event-developer-handoff.md](./dpp-event-developer-handoff.md).

## Index

| Topic | Document |
|--------|----------|
| dpp-event developer handoff (full) | [dpp-event-developer-handoff.md](./dpp-event-developer-handoff.md) |
| GitHub → CI → Combell checklist | [deployment-setup.md](./deployment-setup.md) |
| Docs folder layout | [README.md](./README.md) |

---

*Last updated: 2026-03-22*
