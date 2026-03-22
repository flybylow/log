import { describe, expect, it } from "vitest";
import { buildFlowElements } from "./graphLayout";
import { parseTurtleToGraph } from "./parseTurtle";

const THREE_EVENTS_SHARED_PRODUCT = `@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://events.tabulas.eu/event/e1> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-01-01T08:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:designing ;
  dpp:product <https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001> .

<https://events.tabulas.eu/event/e1> dpp:sha256 "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" .

<https://events.tabulas.eu/event/e2> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-03-25T11:00:00Z"^^xsd:dateTime ;
  dpp:bizStep epcis:installing ;
  dpp:product <https://id.gs1.org/01/05413456000029/21/GROHE-EH-042> .

<https://events.tabulas.eu/event/e2> dpp:sha256 "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" .

<https://events.tabulas.eu/event/e3> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-07-12T11:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:repairing ;
  dpp:product <https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001> .

<https://events.tabulas.eu/event/e3> dpp:sha256 "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" .
`;

describe("graphLayout", () => {
  it("full layout deduplicates shared product nodes (fewer product nodes than events)", () => {
    const { entities, edges, eventSubjects } = parseTurtleToGraph(THREE_EVENTS_SHARED_PRODUCT);
    const { nodes } = buildFlowElements(entities, edges, eventSubjects);
    const productNodes = nodes.filter((n) => n.data.kind === "product");
    expect(eventSubjects.length).toBe(3);
    expect(productNodes.length).toBeLessThan(3);
  });

});
