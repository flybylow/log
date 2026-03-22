# Docker

The repo includes a **multi-stage `Dockerfile`** so builds match CI: root **`npm ci`** (with **devDependencies** for TypeScript), then **`npm run build`**, then a slim runtime image with **`npm ci --omit=dev`** plus **`dist/`** and **`frontend/dist/`**.

## Build and run

From the repository root:

```bash
docker build -t dpp-event:local .
docker run --rm -p 3001:3000 -e PORT=3000 dpp-event:local
```

Open **`http://localhost:3001/`** (container listens on **3000** inside; map host port as you like).

Or use Compose (optional **`.env`**; creates a volume for **`data/`**):

```bash
docker compose up --build
```

Default mapping: host **3002** → container **3000** (avoids **`address already in use`** on **3001** while **`npm run dev`** is running). Override the host port:

```bash
DPP_COMPOSE_PORT=3001 docker compose up --build
```

## Production env

Pass Combell-style variables at run time (see [`deployment-setup.md`](./deployment-setup.md)):

- **`PORT`** — often **3000** in the container; map the host port in your orchestrator.
- **`CORS_ORIGINS`**, **`IOTA_*`**, **`DPP_GRAPH_PATH`**, **`CANONICAL_HOST`**, etc.

Do not bake secrets into the image; use the platform’s env or secrets.

## Why two stages

- **Builder** installs **all** dependencies so **`node node_modules/typescript/bin/tsc`** succeeds (see **`build:server`** in `package.json`).
- **Runner** installs **only** production dependencies and copies the compiled **`dist/`** and static **`frontend/dist/`** — no `npx tsc` / wrong **`tsc`** package, and no dev-only tools in the final image.

## CI

GitHub Actions runs **`docker build`** after tests so a broken **`Dockerfile`** fails the pipeline.
