import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { KnowledgeGraphNode } from "./forceGraphData";
import { buildHardcodedGraphData } from "./hardcodedDemoGraph";
import { KnowledgeForceGraph } from "./KnowledgeForceGraph";

/**
 * Standalone demo: hard-coded Turtle triples → same graph UI as **2. Check**, no `GET /graph`.
 */
export function SimpleGraphTestPage() {
  const graphData = useMemo(() => buildHardcodedGraphData(), []);
  const [selected, setSelected] = useState<KnowledgeGraphNode | null>(null);

  return (
    <div className="flex min-h-screen min-h-0 flex-1 flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Simple graph (hard-coded triples)
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Demo only — Turtle is inlined in the app bundle, not loaded from the API.
            </p>
          </div>
          <Link
            to="/"
            className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative z-0 flex min-h-[min(70vh,900px)] min-w-0 flex-1 flex-col lg:min-h-0">
          <KnowledgeForceGraph
            className="flex min-h-0 flex-1 flex-col"
            graphData={graphData}
            graphReady
            onNodeClick={setSelected}
          />
        </div>
        <aside className="relative z-10 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 lg:border-l lg:border-t-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Selected node
          </h2>
          {!selected ? (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Click a card on the graph.</p>
          ) : (
            <dl className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <dt className="font-medium text-slate-500">Name</dt>
                <dd className="break-words">{selected.name}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Kind</dt>
                <dd>{selected.kind}</dd>
              </div>
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}
