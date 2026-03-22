import ForceGraph2D from "react-force-graph-2d";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  addTimelineOrderLinksOnly,
  applyTimelineLayout,
  basicGraphDiscRadiusGraph,
  BASIC_GRAPH_NODE_REL_SIZE,
  BASIC_GRAPH_NODE_VAL,
  expandTimelineScopedNodes,
  type KnowledgeGraphNode,
} from "./forceGraphData";

const KIND_COLOR: Record<KnowledgeGraphNode["kind"], string> = {
  event: "#c4b5fd",
  product: "#38bdf8",
  location: "#4ade80",
  actor: "#fb923c",
  hash: "#cbd5e1",
  other: "#e2e8f0",
};

function readInitialCanvasDims(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1600, height: 1000 };
  return {
    width: Math.max(480, Math.floor(window.innerWidth * 0.92)),
    height: Math.max(480, Math.floor(window.innerHeight * 0.72)),
  };
}

export type KnowledgeForceGraphProps = {
  graphData: {
    nodes: KnowledgeGraphNode[];
    links: Array<{ source: string; target: string; name?: string }>;
  };
  graphReady?: boolean;
  onNodeClick?: (node: KnowledgeGraphNode) => void;
  className?: string;
};

type GraphTheme = "light" | "dark";

const THEME: Record<GraphTheme, { canvas: string; link: string }> = {
  light: {
    canvas: "#e2e8f0",
    link: "#64748b",
  },
  dark: {
    canvas: "#0f172a",
    link: "#94a3b8",
  },
};

function useColorScheme(): GraphTheme {
  const [scheme, setScheme] = useState<GraphTheme>(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setScheme(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return scheme;
}

/**
 * RDF graph: scoped per-event “sister” nodes, columns by event time, schema edges within each column.
 */
export function KnowledgeForceGraph({
  graphData,
  graphReady = true,
  onNodeClick,
  className,
}: KnowledgeForceGraphProps) {
  const colorScheme = useColorScheme();
  const palette = useMemo(() => THEME[colorScheme], [colorScheme]);
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
  const nodesLiveRef = useRef<KnowledgeGraphNode[]>([]);
  const [dims, setDims] = useState(readInitialCanvasDims);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      setDims({
        width: Math.max(320, w || el.clientWidth),
        height: Math.max(320, h || el.clientHeight),
      });
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const data = useMemo(() => {
    const rawNodes = graphData.nodes.map((n) => ({ ...n }));
    const rawLinks = graphData.links.map((l) => ({ ...l }));
    const { nodes: scoped, links: scopedLinks } = expandTimelineScopedNodes(rawNodes, rawLinks);
    const { nodes: withOrder, links: withOrderLinks } = addTimelineOrderLinksOnly(scoped, scopedLinks);
    const nodes = applyTimelineLayout(withOrder, withOrderLinks);
    return { nodes, links: withOrderLinks };
  }, [graphData]);

  useEffect(() => {
    nodesLiveRef.current = data.nodes;
  }, [data.nodes]);

  const zoomFit = useCallback(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const bbox = fg.getGraphBbox();
    if (
      !bbox ||
      !Number.isFinite(bbox.x[0]) ||
      !Number.isFinite(bbox.x[1]) ||
      !Number.isFinite(bbox.y[0]) ||
      !Number.isFinite(bbox.y[1])
    ) {
      return;
    }
    fg.zoomToFit(400, 56);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => zoomFit());
    });
    return () => cancelAnimationFrame(id);
  }, [dims.width, dims.height, data.nodes.length, data.links.length, zoomFit]);

  useEffect(() => {
    zoomFit();
  }, [colorScheme, zoomFit]);

  const onEngineStop = useCallback(() => {
    const fg = fgRef.current;
    if (!fg || data.nodes.length === 0) return;
    fg.d3Force("link", null);
    fg.d3Force("charge", null);
    fg.d3Force("center", null);
    fg.d3Force("dagRadial", null);
    zoomFit();
  }, [data.nodes.length, zoomFit]);

  const linkVisibility = useCallback(() => true, []);
  const linkColor = useCallback(
    (link: object) => {
      const name = (link as { name?: string }).name;
      if (name === "timelineOrder") {
        return colorScheme === "dark" ? "#475569" : "#94a3b8";
      }
      return palette.link;
    },
    [colorScheme, palette.link]
  );
  const linkPointerAreaPaint = useCallback(() => {}, []);

  const nodeColor = useCallback(
    (n: object) => KIND_COLOR[(n as KnowledgeGraphNode).kind] ?? KIND_COLOR.other,
    []
  );

  const nodeVal = useCallback(() => BASIC_GRAPH_NODE_VAL, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      onNodeClick?.(node as KnowledgeGraphNode);
    },
    [onNodeClick]
  );

  const handleBackgroundClick = useCallback(
    (ev: MouseEvent) => {
      if (!onNodeClick || !containerRef.current || !fgRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const g = fgRef.current.screen2GraphCoords(sx, sy);
      const rDisc = basicGraphDiscRadiusGraph();
      let best: KnowledgeGraphNode | null = null;
      let bestD = Infinity;
      for (const n of nodesLiveRef.current) {
        const nx = n.x ?? n.fx;
        const ny = n.y ?? n.fy;
        if (nx === undefined || ny === undefined) continue;
        const d = Math.hypot(nx - g.x, ny - g.y);
        if (d <= rDisc * 1.1 && d < bestD) {
          bestD = d;
          best = n;
        }
      }
      if (best) onNodeClick(best);
    },
    [onNodeClick]
  );

  if (graphData.nodes.length === 0) {
    const emptyBox =
      className ??
      "flex h-full min-h-0 w-full min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400";
    if (!graphReady) {
      return (
        <div className={emptyBox} aria-busy="true" aria-live="polite">
          Loading graph…
        </div>
      );
    }
    return <div className={emptyBox}>No graph data yet.</div>;
  }

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "relative z-0 flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 ring-1 ring-slate-200/90 dark:bg-slate-900 dark:ring-slate-700"
      }
    >
      <ForceGraph2D
        ref={fgRef}
        width={dims.width}
        height={dims.height}
        graphData={data}
        nodeId="id"
        nodeLabel={(n) => (n as KnowledgeGraphNode).name}
        nodeVal={nodeVal}
        nodeRelSize={BASIC_GRAPH_NODE_REL_SIZE}
        nodeAutoColorBy={null}
        nodeColor={nodeColor}
        linkVisibility={linkVisibility}
        linkColor={linkColor}
        linkWidth={2}
        linkDirectionalArrowLength={0}
        linkPointerAreaPaint={linkPointerAreaPaint}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        enableNodeDrag={false}
        warmupTicks={0}
        cooldownTicks={0}
        onEngineStop={onEngineStop}
        backgroundColor={palette.canvas}
      />
    </div>
  );
}
