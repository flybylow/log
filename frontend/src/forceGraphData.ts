import type { ParsedGraphEdge, ParsedGraphEntity } from "./parseTurtle";

export type KnowledgeGraphNode = {
  id: string;
  /** Short label on the node */
  name: string;
  kind: ParsedGraphEntity["kind"];
  subtitle?: string;
  literals?: Record<string, string>;
  uri?: string;
  /** Event nodes: hex for /event/:hash */
  eventHashHex?: string;
  /**
   * Timeline layout: which event column this card belongs to (set when a resource is scoped per event).
   * Matches DPP schema edges from `parseTurtle` (event → product/location/hash/…; actor → event).
   */
  timelineOwnerEventId?: string;
  /** Visual weight for force layout */
  val: number;
  /** Set by force-graph simulation (pointer hit-test / zoomToFit) */
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number;
  fy?: number;
  fz?: number;
};

function sha256HexForEvent(
  eventUri: string,
  graphEdges: ParsedGraphEdge[],
  entities: Map<string, ParsedGraphEntity>
): string | undefined {
  const edge = graphEdges.find((g) => g.source === eventUri && g.label === "sha256");
  if (!edge) return undefined;
  return entities.get(edge.target)?.literals?.sha256;
}

function toKnowledgeNode(
  id: string,
  e: ParsedGraphEntity,
  graphEdges: ParsedGraphEdge[],
  entities: Map<string, ParsedGraphEntity>
): KnowledgeGraphNode {
  const eventHashHex =
    e.kind === "event" ? sha256HexForEvent(id, graphEdges, entities) : undefined;
  const resourceUri =
    e.uri && (e.uri.startsWith("http://") || e.uri.startsWith("https://")) ? e.uri : undefined;
  return {
    id,
    name: e.label,
    kind: e.kind,
    subtitle:
      e.kind === "event" && e.literals.eventTime ? e.literals.eventTime : undefined,
    literals: e.literals,
    uri: resourceUri,
    eventHashHex,
    val: e.kind === "event" ? 6 : e.kind === "hash" ? 2 : 4,
  };
}

/** Full graph: all nodes referenced by edges or listed as events. */
export function buildForceGraphData(
  entities: Map<string, ParsedGraphEntity>,
  graphEdges: ParsedGraphEdge[],
  eventSubjects: string[]
): { nodes: KnowledgeGraphNode[]; links: Array<{ source: string; target: string; name?: string }> } {
  const nodeIds = new Set<string>();
  for (const id of eventSubjects) nodeIds.add(id);
  for (const ge of graphEdges) {
    nodeIds.add(ge.source);
    nodeIds.add(ge.target);
  }

  const nodes: KnowledgeGraphNode[] = [];
  for (const id of nodeIds) {
    const e = entities.get(id);
    if (!e) continue;
    nodes.push(toKnowledgeNode(id, e, graphEdges, entities));
  }

  const links = graphEdges
    .filter((ge) => nodeIds.has(ge.source) && nodeIds.has(ge.target))
    .map((ge) => ({
      source: ge.source,
      target: ge.target,
      name: ge.label,
    }));

  return { nodes, links };
}

/** Single-event subgraph: same hops as the old column layout (event + direct neighbors). */
export function buildForceGraphDataForEvent(
  entities: Map<string, ParsedGraphEntity>,
  graphEdges: ParsedGraphEdge[],
  eventUri: string
): { nodes: KnowledgeGraphNode[]; links: Array<{ source: string; target: string; name?: string }> } {
  const nodeIds = new Set<string>([eventUri]);
  for (const ge of graphEdges) {
    if (ge.source === eventUri) nodeIds.add(ge.target);
    if (ge.target === eventUri) nodeIds.add(ge.source);
  }

  const nodes: KnowledgeGraphNode[] = [];
  for (const id of nodeIds) {
    const e = entities.get(id);
    if (!e) continue;
    nodes.push(toKnowledgeNode(id, e, graphEdges, entities));
  }

  const links = graphEdges
    .filter((ge) => nodeIds.has(ge.source) && nodeIds.has(ge.target))
    .map((ge) => ({
      source: ge.source,
      target: ge.target,
      name: ge.label,
    }));

  return { nodes, links };
}

