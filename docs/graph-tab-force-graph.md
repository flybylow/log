# Knowledge graph — `react-force-graph-2d` behavior

Implementation: [`frontend/src/KnowledgeForceGraph.tsx`](../frontend/src/KnowledgeForceGraph.tsx), graph nodes/links from [`frontend/src/forceGraphData.ts`](../frontend/src/forceGraphData.ts) (built from Turtle via [`frontend/src/parseTurtle.ts`](../frontend/src/parseTurtle.ts)).

This app’s **2. Check** graph: RDF triples from **`GET /graph`** → **`expandTimelineScopedNodes`** → **`applySimpleGridLayout`** (fixed grid, `fx`/`fy` + `x`/`y`), **gray** edges, **kind-colored discs** via the library’s **default node paint** (`nodeColor` per kind, `nodeRelSize` ~16, `nodeVal` > 1 for visible “balls”). **Custom `nodeCanvasObject` is not used** — in practice it failed to show fills in some environments (only edges visible). **Hover** shows the **`nodeLabel`** tooltip (name). No synthetic “Time” node. For a **different** Tabulas demo (3D product explorer, SPARQL in the browser, flat `products.ttl`), see the PRD in a sibling checkout: `prodlist_triple/docs/PRD-tabulas-dpp-product-graph-explorer.md` — stack and goals differ from this repo.

Richer **hub-and-ring** patterns, property sub-nodes on canvas, chips, and overlay UX are documented in the **Marke** project: `marke/docs/graph-tab-force-graph.md` (when that tree is available beside this repo). This service does **not** implement those features; it only shares the same underlying **`react-force-graph-2d` / `force-graph`** behaviors below.

## `nodeCanvasObjectMode`: do not use `replace` for multiple nodes

In `canvas-force-graph`, **`replace`** calls `ctx.restore()` after each custom node without a matching per-node `ctx.save()` (only one `save()` wraps the whole node loop). After the **first** node, the context stack is wrong and **remaining nodes fall back to the default blue circles**.

**Fix:** use **`before`** or **`after`** (this app uses **`after`**) and set **`nodeColor`** to **fully transparent** (`rgba(0,0,0,0)`) so the default circle pass is invisible; **`nodeAutoColorBy={null}`** so auto-color does not override. Picking still uses **`nodePointerAreaPaint`** on the **shadow** canvas. **Do not** use **`cardFill`** within a few shades of **`backgroundColor`** in dark mode or nodes disappear visually while edges remain.

## Shadow canvas + color picking

`react-force-graph-2d` (via `force-graph`) uses a **hidden shadow canvas** for hit-testing: each node/link is painted with an **indexed color** (`__indexColor`), and `getImageData` reads the pixel under the pointer.

- **Default link hit area** (`linkWidth` + `linkHoverPrecision`) can be drawn **after** nodes on the shadow buffer along edges (e.g. hub→spoke). Those pixels can **win** over node colors at the center, so clicks register as **links** with no `onLinkClick` → **nothing happens** for many nodes.
- **Fix:** `linkPointerAreaPaint={() => {}}` on the **shadow** graph so links do not paint link hit areas there. **Main** canvas draws **visible** gray links (`linkVisibility` true) for the simple graph; shadow links stay empty so node picks still win. Do not remove the shadow fix without retesting picks.

## Node pointer area

Custom `nodePointerAreaPaint` must **`fill()` with the provided `color` argument** (the index color), or picking breaks.

- Use **`n.x ?? n.fx`**, **`n.y ?? n.fy`** so fixed-layout nodes always have a paint target.
- **`nodeRelSize`** is **small** (e.g. **6**): the library uses it for the default circle radius and **`getGraphBbox`**. Hit area is **`nodePointerAreaPaint`**, not the default circle.

## Clicks vs `hoverObj` and pan/zoom

Clicks use **`hoverObj`** timing; combined with **d3-zoom**, some clicks become **`onBackgroundClick`** even when the user aimed at a node.

- **Mitigation:** when `onBackgroundClick` fires, run a **manual hit-test** in graph space: `ref.screen2GraphCoords` + nearest node within roughly the same extent as the card box.

## Pinning forces (`d3Force` on the ref)

`d3Force` is exposed on the **imperative ref** (`ForceGraphMethods`), **not** as a React prop — see `node_modules/react-force-graph-2d/dist/react-force-graph-2d.d.ts`.

After mount, **`onEngineStop`** sets **`link` / `charge` / `center` / `dagRadial`** to **`null`** and calls **`zoomToFit`** so fixed **`fx` / `fy`** from [`applySimpleGridLayout`](../frontend/src/forceGraphData.ts) are not fought by default forces. **`zoom(k)`** sets **absolute** scale; do **not** multiply **`k`** after **`zoomToFit`**.

**Collision vs fixed geometry:** the simple graph uses a **grid** in [`applySimpleGridLayout`](../frontend/src/forceGraphData.ts), not a live `forceCollide` solver.

## Layout (grid + graph width)

CSS Grid’s default **`min-width: auto`** on `1fr` tracks can let the graph column refuse to shrink. Use **`minmax(0,1fr)`** on the graph column and **`min-w-0`** on the wrapper (`DashboardPage.tsx`). The graph column uses **`z-0`** and the side panel **`z-10`** so the canvas does not paint over the panel.

## Canvas `width` / `height` (must match the box)

If **`width`** / **`height`** are omitted, the canvas can default to **window** size while the panel is a small box — you see a **crop** and nodes look clipped.

**Fix:** measure the container (`ResizeObserver` + `useLayoutEffect`) and pass **`width={…}`** **`height={…}`** to `ForceGraph2D`, then **`zoomToFit`** on **`onEngineStop`** and when the measured size changes.

## Timeline layout

[`expandTimelineScopedNodes`](../frontend/src/forceGraphData.ts) / [`applyTimelineLayout`](../frontend/src/forceGraphData.ts): columns by **`dpp:eventTime`**, scoped duplicates for shared resources, synthetic links for ordering (invisible on the canvas).

## RDF / Turtle prefix caveat

Prefixed IRIs with slashes in the local part (e.g. `vm:path/b`) can **break** N3 lexers. Prefer **full HTTPS IRIs** for path-like segments (see Marke’s graph doc and sample Turtle in that repo).

## Related

| Doc | Where |
|-----|--------|
| Marke graph tab (hub, chips, property sub-nodes, examples) | `marke/docs/graph-tab-force-graph.md` |
| PRD: Tabulas DPP **Product** Graph Explorer (3D, Comunica, flat TTL) | `prodlist_triple/docs/PRD-tabulas-dpp-product-graph-explorer.md` — **not** this service’s architecture |
| Clear graph / cache | [graph-and-cache-reset.md](./graph-and-cache-reset.md) |
