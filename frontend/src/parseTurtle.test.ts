import { describe, expect, it } from "vitest";
import { parseTurtle, parseTurtleToGraph, triplesToGraph } from "./parseTurtle";

const SAMPLE = `
@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://events.tabulas.eu/event/test> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2025-01-15T10:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:commissioning ;
  dpp:product <https://id.gs1.org/01/05412345000013> ;
  dpp:readPoint <https://id.gs1.org/414/0541345600001> ;
  dpp:bizLocation <https://id.gs1.org/414/0541345600002> ;
  dpp:actor "Van Marcke Group NV" .

<https://events.tabulas.eu/event/test> dpp:sha256 "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789" .
`;

describe("parseTurtle", () => {
  it("parses event triples and sha256", () => {
    const triples = parseTurtle(SAMPLE);
    expect(triples.some((t) => t.predicate.endsWith("type"))).toBe(true);
    expect(triples.some((t) => t.object.includes("commissioning"))).toBe(true);
    expect(triples.some((t) => t.object.includes("05412345000013"))).toBe(true);
    expect(triples.some((t) => t.predicate.includes("sha256"))).toBe(true);
  });

  it("builds graph entities and edges", () => {
    const { entities, edges, eventSubjects } = parseTurtleToGraph(SAMPLE);
    expect(eventSubjects.length).toBe(1);
    const ev = eventSubjects[0];
    expect(entities.get(ev)?.kind).toBe("event");
    expect(entities.get("https://id.gs1.org/01/05412345000013")?.kind).toBe("product");
    expect(edges.some((e) => e.label === "actor")).toBe(true);
    expect(edges.some((e) => e.label === "sha256")).toBe(true);
  });

  it("triplesToGraph sorts event subjects by eventTime", () => {
    const ttl = `@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://e/b> a dpp:ObjectEvent ; dpp:eventTime "2025-02-01T00:00:00Z"^^xsd:dateTime .
<https://e/a> a dpp:ObjectEvent ; dpp:eventTime "2025-01-01T00:00:00Z"^^xsd:dateTime .
`;
    const { eventSubjects } = triplesToGraph(parseTurtle(ttl));
    expect(eventSubjects[0]).toContain("e/a");
    expect(eventSubjects[1]).toContain("e/b");
  });
});
