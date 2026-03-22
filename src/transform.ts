// Step 2: TRANSFORM
// Converts EPCIS 2.0 JSON-LD event to Turtle triples.
// Uses Schema.org as base vocab, dpp: for DPP-specific terms.

import { randomUUID } from "node:crypto";

const PREFIXES = `@prefix schema: <https://schema.org/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gs1: <https://id.gs1.org/> .

`;

export function transform(event: any): { turtle: string; eventUri: string } {
  const lines: string[] = [];
  const eventUri = eventToUri(event);

  lines.push(`<${eventUri}> a dpp:LifecycleEvent, dpp:${event.type || "ObjectEvent"} ;`);
  lines.push(`  dpp:eventTime "${event.eventTime}"^^xsd:dateTime ;`);

  if (event.bizStep) {
    lines.push(`  dpp:bizStep epcis:${event.bizStep} ;`);
  }

  if (event.action) {
    lines.push(`  dpp:action "${event.action}" ;`);
  }

  if (event.disposition) {
    lines.push(`  dpp:disposition epcis:${event.disposition} ;`);
  }

  if (Array.isArray(event.epcList)) {
    for (const epc of event.epcList) {
      lines.push(`  dpp:product <${epc}> ;`);
    }
  }

  if (Array.isArray(event.inputEPCList)) {
    for (const epc of event.inputEPCList) {
      lines.push(`  dpp:inputProduct <${epc}> ;`);
    }
  }

  if (Array.isArray(event.outputEPCList)) {
    for (const epc of event.outputEPCList) {
      lines.push(`  dpp:outputProduct <${epc}> ;`);
    }
  }

  if (event.readPoint?.id) {
    lines.push(`  dpp:readPoint <${event.readPoint.id}> ;`);
  }

  if (event.bizLocation?.id) {
    lines.push(`  dpp:bizLocation <${event.bizLocation.id}> ;`);
  }

  if (event.actor) {
    lines.push(`  dpp:actor "${escapeTurtle(event.actor)}" ;`);
  }

  if (event.certification) {
    lines.push(`  dpp:certification "${escapeTurtle(event.certification)}" ;`);
  }

  // Any `dpp:*` string on the payload (ETIM, scenario labels, project refs, etc.)
  for (const [k, v] of Object.entries(event)) {
    if (!k.startsWith("dpp:") || typeof v !== "string") continue;
    const pred = k.slice(4);
    if (!pred) continue;
    lines.push(`  dpp:${pred} "${escapeTurtle(v)}" ;`);
  }

  // Close: replace trailing semicolon with period
  const lastLine = lines[lines.length - 1];
  lines[lines.length - 1] = lastLine.replace(/ ;$/, " .");

  const turtle = PREFIXES + lines.join("\n") + "\n";
  return { turtle, eventUri };
}

function eventToUri(event: any): string {
  const productId = event.epcList?.[0] || event.inputEPCList?.[0] || "unknown";
  const time = event.eventTime || new Date().toISOString();
  const step = event.bizStep || "event";
  // One RDF subject per submission so the graph UI gets a new horizontal step each POST
  // (same JSON payload would otherwise reuse the same URI and merge into one column).
  const instanceId = randomUUID();
  const encoded = encodeURIComponent(`${productId}/${step}/${time}/${instanceId}`);
  return `https://events.tabulas.eu/event/${encoded}`;
}

function escapeTurtle(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
