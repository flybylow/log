import { useCallback, useEffect, useState } from "react";
import { buildForceGraphData } from "./forceGraphData";
import type { KnowledgeGraphNode } from "./forceGraphData";
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

export type GraphPayload = {
  nodes: KnowledgeGraphNode[];
  links: Array<{ source: string; target: string; name?: string }>;
};

export function useGraphData() {
  const [graphData, setGraphData] = useState<GraphPayload>({ nodes: [], links: [] });
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** False until the first `load()` finishes (success or error). Avoids “No graph data yet” before GET /graph returns. */
  const [graphReady, setGraphReady] = useState(false);

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
      setGraphData(buildForceGraphData(entities, ge, eventSubjects));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setGraphReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  return {
    graphData,
    status,
    timelineEvents,
    error,
    loading,
    graphReady,
    reload: load,
  };
}
