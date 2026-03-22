# Deployment setup (GitHub → verify → Combell)

Order of operations for **dpp-event** (write API at `events.tabulas.eu`).

## 1. GitHub

1. **Create an empty repository** on GitHub (no README if you already have one locally), under your org or user.
2. From this machine (after [GitHub CLI](https://cli.github.com/) login: `gh auth login`):

   ```bash
   cd /path/to/events
   git remote add origin git@github.com:OWNER/REPO.git
   git push -u origin main
   ```

   Or create and push in one step:

   ```bash
   gh repo create OWNER/dpp-event --private --source=. --remote=origin --push
   ```

3. **Combell deploy key (later):** In the repo → **Settings → Deploy keys**, add the read-only SSH public key Combell gives you so the host can `git pull`.

## 2. Test before Combell

- **CI:** Pushes to `main` / `master` run `.github/workflows/ci.yml` (`npm ci`, `npm test`, `npm run build`) on Node 22.
- **Local:** `npm install && npm test && npm run build`; optional `npm run dev` and `curl` against `POST /events` (see root `README.md`).

**Vercel:** The **read** app (`tabulas.eu`, Next.js + Comunica) belongs on Vercel. **This** service is a long-running Express app with a persisted Turtle file (`data/products.ttl`), so production is **Node on Combell**, not a typical serverless Vercel deploy. Use GitHub Actions + staging on a Node host (or Combell staging) to validate before pointing DNS.

## 3. Combell (production)

Aligned with [dpp-event-developer-handoff.md](./dpp-event-developer-handoff.md#deployment-combell):

- **Runtime:** Node.js 22, listen on `PORT` (e.g. 3000).
- **Deploy:** Git pull from GitHub (SSH deploy key on the repo).
- **DNS:** `events.tabulas.eu` → CNAME (or A) as Combell documents.
- **Environment** (panel; do not commit secrets):

  | Variable | Example |
  |----------|---------|
  | `PORT` | `3000` |
  | `IOTA_RPC_URL` | `https://api.testnet.iota.cafe` |
  | `IOTA_PRIVATE_KEY` | (hosting only) |
  | `IOTA_NETWORK` | `testnet` |
  | `TABULAS_ORIGIN` | `https://tabulas.eu` |

- **Persistence:** Ensure `data/` is writable so `products.ttl` survives restarts (same handoff doc).

After go-live, smoke from your machine:

```bash
curl -sS -X POST "https://events.tabulas.eu/events" \
  -H "Content-Type: application/json" \
  -d @examples/vanmarcke-inloopdouche.json
```

---

*If “test on Vercel” meant something else (e.g. a preview app that calls this API), point that app’s base URL at staging or production `events` once DNS is ready.*
