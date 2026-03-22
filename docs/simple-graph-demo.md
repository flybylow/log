# Standalone simple graph (hard-coded triples)

- **URL:** **`/simple-graph`** (Vite dev or built SPA from the API server).
- **Code:** [`frontend/src/SimpleGraphTestPage.tsx`](../frontend/src/SimpleGraphTestPage.tsx) — layout + side panel for selection.
- **Data:** [`frontend/src/hardcodedDemoGraph.ts`](../frontend/src/hardcodedDemoGraph.ts) — inlined Turtle string + `buildHardcodedGraphData()` (same `parseTurtleToGraph` → `buildForceGraphData` pipeline as the dashboard).
- **Tests:** [`frontend/src/simpleGraphTestPage.test.tsx`](../frontend/src/simpleGraphTestPage.test.tsx) — parses triples, checks non-empty graph payload, renders page chrome (graph canvas is stubbed in jsdom).

No `GET /graph`; useful to verify the force-graph UI without the backend.

## Troubleshooting

### `No routes matched location "/simple-graph"`

The route is defined in [`App.tsx`](../frontend/src/App.tsx). That message means the **JavaScript bundle** your browser loaded was built **before** `/simple-graph` existed, or **`frontend/dist` was not redeployed**.

1. From the **repo root**, rebuild the SPA and server: **`npm run build`** (runs `frontend` `vite build` then `tsc` for `src/`).
2. Restart the process that serves **`frontend/dist`** (e.g. `npm run serve` or your host).
3. Hard-refresh the browser or clear cache so the new hashed asset (e.g. `assets/index-*.js`) loads.

Express already falls through to **`index.html`** for unknown GET paths (see `src/app.ts`), so `/simple-graph` does not need a separate server rule.

### `SES Removing unpermitted intrinsics`

That line usually comes from a **browser extension** (wallet / lockdown), not from this app. It is unrelated to routing.
