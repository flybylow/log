# Minimal graph fixture (smoke test)

The file **`data/graph-minimal.ttl`** is a tiny persisted Turtle graph: **two events**, **one product** (shared), **two locations**, and **per-event `dpp:sha256`** literals. It matches the DPP shape the dashboard parser expects (`dpp:LifecycleEvent` / `dpp:ObjectEvent`, `dpp:product`, `dpp:bizLocation`, etc.).

## Use it locally (no Docker)

You only need **Node** on your machine — same as the main [README](../README.md) quick start (`npm install`, `npm run build`, `npm run dev`).

1. In **`.env`** (repo root), set:

   ```bash
   DPP_GRAPH_PATH=./data/graph-minimal.ttl
   ```

2. Restart the API (`npm run dev` or your usual process) so it loads that path.

3. Open the dashboard **Graph** tab — you should see a small force graph and a two-step timeline without scrolling through a large demo.

To go back to the default file, remove **`DPP_GRAPH_PATH`** or set it to **`./data/products.ttl`**.

## Clearing

If **`DPP_GRAPH_RESET_SECRET`** is set, **`npm run clear:graph`** clears the **currently configured** graph file (respects **`DPP_GRAPH_PATH`**). For a disposable minimal file you can also delete **`data/graph-minimal.ttl`** and recreate it from the repo.
