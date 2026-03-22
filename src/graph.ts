// Step 6: GRAPH
// In-memory Turtle store. Appends triples from each event.
// Serves the full graph at GET /graph for Comunica/SPARQL.
// Persists to data/products.ttl on disk (override with DPP_GRAPH_PATH).

import fs from "fs";
import path from "path";

const HEADER = `@prefix schema: <https://schema.org/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gs1: <https://id.gs1.org/> .

`;

let graphBody = "";
let diskLoaded = false;

/** Remove @prefix lines so appended blocks do not duplicate vocab headers. */
function stripPrefixes(ttl: string): string {
  return ttl
    .split("\n")
    .filter((line) => !/^\s*@prefix\s/i.test(line.trim()))
    .join("\n")
    .trim();
}

export function graphFilePath(): string {
  return process.env.DPP_GRAPH_PATH
    ? path.resolve(process.env.DPP_GRAPH_PATH)
    : path.join(process.cwd(), "data", "products.ttl");
}

function loadFromDiskIfNeeded(): void {
  if (diskLoaded) return;
  diskLoaded = true;
  const GRAPH_FILE = graphFilePath();
  try {
    if (fs.existsSync(GRAPH_FILE)) {
      const existing = fs.readFileSync(GRAPH_FILE, "utf-8");
      graphBody = stripPrefixes(existing).trim();
      if (graphBody) graphBody += "\n\n";
      console.log(`[graph] Loaded existing graph from ${GRAPH_FILE}`);
    }
  } catch {
    // Start fresh
  }
}

/** Test helper: clear memory + reset load flag (optional unlink). */
export function resetGraphForTests(unlinkFile = false): void {
  const p = graphFilePath();
  graphBody = "";
  diskLoaded = false;
  if (unlinkFile) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Remove all triples from the in-memory graph and rewrite the Turtle file to
 * prefix headers only (empty graph). Does not reload from disk afterward.
 */
export function clearPersistedGraph(): void {
  graphBody = "";
  diskLoaded = true;
  const GRAPH_FILE = graphFilePath();
  try {
    const dir = path.dirname(GRAPH_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GRAPH_FILE, HEADER, "utf-8");
  } catch (err) {
    console.error("[graph] Failed to clear persisted graph:", err);
    throw err;
  }
}

export function appendToGraph(
  turtle: string,
  hash: string,
  iotaDigest: string | null
): { triplesAdded: number } {
  loadFromDiskIfNeeded();

  const body = stripPrefixes(turtle);

  let iotaTriple = "";
  if (iotaDigest) {
    const uriMatch = body.match(/^<([^>]+)>/);
    if (uriMatch) {
      iotaTriple = `\n<${uriMatch[1]}> dpp:iotaDigest "${iotaDigest}" .`;
    }
  }

  const uriMatch = body.match(/^<([^>]+)>/);
  const hashTriple = uriMatch
    ? `\n<${uriMatch[1]}> dpp:sha256 "${hash}" .`
    : "";

  graphBody += body + hashTriple + iotaTriple + "\n\n";

  try {
    const GRAPH_FILE = graphFilePath();
    const dir = path.dirname(GRAPH_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GRAPH_FILE, HEADER + graphBody, "utf-8");
  } catch (err) {
    console.error("[graph] Failed to persist:", err);
  }

  const triplesAdded = body.split("\n").filter((l) => l.trim().length > 0).length;
  return { triplesAdded };
}

export function getGraph(): string {
  loadFromDiskIfNeeded();
  return HEADER + graphBody;
}
