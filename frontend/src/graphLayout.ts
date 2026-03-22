import type { Edge, Node } from "@xyflow/react";
import type { ParsedGraphEdge, ParsedGraphEntity } from "./parseTurtle";

const ROW = 280;
const EVENT_X = 380;
const EVENT_Y_OFF = 48;
const SIDE_X = 72;
const BELOW_Y = 120;
const PRODUCT_X = 180;
const LOC_MID_X = 400;
const LOC_RIGHT_X = 620;

export type FlowNodeData = {
  label: string;
  kind: ParsedGraphEntity["kind"];
  subtitle?: string;
  literals?: Record<string, string>;
};

function sortByLabel(a: string, b: string) {
  return a.localeCompare(b);
}

/** Assign fixed positions for a timeline of events (newest at bottom optional — caller sorts). */
export function buildFlowElements(
  entities: Map<string, ParsedGraphEntity>,
  graphEdges: ParsedGraphEdge[],
  eventSubjects: string[]
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];
  const placed = new Set<string>();

  function place(id: string, x: number, y: number, width: number, height: number): void {
    const e = entities.get(id);
    if (!e) return;
    if (placed.has(id)) return;
    placed.add(id);
    const kind = e.kind;
    const subtitle =
      kind === "event" && e.literals.eventTime
        ? e.literals.eventTime
        : undefined;
    nodes.push({
      id,
      position: { x, y },
      data: {
        label: e.label,
        kind,
        subtitle,
        literals: e.literals,
      },
      style: { width, height },
    });
  }

  eventSubjects.forEach((eventUri, index) => {
    const rowY = index * ROW + 24;
    const ev = entities.get(eventUri);
    if (!ev) return;

    const evW = 220;
    const evH = 64;
    place(eventUri, EVENT_X, rowY + EVENT_Y_OFF, evW, evH);

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

    actors.sort(sortByLabel);
    products.sort(sortByLabel);
    readPoints.sort(sortByLabel);
    bizLocs.sort(sortByLabel);

    actors.forEach((aid, i) => {
      place(aid, SIDE_X + i * 8, rowY + EVENT_Y_OFF + i * 6, 200, 52);
    });

    products.forEach((pid, i) => {
      place(pid, PRODUCT_X, rowY + BELOW_Y + i * 72, 200, 52);
    });

    readPoints.forEach((lid, i) => {
      place(lid, LOC_MID_X - 40, rowY + BELOW_Y + i * 72, 180, 48);
    });

    bizLocs.forEach((lid, i) => {
      place(lid, LOC_RIGHT_X, rowY + BELOW_Y + i * 72, 180, 48);
    });

    hashes.forEach((hid, i) => {
      place(hid, EVENT_X + 70, rowY + EVENT_Y_OFF + evH + 12 + i * 30, 100, 28);
    });
  });

  // Orphan entities (not in any event row): place in a grid below
  let orphanX = 40;
  let orphanY = eventSubjects.length * ROW + 40;
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
      if (orphanX > 900) {
        orphanX = 40;
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
