import { useCallback, useEffect, useRef, useState } from "react";
import { CheckSidePanel } from "./CheckSidePanel";
import { ClearGraphButton } from "./ClearGraphButton";
import { canonicalNodeId, type KnowledgeGraphNode } from "./forceGraphData";
import { KnowledgeForceGraph } from "./KnowledgeForceGraph";
import { SendEventPanel } from "./SendEventPanel";
import { useGraphData } from "./useGraphData";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DashboardPage() {
  const { graphData, status, timelineEvents, error, loading, graphReady, reload } = useGraphData();
  const [selected, setSelected] = useState<KnowledgeGraphNode | null>(null);
  const [sendFormOpen, setSendFormOpen] = useState(false);
  const prevSendOpen = useRef(false);

  const onNodeClick = useCallback((node: KnowledgeGraphNode) => {
    setSelected(node);
  }, []);

  /** Keep Node details in sync with latest /graph parse (poll + Refresh); avoid stale labels forever. */
  useEffect(() => {
    setSelected((prev) => {
      if (!prev) return null;
      if (graphData.nodes.length === 0) return null;
      const fresh = graphData.nodes.find(
        (n) => n.id === prev.id || n.id === canonicalNodeId(prev.id)
      );
      if (!fresh) return null;
      // Timeline graph uses scoped ids (`uri` + sep + `eventId`); keep column context for details.
      if (prev.id !== fresh.id) {
        return {
          ...fresh,
          id: prev.id,
          timelineOwnerEventId: prev.timelineOwnerEventId,
        };
      }
      return fresh;
    });
  }, [graphData]);

  useEffect(() => {
    if (sendFormOpen && !prevSendOpen.current) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("send-epcis-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    prevSendOpen.current = sendFormOpen;
  }, [sendFormOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="bg-white px-4 py-4 dark:bg-slate-900">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          log.tabulas.eu
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
          {loading && <span className="text-slate-500">Loading…</span>}
          {status && (
            <>
              <span>
                <strong className="font-medium text-slate-900 dark:text-slate-100">
                  {status.eventCount}
                </strong>{" "}
                events
              </span>
              <span className="text-slate-400">|</span>
              <span>Graph: {formatBytes(status.graphSizeBytes)}</span>
              <span className="text-slate-400">|</span>
              <span>IOTA: {status.iotaNetwork ?? "—"}</span>
            </>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSendFormOpen((o) => !o)}
              aria-expanded={sendFormOpen}
              aria-controls="sync-section"
              className="rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              {sendFormOpen ? "Hide send form" : "Send"}
            </button>
            <ClearGraphButton
              enabled={Boolean(status?.graphResetEnabled)}
              onCleared={() => void reload()}
            />
            <button
              type="button"
              onClick={() => void reload()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </header>

      <section
        id="sync-section"
        aria-labelledby="sync-heading"
        className="shrink-0 bg-white dark:bg-slate-900"
      >
        <div className="px-4 py-3">
          <h2
            id="sync-heading"
            className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50"
          >
            1. Sync
          </h2>
        </div>
        <div
          className={sendFormOpen ? "block" : "hidden"}
          aria-hidden={!sendFormOpen}
        >
          <SendEventPanel
            embedded
            onSent={() => {
              void reload();
            }}
          />
        </div>
      </section>

      <section
        id="check-section"
        aria-labelledby="check-heading"
        className="flex min-h-0 flex-1 flex-col bg-slate-50/30 dark:bg-slate-950/30"
      >
        <div className="shrink-0 bg-white px-4 py-2.5 dark:bg-slate-900">
          <h2
            id="check-heading"
            className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50"
          >
            2. Check
          </h2>
        </div>
        <div className="isolate grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(200px,auto)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:grid-rows-1">
          <div className="relative z-0 flex min-h-[min(58vh,920px)] min-w-0 flex-1 flex-col lg:min-h-0">
            <KnowledgeForceGraph
              className="flex min-h-0 flex-1 flex-col"
              graphData={graphData}
              graphReady={graphReady}
              onNodeClick={onNodeClick}
            />
          </div>
          <div className="relative z-10 flex h-full min-h-0 min-w-0">
            <CheckSidePanel
              timelineEvents={timelineEvents}
              loading={loading}
              selected={selected}
              graphData={graphData}
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          User-facing app:{" "}
          <a
            href="https://aiactscan.eu/"
            className="font-medium text-emerald-700 underline dark:text-emerald-400"
          >
            aiactscan.eu
          </a>
          {" · "}
          RDF source: <code className="text-[11px]">GET /graph</code> (Turtle)
        </p>
      </footer>
    </div>
  );
}
