# Documentation

All project documentation lives in this folder so the **repository root stays clean** (no scattered guides or runbooks at the top level).

## Start here

| Document | Purpose |
|----------|---------|
| [BASE.md](./BASE.md) | Internal knowledge base: conventions, decisions, and facts to preserve |
| [deployment-setup.md](./deployment-setup.md) | GitHub repo, CI, Combell production checklist |
| [dpp-event-developer-handoff.md](./dpp-event-developer-handoff.md) | Full developer handoff: DPP Event Log Service (EPCIS → Turtle → IOTA), Combell, examples |

## Suggested layout (as the project grows)

- **`BASE.md`** — Living index of conventions and pointers to other docs.
- **Topic guides** — e.g. `setup.md`, `architecture.md`, `deployment.md` (add names that match your stack).
- **Optional:** `adr/` for Architecture Decision Records if you use that pattern.

Add new documents under `docs/` only; link them from `BASE.md` or this README.
