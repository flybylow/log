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

  it("does not end a statement on a dot inside a string literal", () => {
    const ttl = `@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://events.tabulas.eu/event/e1> a dpp:ObjectEvent ;
  dpp:eventTime "2026-01-01T08:00:00.000Z"^^xsd:dateTime ;
  dpp:dppLabel "Version 1.0 (beta)." .
`;
    const { eventSubjects } = parseTurtleToGraph(ttl);
    expect(eventSubjects.length).toBe(1);
  });

  it("does not split object lists on commas inside <...> IRIs", () => {
    const ttl = `@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://events.tabulas.eu/event/e1> a dpp:ObjectEvent ;
  dpp:eventTime "2026-01-01T08:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:designing ;
  dpp:product <http://example.com/path,with,commas/ok>, <https://id.gs1.org/01/05413456000012/21/X> .
`;
    const { entities, eventSubjects } = parseTurtleToGraph(ttl);
    expect(eventSubjects.length).toBe(1);
    const products = [...entities.values()].filter((e) => e.kind === "product");
    expect(products.length).toBe(2);
  });

  it("parses semicolons inside string literals (does not split predicate list there)", () => {
    const ttl = `@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://events.tabulas.eu/event/e1> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-01-01T08:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:designing ;
  dpp:actor "Van Marcke; Group NV" ;
  dpp:product <https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001> .
`;
    const triples = parseTurtle(ttl);
    expect(triples.some((t) => t.object.includes("Van Marcke; Group NV"))).toBe(true);
  });

  it("detects three distinct events sharing a product URI (columns still get three event nodes)", () => {
    const ttl = `@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://events.tabulas.eu/event/e1> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-01-01T08:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:designing ;
  dpp:product <https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001> .

<https://events.tabulas.eu/event/e2> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-03-25T11:00:00Z"^^xsd:dateTime ;
  dpp:bizStep epcis:installing ;
  dpp:product <https://id.gs1.org/01/05413456000029/21/GROHE-EH-042> .

<https://events.tabulas.eu/event/e3> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-07-12T11:00:00.000Z"^^xsd:dateTime ;
  dpp:bizStep epcis:repairing ;
  dpp:product <https://id.gs1.org/01/05413456000012/21/DEMO-ASSET-001> .
`;
    const { eventSubjects } = parseTurtleToGraph(ttl);
    expect(eventSubjects.length).toBe(3);
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
