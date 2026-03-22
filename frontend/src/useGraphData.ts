import { useCallback, useEffect, useState } from "react";
import type { Edge, Node } from "@xyflow/react";
import { buildFlowElements, type FlowNodeData } from "./graphLayout";
import { parseTurtleToGraph } from "./parseTurtle";
import type { TimelineEntry } from "./types/timeline";

const POLL_MS = 30_000;

type StatusPayload = {
  eventCount: number;
  graphSizeBytes: number;
  iotaNetwork?: string;
  lastNotarization?: string | null;
  graphResetEnabled?: boolean;
};

export function useGraphData() {
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [graphRes, statusRes, timelineRes] = await Promise.all([
        fetch("/graph", { cache: "no-store" }),
        fetch("/status", { cache: "no-store" }),
        fetch("/api/timeline", { cache: "no-store" }),
      ]);
      if (!graphRes.ok) throw new Error(`GET /graph ${graphRes.status}`);
      if (!statusRes.ok) throw new Error(`GET /status ${statusRes.status}`);
      if (!timelineRes.ok) {
        throw new Error(`GET /api/timeline ${timelineRes.status}`);
      }
      const ttl = await graphRes.text();
      const st = (await statusRes.json()) as StatusPayload;
      const tl = (await timelineRes.json()) as { events: TimelineEntry[] };
      setStatus(st);
      setTimelineEvents(tl.events ?? []);

      const { entities, edges: ge, eventSubjects } = parseTurtleToGraph(ttl);
      const { nodes: n, edges: e } = buildFlowElements(entities, ge, eventSubjects);
      const flowNodes = n.map((node) => ({
        ...node,
        type: "graph",
      }));
      setNodes(flowNodes);
      setEdges(e);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return {
    nodes,
    edges,
    status,
    timelineEvents,
    error,
    loading,
    reload: load,
  };
}
