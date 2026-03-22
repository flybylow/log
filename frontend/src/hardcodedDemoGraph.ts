import { buildForceGraphData } from "./forceGraphData";
import { parseTurtleToGraph } from "./parseTurtle";

/**
 * Tiny DPP-shaped Turtle for the standalone `/simple-graph` demo (no API).
 * Two events, one shared product, two locations — enough edges to see wires.
 */
export const HARDCODED_SIMPLE_GRAPH_TTL = `@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://events.tabulas.eu/event/demo-a> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2025-01-15T10:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:commissioning ;
  dpp:action "ADD" ;
  dpp:product <https://example.test/demo/product-x> ;
  dpp:bizLocation <https://example.test/demo/place-1> .
<https://events.tabulas.eu/event/demo-a> dpp:sha256 "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" .

<https://events.tabulas.eu/event/demo-b> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2025-02-20T14:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:shipping ;
  dpp:action "OBSERVE" ;
  dpp:product <https://example.test/demo/product-x> ;
  dpp:bizLocation <https://example.test/demo/place-2> .
<https://events.tabulas.eu/event/demo-b> dpp:sha256 "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" .
`;

/** Parsed nodes + links for `KnowledgeForceGraph` (same pipeline as the dashboard). */
export function buildHardcodedGraphData() {
  const { entities, edges, eventSubjects } = parseTurtleToGraph(HARDCODED_SIMPLE_GRAPH_TTL);
  return buildForceGraphData(entities, edges, eventSubjects);
}
