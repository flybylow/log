import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { ClearGraphButton } from "./ClearGraphButton";
import { renderTextWithLinks } from "./linkify";
import { SendEventPanel } from "./SendEventPanel";
import { TimelineWidget } from "./TimelineWidget";
import { useGraphData } from "./useGraphData";
import { GraphNode } from "./GraphNodes";

import type { Node } from "@xyflow/react";
import type { FlowNodeData } from "./graphLayout";

function AutoFitView({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 280 });
    }, 60);
    return () => window.clearTimeout(id);
  }, [nodeCount, fitView]);
  return null;
}

const nodeTypes = { graph: GraphNode };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function DashboardInner() {
  const { nodes, edges, status, timelineEvents, error, loading, reload } = useGraphData();
  const [selected, setSelected] = useState<Node<FlowNodeData> | null>(null);

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node<FlowNodeData>) => {
      setSelected(node);
    },
    []
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
      labelStyle: { fill: "#64748b", fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.95 },
      labelBgPadding: [4, 4] as [number, number],
    }),
    []
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          log.tabulas.eu
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Horizontal timeline (older left → newer right); details stack vertically per step.{" "}
          <span className="text-slate-500">Click a timeline row or “Event details” for a single-event view.</span>
        </p>
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

      <SendEventPanel onSent={() => void reload()} />

      <div className="flex min-h-[420px] flex-1 flex-col lg:min-h-[480px] lg:flex-row">
        <div className="relative min-h-[360px] w-full flex-1 lg:min-h-0">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.5}
            defaultEdgeOptions={defaultEdgeOptions}
            proOptions={{ hideAttribution: true }}
          >
            <AutoFitView nodeCount={nodes.length} />
            <Background gap={20} size={1} color="#e2e8f0" />
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-slate-100/90 dark:!bg-slate-900/90"
            />
          </ReactFlow>
        </div>
        <TimelineWidget events={timelineEvents} loading={loading} />
      </div>

      {selected && (
        <aside className="border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Node details
          </h2>
          <dl className="mt-2 grid max-h-40 grid-cols-[auto_1fr] gap-x-3 gap-y-1 overflow-auto text-xs text-slate-700 dark:text-slate-300">
            <dt className="font-medium text-slate-500">Label</dt>
            <dd>{renderTextWithLinks(selected.data.label)}</dd>
            <dt className="font-medium text-slate-500">Kind</dt>
            <dd>{selected.data.kind}</dd>
            {selected.data.literals &&
              Object.entries(selected.data.literals).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-medium text-slate-500">{k}</dt>
                  <dd className="break-all">{renderTextWithLinks(v)}</dd>
                </div>
              ))}
          </dl>
        </aside>
      )}

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

export function DashboardPage() {
  return (
    <ReactFlowProvider>
      <DashboardInner />
    </ReactFlowProvider>
  );
}
