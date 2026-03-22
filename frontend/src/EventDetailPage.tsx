import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { buildFlowElements } from "./graphLayout";
import { GraphNode } from "./GraphNodes";
import { parseTurtleToGraph } from "./parseTurtle";
import { renderTextWithLinks } from "./linkify";
import { findEventUriBySha256 } from "./eventLookup";
import type { Edge, Node } from "@xyflow/react";
import type { FlowNodeData } from "./graphLayout";
import type { TimelineEntry } from "./types/timeline";

const nodeTypes = { graph: GraphNode };

const HASH_RE = /^[a-f0-9]{64}$/i;

function AutoFitView({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const id = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 280 });
    }, 80);
    return () => window.clearTimeout(id);
  }, [nodeCount, fitView]);
  return null;
}

function EventDetailInner() {
  const { hash } = useParams<{ hash: string }>();
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [entry, setEntry] = useState<TimelineEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [resolvedEventUri, setResolvedEventUri] = useState<string | null>(null);
  const [selected, setSelected] = useState<Node<FlowNodeData> | null>(null);

  const validHash = hash && HASH_RE.test(hash);
  const hashLower = hash?.toLowerCase() ?? "";

  useEffect(() => {
    if (!hash || !validHash) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setError(null);
        setNotFound(false);
        const [graphRes, timelineRes] = await Promise.all([
          fetch("/graph", { cache: "no-store" }),
          fetch("/api/timeline", { cache: "no-store" }),
        ]);
        if (!graphRes.ok) throw new Error(`GET /graph ${graphRes.status}`);
        if (!timelineRes.ok) throw new Error(`GET /api/timeline ${timelineRes.status}`);
        const ttl = await graphRes.text();
        const tl = (await timelineRes.json()) as { events: TimelineEntry[] };
        const list = tl.events ?? [];
        const ev = list.find((e) => e.hash.toLowerCase() === hashLower);
        setEntry(ev ?? null);

        const eventUri =
          ev?.eventUri ?? findEventUriBySha256(ttl, hashLower);
        if (!cancelled) setResolvedEventUri(eventUri ?? null);
        if (!eventUri) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const { entities, edges: ge, eventSubjects } = parseTurtleToGraph(ttl);
        if (!eventSubjects.includes(eventUri)) {
          if (!cancelled) setNotFound(true);
          return;
        }

        const { nodes: n, edges: e } = buildFlowElements(entities, ge, [eventUri]);
        const flowNodes = n.map((node) => ({ ...node, type: "graph" as const }));
        if (!cancelled) {
          setNodes(flowNodes);
          setEdges(e);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hash, validHash]);

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

  if (!validHash) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Invalid event id (expected 64-character SHA-256 hex).</p>
        <Link to="/" className="mt-2 inline-block text-sm text-emerald-700 underline">
          ← Back to overview
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/"
            className="text-sm font-medium text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400"
          >
            ← Overview
          </Link>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Event details</h1>
        </div>
        {loading && <p className="mt-2 text-sm text-slate-500">Loading…</p>}
        {notFound && !loading && (
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            No event found for this hash. It may have been cleared or the id is wrong.
          </p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {entry && !loading && !notFound && (
          <dl className="mt-3 grid max-w-2xl grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs text-slate-700 dark:text-slate-300">
            <dt className="font-medium text-slate-500">bizStep</dt>
            <dd>{entry.bizStep ?? "—"}</dd>
            <dt className="font-medium text-slate-500">Type</dt>
            <dd>{entry.type}</dd>
            <dt className="font-medium text-slate-500">eventTime</dt>
            <dd>{entry.eventTime}</dd>
            <dt className="font-medium text-slate-500">Classification</dt>
            <dd>{entry.classification}</dd>
            <dt className="font-medium text-slate-500">SHA-256</dt>
            <dd className="break-all font-mono text-[11px]">{entry.hash}</dd>
            <dt className="font-medium text-slate-500">Event URI</dt>
            <dd className="break-all font-mono text-[11px]">{entry.eventUri}</dd>
          </dl>
        )}
        {!entry && resolvedEventUri && !loading && !notFound && (
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-500">Event URI: </span>
            <code className="break-all font-mono text-[11px]">{resolvedEventUri}</code>
          </p>
        )}
      </header>

      {!notFound && nodes.length > 0 && (
        <div className="relative min-h-[420px] w-full flex-1">
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
      )}

      {selected && (
        <aside className="border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Node details</h2>
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
    </div>
  );
}

export function EventDetailPage() {
  return (
    <ReactFlowProvider>
      <EventDetailInner />
    </ReactFlowProvider>
  );
}