/** Horizontal spacing between event columns (graph units). */
const TIMELINE_COL_GAP = 56;
/** Vertical spacing between stacked cards in one column. */
const TIMELINE_ROW_GAP = 24;

/** Synthetic node: shared anchor for event → time links in the graph UI. */
export const TIMELINE_TIME_NODE_ID = "__dpp:timeline-time__";

const KIND_STACK_ORDER: Record<string, number> = {
  event: 0,
  product: 1,
  actor: 2,
  location: 3,
  hash: 4,
  other: 5,
};

/** Graph space between columns/rows — smaller = nodes closer (simple graph layout). */
const SIMPLE_GRID_COL = 88;
const SIMPLE_GRID_ROW = 54;

/** Must match `KnowledgeForceGraph` `nodeRelSize` / `nodeVal` (disc radius = √val × relSize). */
export const BASIC_GRAPH_NODE_REL_SIZE = 5;
export const BASIC_GRAPH_NODE_VAL = 1;

export function basicGraphDiscRadiusGraph(): number {
  return Math.sqrt(Math.max(0, BASIC_GRAPH_NODE_VAL)) * BASIC_GRAPH_NODE_REL_SIZE;
}

/**
 * Fixed grid in graph space for the simple “white box + wires” view: no timeline columns,
 * no synthetic Time node. Keeps `expandTimelineScopedNodes` so shared URIs stay distinct.
 */
export function applySimpleGridLayout(nodes: KnowledgeGraphNode[]): KnowledgeGraphNode[] {
  if (nodes.length === 0) return [];
  const sorted = [...nodes].sort((a, b) => {
    const o = (KIND_STACK_ORDER[a.kind] ?? 99) - (KIND_STACK_ORDER[b.kind] ?? 99);
    if (o !== 0) return o;
    return a.name.localeCompare(b.name);
  });
  const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length * 1.35)));
  return sorted.map((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * SIMPLE_GRID_COL;
    const y = row * SIMPLE_GRID_ROW;
    return {
      ...node,
      x,
      y,
      fx: x,
      fy: y,
      vx: 0,
      vy: 0,
      vz: 0,
    };
  });
}

/**
 * Sort key for lifecycle events. `formatTime` in the parser uses a space instead of `T`, which
 * `Date.parse` often rejects — without this, many events get 0 and sort alphabetically ("mixed").
 */
function parseEventTimeMs(n: KnowledgeGraphNode): number {
  const fromRaw = tryParseEventTimeString(n.literals?.eventTime ?? n.subtitle ?? "");
  if (fromRaw !== null) return fromRaw;
  const fromLabel = tryParseEventTimeFromDisplayName(n.name);
  if (fromLabel !== null) return fromLabel;
  return 0;
}

function tryParseEventTimeString(s: string): number | null {
  if (!s?.trim()) return null;
  const t = s.trim();
  let ms = Date.parse(t);
  if (Number.isFinite(ms)) return ms;
  // ISO with space between date and time (common in Turtle / display)
  const withT = t.includes("T") ? t : t.replace(/^(\d{4}-\d{2}-\d{2}) (\d)/, "$1T$2");
  ms = Date.parse(withT);
  if (Number.isFinite(ms)) return ms;
  return null;
}

