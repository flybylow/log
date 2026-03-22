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

## 3. Combell (Node.js — step by step)

Official reference: [Getting started with Node.js (Combell)](https://www.combell.com/en/help/kb/getting-started-with-node-js/).

### Before you start

1. **Web hosting + Node.js option** — Combell deploys from Git; you need a hosting package where the **Node.js** add-on is enabled (buy/activate it in the shop or control panel if you have not yet).
2. **Code on GitHub** — The app must already be in a repo (section 1). You will paste the clone URL (HTTPS or SSH) into Combell.
3. **This repo’s `package.json`** — Combell requires **`build`** and **`serve`** scripts. Here, `build` runs `tsc` and `serve` runs `node dist/server.js` (same as `start`).

### Step A — Add a Node.js instance

1. Log in to [my.combell.com](https://my.combell.com).
2. **My Products** → **Web hosting** → **Manage hosting** next to the domain that will serve the API (or the package you use for `tabulas.eu`).
3. In the left menu, open **Node.js**.
4. Click **Add instance** (wording may be “Add Instance”).
5. Fill in:
   - **Friendly name** — e.g. `dpp-event` or `events-api`.
   - **Node.js version** — Choose **22** if listed (this project targets `engines.node >= 22`). If Combell only offers 20 LTS, test `npm run build` on that version locally before relying on it.
   - **Port** — Use the port Combell expects for this instance (often **3000**). The app reads `process.env.PORT` (see `.env.example`); set the same value in environment variables (below) so Express listens on the port Combell’s reverse proxy targets.
6. **Repository URL** — Paste your GitHub repo URL (the same one you use to clone).
7. **Deploy key** — Combell shows an SSH public key. Copy it.
8. In **GitHub**: repo → **Settings** → **Deploy keys** → **Add deploy key** → paste the key, title e.g. `Combell read-only`, **Allow read-only** (no write access needed) → Save.
9. Confirm **Add instance** in Combell.

### Step B — Run the deployment pipeline

1. Still under **Node.js**, select the instance you created.
2. **Run pipeline** (right-click menu or button per Combell UI).
3. Wait until the pipeline **succeeds** (clone → `npm install` → `npm run build` → start `serve`). If it fails, open the log in the panel: typical issues are missing `build`/`serve`, TypeScript errors, or Node version mismatch.

### Step C — Point a website (subdomain) at the Node app

1. **My Products** → **Web hosting** → **Manage hosting**.
2. **Websites & SSL** (left menu).
3. **Manage website** for the site that should serve the API (create a subdomain like `events.tabulas.eu` first if it does not exist — Combell’s DNS/subdomain docs apply).
4. **Change website backend** → choose **Node.js** → select your **dpp-event** instance → confirm.
5. **DNS** — Ensure `events.tabulas.eu` (or your chosen host) points to this hosting package ([Combell: link domain to hosting](https://www.combell.com/en/help/kb/how-do-i-link-my-domain-name-to-my-hosting/)). Propagation can take a short while.

### Step D — Environment variables (secrets on the server)

Set these in the Combell panel for the Node.js instance (exact screen name varies; look for **Environment variables**, **Settings**, or instance **Configuration** — if you do not see them, ask Combell support where env vars are set for Node).

| Variable | Purpose |
|----------|---------|
| `PORT` | Must match the port you configured for the instance (e.g. `3000`). |
| `IOTA_RPC_URL` | e.g. `https://api.testnet.iota.cafe` |
| `IOTA_PRIVATE_KEY` | Your key — **never** commit to git. |
| `IOTA_NETWORK` | e.g. `testnet` |
| `TABULAS_ORIGIN` | e.g. `https://tabulas.eu` |

Redeploy or restart the Node process after changing env vars if the panel does not do it automatically.

### Step E — Data directory (`data/products.ttl`)

The service appends RDF to `data/products.ttl`. After first deploy, confirm on the server (SSH/file manager, if your plan allows) that the app’s working directory contains a writable `data/` folder. If the pipeline runs from the repo root, `data/.gitkeep` is present but `*.ttl` is gitignored — the process must be allowed to create/write `data/products.ttl`.

### Step F — Smoke test

```bash
curl -sS -X POST "https://events.tabulas.eu/events" \
  -H "Content-Type: application/json" \
  -d @examples/vanmarcke-inloopdouche.json
```

Optional: `curl -sS "https://events.tabulas.eu/graph"` for Turtle output.

---

*If “test on Vercel” meant something else (e.g. a preview app that calls this API), point that app’s base URL at staging or production `events` once DNS is ready.*
