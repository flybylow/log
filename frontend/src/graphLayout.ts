import type { ParsedGraphEdge, ParsedGraphEntity } from "./parseTurtle";

/** Horizontal spacing between event columns (left = older, right = newer). */
const COL_WIDTH = 280;
const MARGIN_X = 28;
const COL_TOP = 16;
const GAP = 10;

const EV_W = 220;
const EV_H = 72;
const CARD_W = 200;
const ACTOR_H = 48;
const PRODUCT_H = 52;
const LOC_H = 48;
const HASH_H = 30;
const IOTA_H = 36;

export type FlowNodeData = {
  label: string;
  kind: ParsedGraphEntity["kind"];
  subtitle?: string;
  literals?: Record<string, string>;
  /** HTTP(S) URL for product / location / readPoint when present on the entity */
  resourceUrl?: string;
  /** Dashboard timeline: primary product GS1 URI for this step (links + identifiers). */
  primaryProductUri?: string;
  /** For event nodes: SHA-256 hex for `/event/:hash` detail route. */
  eventHashHex?: string;
};

/** Legacy fixed layout (tests); dashboard uses `KnowledgeForceGraph` + `buildForceGraphData`. */
export type LayoutNode = {
  id: string;
  position: { x: number; y: number };
  data: FlowNodeData;
  style?: { width?: number; height?: number };
};

export type LayoutEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: { stroke?: string; strokeWidth?: number; strokeDasharray?: string };
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

function sortByLabel(a: string, b: string) {
  return a.localeCompare(b);
}

/**
 * Horizontal timeline: one column per lifecycle event, left → right by `eventTime`
 * (oldest first). New events (later in time) appear on the **right**.
 * Within each column, nodes stack **vertically** (event → actors → product → locations → hash → IOTA).
 */
export function buildFlowElements(
  entities: Map<string, ParsedGraphEntity>,
  graphEdges: ParsedGraphEdge[],
  eventSubjects: string[]
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const placed = new Set<string>();

  function place(id: string, x: number, y: number, width: number, height: number): void {
    const e = entities.get(id);
    if (!e) return;
    if (placed.has(id)) return;
    placed.add(id);
    const kind = e.kind;
    const subtitle =
      kind === "event" && e.literals.eventTime ? e.literals.eventTime : undefined;
    const resourceUrl =
      e.uri && (e.uri.startsWith("http://") || e.uri.startsWith("https://"))
        ? e.uri
        : undefined;
    const eventHashHex =
      kind === "event" ? sha256HexForEvent(id, graphEdges, entities) : undefined;
    nodes.push({
      id,
      position: { x, y },
      data: {
        label: e.label,
        kind,
        subtitle,
        literals: e.literals,
        resourceUrl,
        ...(eventHashHex ? { eventHashHex } : {}),
      },
      style: { width, height },
    });
  }

  let maxBottom = COL_TOP;

  eventSubjects.forEach((eventUri, index) => {
    const colX = MARGIN_X + index * COL_WIDTH;
    let y = COL_TOP;

    const ev = entities.get(eventUri);
    if (!ev) return;

    place(eventUri, colX, y, EV_W, EV_H);
    y += EV_H + GAP;

    const outgoing = graphEdges.filter((e) => e.source === eventUri);
    const incoming = graphEdges.filter((e) => e.target === eventUri);

    const actors = incoming
      .filter((e) => e.label === "actor")
      .map((e) => e.source)
      .filter((id) => id.startsWith("actor:"));
    const products = outgoing
      .filter((e) => ["product", "inputProduct", "outputProduct"].includes(e.label))
      .map((e) => e.target);
    const readPoints = outgoing.filter((e) => e.label === "readPoint").map((e) => e.target);
    const bizLocs = outgoing.filter((e) => e.label === "bizLocation").map((e) => e.target);
    const hashes = outgoing.filter((e) => e.label === "sha256").map((e) => e.target);
    const iotas = outgoing.filter((e) => e.label === "iotaDigest").map((e) => e.target);

    actors.sort(sortByLabel);
    products.sort(sortByLabel);
    readPoints.sort(sortByLabel);
    bizLocs.sort(sortByLabel);

    actors.forEach((aid) => {
      place(aid, colX, y, CARD_W, ACTOR_H);
      y += ACTOR_H + GAP;
    });
    products.forEach((pid) => {
      place(pid, colX, y, CARD_W, PRODUCT_H);
      y += PRODUCT_H + GAP;
    });
    readPoints.forEach((lid) => {
      place(lid, colX, y, CARD_W, LOC_H);
      y += LOC_H + GAP;
    });
    bizLocs.forEach((lid) => {
      place(lid, colX, y, CARD_W, LOC_H);
      y += LOC_H + GAP;
    });
    hashes.forEach((hid) => {
      place(hid, colX, y, 120, HASH_H);
      y += HASH_H + GAP;
    });
    iotas.forEach((iid) => {
      place(iid, colX, y, CARD_W, IOTA_H);
      y += IOTA_H + GAP;
    });

    maxBottom = Math.max(maxBottom, y);
  });

  let orphanX = MARGIN_X;
  let orphanY = maxBottom + 48;
  for (const [id, ent] of entities) {
    if (placed.has(id)) continue;
    if (ent.kind === "other" || ent.kind === "hash") {
      const w = ent.kind === "hash" ? 100 : 160;
      const h = ent.kind === "hash" ? 28 : 44;
      nodes.push({
        id,
        position: { x: orphanX, y: orphanY },
        data: { label: ent.label, kind: ent.kind, literals: ent.literals },
        style: { width: w, height: h },
      });
      placed.add(id);
      orphanX += w + 24;
      if (orphanX > MARGIN_X + eventSubjects.length * COL_WIDTH + 200) {
        orphanX = MARGIN_X;
        orphanY += 80;
      }
    }
  }

  for (const ge of graphEdges) {
    if (!placed.has(ge.source) || !placed.has(ge.target)) continue;
    edges.push({
      id: ge.id,
      source: ge.source,
      target: ge.target,
      label: ge.label,
      type: "smoothstep",
      animated: false,
    });
  }

  return { nodes, edges };
}