/** Label shape: `bizStep · 2026-01-01 08:00Z` (from `parseTurtle` / `formatTime`). */
function tryParseEventTimeFromDisplayName(name: string): number | null {
  const m = name.match(/·\s*(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)\s*Z?/i);
  if (!m) return null;
  const iso = `${m[1]}T${m[2]}Z`;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function disambiguateDuplicateEventLinkNames(
  rows: LinkedResourceRow[],
  byId: Map<string, KnowledgeGraphNode>
): void {
  const evRows = rows.filter(
    (r) => r.predicateKey === "in_event" || r.predicateKey === "out_event"
  );
  const byName = new Map<string, LinkedResourceRow[]>();
  for (const r of evRows) {
    const list = byName.get(r.name) ?? [];
    list.push(r);
    byName.set(r.name, list);
  }
  for (const list of byName.values()) {
    if (list.length <= 1) continue;
    for (const r of list) {
      const ev = byId.get(r.neighborId);
      const hx = ev?.eventHashHex;
      if (hx) {
        // First 8 hex can collide across events; include tail of hash when multiple rows share a label.
        r.name = `${r.name} · ${hx.slice(0, 8)}…${hx.slice(-6)}`;
      } else {
        const id = r.neighborId;
        const tail = id.length > 24 ? `…${id.slice(-20)}` : id;
        r.name = `${r.name} · ${tail}`;
      }
    }
  }
}

/** DPP predicates where the subject is the event resource (`parseTurtle` / `triplesToGraph`). */
const SCHEMA_EDGE_FROM_EVENT = new Set([
  "product",
  "inputProduct",
  "outputProduct",
  "readPoint",
  "bizLocation",
  "sha256",
  "iotaDigest",
]);

function linkEndpointId(s: unknown): string {
  return typeof s === "object" && s !== null && "id" in s ? (s as { id: string }).id : String(s);
}

function schemaEdgeEventAndOther(
  l: { source: unknown; target: unknown; name?: string },
  eventIds: Set<string>
): { eventId: string; otherId: string } | null {
  const s = linkEndpointId(l.source);
  const t = linkEndpointId(l.target);
  const name = l.name ?? "";
  if (SCHEMA_EDGE_FROM_EVENT.has(name) && eventIds.has(s)) return { eventId: s, otherId: t };
  if (name === "actor" && eventIds.has(t)) return { eventId: t, otherId: s };
  return null;
}

/** Events directly related to this node via one DPP schema edge (same rules as Turtle). */
function directEventIdsForNode(
  nodeId: string,
  eventIds: Set<string>,
  links: Array<{ source: string; target: string; name?: string }>
): string[] {
  if (eventIds.has(nodeId)) return [nodeId];
  const out = new Set<string>();
  for (const l of links) {
    const r = schemaEdgeEventAndOther(l, eventIds);
    if (r && r.otherId === nodeId) out.add(r.eventId);
  }
  return [...out];
}

const SCOPED_ID_SEP = "\x1f";

/**
 * Strips timeline-scoped clone suffix (`baseId` + unit separator + `eventId`) so lookups match raw
 * `/graph` node ids (the graph UI may pass scoped ids; Turtle links use canonical URIs only).
 */
export function canonicalNodeId(id: string): string {
  const i = id.indexOf(SCOPED_ID_SEP);
  return i === -1 ? id : id.slice(0, i);
}

const PREDICATE_DETAIL_LABEL: Record<string, string> = {
  product: "Product",
  inputProduct: "Input product",
  outputProduct: "Output product",
  readPoint: "Read point",
  bizLocation: "Location",
  sha256: "SHA-256",
  iotaDigest: "IOTA digest",
  actor: "Actor",
};

function detailLabelForPredicate(predicate: string): string {
  return PREDICATE_DETAIL_LABEL[predicate] ?? predicate;
}

export type LinkedResourceRow = {
  predicateKey: string;
  label: string;
  name: string;
  neighborId: string;
};

/** Stable key so `links` endpoints match `nodes[].id` even when Turtle uses URI variants. */
function normalizeGraphUri(id: string): string {
  const s = id.trim();
  if (!s) return s;
  try {
    const u = new URL(s);
    u.hash = "";
    const host = u.hostname.toLowerCase();
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${u.protocol}//${host}${path}${u.search}`;
  } catch {
    return s;
  }
}

function graphUriEquals(a: string, b: string): boolean {
  return normalizeGraphUri(a) === normalizeGraphUri(b);
}

function lookupNodeByLinkRef(
  ref: string,
  byId: Map<string, KnowledgeGraphNode>,
  byNorm: Map<string, KnowledgeGraphNode>
): KnowledgeGraphNode | undefined {
  return byId.get(ref) ?? byNorm.get(normalizeGraphUri(ref));
}

/**
 * Neighbor resources connected by DPP edges (location, product, actor, hash, …). Turtle uses
 * object URIs for these — they are not copied into the event’s `literals`, so the side panel must
 * resolve them from `links` + `nodes`.
 */
export function linkedResourceRowsForDetails(
  node: KnowledgeGraphNode,
  nodes: KnowledgeGraphNode[],
  links: Array<{ source: string; target: string; name?: string }>
): LinkedResourceRow[] {
  const self = canonicalNodeId(node.id);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const byNorm = new Map<string, KnowledgeGraphNode>();
  for (const n of nodes) {
    byNorm.set(normalizeGraphUri(n.id), n);
  }
  const rows: LinkedResourceRow[] = [];
  const seen = new Set<string>();

  for (const l of links) {
    const name = l.name ?? "";
    if (!name || name === "timelineOrder") continue;

    const src = String(l.source);
    const tgt = String(l.target);

    if (graphUriEquals(src, self)) {
      const neighbor = lookupNodeByLinkRef(tgt, byId, byNorm);
      if (!neighbor) continue;
      // Dedupe on canonical node id (duplicate Turtle edges may use slightly different ref strings).
      const key = `out:${name}:${neighbor.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Edge is named `actor` but the *object* is the event — label the row as Event, not Actor.
      const isActorToEvent = name === "actor" && neighbor.kind === "event";
      rows.push({
        predicateKey: isActorToEvent ? "out_event" : name,
        label: isActorToEvent ? "Event" : detailLabelForPredicate(name),
        name: neighbor.name,
        neighborId: neighbor.id,
      });
      continue;
    }
    if (graphUriEquals(tgt, self) && name === "actor") {
      const neighbor = lookupNodeByLinkRef(src, byId, byNorm);
      if (!neighbor) continue;
      const key = `actor:${neighbor.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        predicateKey: "actor",
        label: "Actor",
        name: neighbor.name,
        neighborId: neighbor.id,
      });
      continue;
    }
    if (graphUriEquals(tgt, self) && SCHEMA_EDGE_FROM_EVENT.has(name)) {
      const neighbor = lookupNodeByLinkRef(src, byId, byNorm);
      if (!neighbor || neighbor.kind !== "event") continue;
      // One row per event: same event may link via product + inputProduct + duplicate triples.
      const key = `in_evt:${neighbor.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        predicateKey: "in_event",
        label: "Event",
        name: neighbor.name,
        neighborId: neighbor.id,
      });
    }
  }

  const deduped = dedupeEventLinkRowsByNeighborId(rows);
  // Timeline UI: each card is scoped to one event — don’t list every lifecycle event for the URI.
  let forDetails = deduped;
  if (node.timelineOwnerEventId) {
    const ev = node.timelineOwnerEventId;
    forDetails = deduped.filter((r) => {
      if (r.predicateKey !== "in_event" && r.predicateKey !== "out_event") return true;
      return graphUriEquals(r.neighborId, ev);
    });
  }

  const order = [
    "bizLocation",
    "readPoint",
    "product",
    "inputProduct",
    "outputProduct",
    "out_event",
    "actor",
    "in_event",
    "sha256",
    "iotaDigest",
  ];
  forDetails.sort((a, b) => {
    const ia = order.indexOf(a.predicateKey);
    const ib = order.indexOf(b.predicateKey);
    const va = ia === -1 ? 999 : ia;
    const vb = ib === -1 ? 999 : ib;
    if (va !== vb) return va - vb;
    const aEv = a.predicateKey === "in_event" || a.predicateKey === "out_event";
    const bEv = b.predicateKey === "in_event" || b.predicateKey === "out_event";
    if (aEv && bEv) {
      const ta = parseEventTimeMs(byId.get(a.neighborId)!);
      const tb = parseEventTimeMs(byId.get(b.neighborId)!);
      if (ta !== tb) return ta - tb;
      return a.neighborId.localeCompare(b.neighborId);
    }
    return a.name.localeCompare(b.name);
  });

  disambiguateDuplicateEventLinkNames(forDetails, byId);
  return forDetails;
}

function dedupeEventLinkRowsByNeighborId(rows: LinkedResourceRow[]): LinkedResourceRow[] {
  const seen = new Set<string>();
  const out: LinkedResourceRow[] = [];
  for (const r of rows) {
    if (r.predicateKey !== "out_event" && r.predicateKey !== "in_event") {
      out.push(r);
      continue;
    }
    const k = `${r.predicateKey}:${r.neighborId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

function scopedNodeId(baseId: string, eventId: string): string {
  return `${baseId}${SCOPED_ID_SEP}${eventId}`;
}

/**
 * Clone nodes that participate in multiple events (same product URI, actor, location, …) so each
 * event column has its own card, wired only to that event — matches DPP schema connectivity.
 */
export function expandTimelineScopedNodes(
  nodes: KnowledgeGraphNode[],
  links: Array<{ source: string; target: string; name?: string }>
): { nodes: KnowledgeGraphNode[]; links: Array<{ source: string; target: string; name?: string }> } {
  const eventIds = new Set(nodes.filter((n) => n.kind === "event").map((n) => n.id));
  const duplicateMap = new Map<string, Map<string, string>>();

  const outNodes: KnowledgeGraphNode[] = [];

  for (const n of nodes) {
    if (n.kind === "event") {
      outNodes.push({ ...n, timelineOwnerEventId: n.id });
      continue;
    }
    const evs = directEventIdsForNode(n.id, eventIds, links);
    if (evs.length === 0) {
      outNodes.push({ ...n });
      continue;
    }
    if (evs.length === 1) {
      outNodes.push({ ...n, timelineOwnerEventId: evs[0] });
      continue;
    }
    const m = new Map<string, string>();
    duplicateMap.set(n.id, m);
    for (const e of evs) {
      const nid = scopedNodeId(n.id, e);
      m.set(e, nid);
      outNodes.push({ ...n, id: nid, timelineOwnerEventId: e });
    }
  }

  const linksOut: Array<{ source: string; target: string; name?: string }> = [];
  for (const l of links) {
    const r = schemaEdgeEventAndOther(l, eventIds);
    if (!r) {
      linksOut.push({ ...l });
      continue;
    }
    const { eventId, otherId } = r;
    const dm = duplicateMap.get(otherId);
    const other = dm?.get(eventId) ?? otherId;
    if (l.name === "actor") {
      linksOut.push({ source: other, target: eventId, name: l.name });
    } else {
      linksOut.push({ source: eventId, target: other, name: l.name });
    }
  }

  return { nodes: outNodes, links: linksOut };
}

/**
 * UI-only edges: consecutive lifecycle events by `eventTime` (older → newer), so the graph reads
 * left-to-right. Does not add the synthetic Time node (see `addTimelineVisualLinks`).
 */
export function addTimelineOrderLinksOnly(
  nodes: KnowledgeGraphNode[],
  links: Array<{ source: string; target: string; name?: string }>
): { nodes: KnowledgeGraphNode[]; links: Array<{ source: string; target: string; name?: string }> } {
  const evs = [...nodes]
    .filter((n) => n.kind === "event")
    .sort((a, b) => parseEventTimeMs(a) - parseEventTimeMs(b));
  if (evs.length < 2) return { nodes, links };
  const extra: Array<{ source: string; target: string; name?: string }> = [];
  for (let i = 0; i < evs.length - 1; i++) {
    extra.push({
      source: evs[i]!.id,
      target: evs[i + 1]!.id,
      name: "timelineOrder",
    });
  }
  return { nodes, links: [...links, ...extra] };
}

/**
 * Add UI-only links: consecutive events (time order) and each event → shared Time node.
 */
export function addTimelineVisualLinks(
  nodes: KnowledgeGraphNode[],
  links: Array<{ source: string; target: string; name?: string }>
): { nodes: KnowledgeGraphNode[]; links: Array<{ source: string; target: string; name?: string }> } {
  const evs = [...nodes]
    .filter((n) => n.kind === "event")
    .sort((a, b) => parseEventTimeMs(a) - parseEventTimeMs(b));
  if (evs.length === 0) return { nodes, links };

  const extra: Array<{ source: string; target: string; name?: string }> = [];
  for (let i = 0; i < evs.length - 1; i++) {
    extra.push({
      source: evs[i].id,
      target: evs[i + 1].id,
      name: "timelineOrder",
    });
  }

  const timeNode: KnowledgeGraphNode = {
    id: TIMELINE_TIME_NODE_ID,
    name: "Time",
    kind: "other",
    val: 2,
    literals: {},
  };

  for (const e of evs) {
    extra.push({ source: e.id, target: TIMELINE_TIME_NODE_ID, name: "atTime" });
  }

  return {
    nodes: [...nodes, timeNode],
    links: [...links, ...extra],
  };
}

/**
 * Place nodes in columns by event time (older → left, newer → right).
 * Neighbors of an event sit in that event's column; shared URIs use the earliest event by time.
 */
export function applyTimelineLayout(
  nodes: KnowledgeGraphNode[],
  links: Array<{ source: string; target: string; name?: string }>
): KnowledgeGraphNode[] {
  const getId = (s: unknown): string =>
    typeof s === "object" && s !== null && "id" in s ? (s as { id: string }).id : String(s);

  const clean = nodes.map((n) => {
    const { x, y, z, vx, vy, vz, fx, fy, fz, ...rest } = n;
    return { ...rest };
  });

  const layoutNodes = clean.filter((n) => n.id !== TIMELINE_TIME_NODE_ID);

  const sortedEvents = layoutNodes
    .filter((n) => n.kind === "event")
    .sort((a, b) => parseEventTimeMs(a) - parseEventTimeMs(b));

  const colOf = new Map<string, number>();
  sortedEvents.forEach((e, i) => colOf.set(e.id, i));
  const numCols = Math.max(1, sortedEvents.length);

  const primaryEventFor = (node: KnowledgeGraphNode): string | null => {
    if (node.timelineOwnerEventId && colOf.has(node.timelineOwnerEventId)) {
      return node.timelineOwnerEventId;
    }
    const nodeId = node.id;
    if (colOf.has(nodeId)) return nodeId;
    const connected: string[] = [];
    for (const l of links) {
      const name = l.name ?? "";
      if (name === "timelineOrder" || name === "atTime") continue;
      const s = getId(l.source);
      const t = getId(l.target);
      if (s === nodeId && colOf.has(t)) connected.push(t);
      else if (t === nodeId && colOf.has(s)) connected.push(s);
    }
    if (connected.length === 0) return sortedEvents[0]?.id ?? null;
    connected.sort(
      (a, b) =>
        parseEventTimeMs(layoutNodes.find((n) => n.id === a)!) -
        parseEventTimeMs(layoutNodes.find((n) => n.id === b)!)
    );
    return connected[0];
  };

  const byCol = new Map<number, KnowledgeGraphNode[]>();
  for (let i = 0; i < numCols; i++) byCol.set(i, []);

  for (const n of layoutNodes) {
    const pe = primaryEventFor(n);
    const col = pe != null && colOf.has(pe) ? colOf.get(pe)! : 0;
    byCol.get(col)!.push(n);
  }

  for (const list of byCol.values()) {
    list.sort((a, b) => {
      if (a.kind === "event" && b.kind !== "event") return -1;
      if (b.kind === "event" && a.kind !== "event") return 1;
      const o = (KIND_STACK_ORDER[a.kind] ?? 99) - (KIND_STACK_ORDER[b.kind] ?? 99);
      if (o !== 0) return o;
      return a.name.localeCompare(b.name);
    });
  }

  const xBase = (i: number) => (i - (numCols - 1) / 2) * TIMELINE_COL_GAP;
  const out: KnowledgeGraphNode[] = [];

  for (let col = 0; col < numCols; col++) {
    const list = byCol.get(col)!;
    list.forEach((n, row) => {
      const fx = xBase(col);
      const fy = row * TIMELINE_ROW_GAP;
      out.push({
        ...n,
        // `react-force-graph` zoomToFit / getGraphBbox use `x`/`y`, not `fx`/`fy`. Without these,
        // the first zoom can compute NaN and the canvas stays blank until a lucky re-layout.
        x: fx,
        y: fy,
        fx,
        fy,
        fz: 0,
        vx: 0,
        vy: 0,
        vz: 0,
      });
    });
  }

  const timeEntry = clean.find((n) => n.id === TIMELINE_TIME_NODE_ID);
  if (timeEntry) {
    let maxFy = 0;
    for (const n of out) maxFy = Math.max(maxFy, n.fy ?? 0);
    const ty = maxFy + TIMELINE_ROW_GAP * 1.85;
    out.push({
      ...timeEntry,
      x: 0,
      y: ty,
      fx: 0,
      fy: ty,
      fz: 0,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }

  return out;
}
