// Step 6: GRAPH
// In-memory Turtle store. Appends triples from each event.
// Serves the full graph at GET /graph for Comunica/SPARQL.
// Persists to data/products.ttl on disk.

import fs from "fs";
import path from "path";

const GRAPH_FILE = path.join(process.cwd(), "data", "products.ttl");

const HEADER = `@prefix schema: <https://schema.org/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gs1: <https://id.gs1.org/> .

`;

let graphBody = "";

// Load existing graph from disk on startup
try {
  if (fs.existsSync(GRAPH_FILE)) {
    const existing = fs.readFileSync(GRAPH_FILE, "utf-8");
    graphBody = existing.replace(/@prefix[^.]+\.\n/g, "").trim();
    if (graphBody) graphBody += "\n\n";
    console.log(`[graph] Loaded existing graph from ${GRAPH_FILE}`);
  }
} catch {
  // Start fresh
}

export function appendToGraph(
  turtle: string,
  hash: string,
  iotaDigest: string | null
): { triplesAdded: number } {
  const body = turtle.replace(/@prefix[^.]+\.\n/g, "").trim();

  // Add IOTA link triple if notarized
  let iotaTriple = "";
  if (iotaDigest) {
    const uriMatch = body.match(/^<([^>]+)>/);
    if (uriMatch) {
      iotaTriple = `\n<${uriMatch[1]}> dpp:iotaDigest "${iotaDigest}" .`;
    }
  }

  // Hash triple
  const uriMatch = body.match(/^<([^>]+)>/);
  const hashTriple = uriMatch
    ? `\n<${uriMatch[1]}> dpp:sha256 "${hash}" .`
    : "";

  graphBody += body + hashTriple + iotaTriple + "\n\n";

  // Persist to disk
  try {
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
  return HEADER + graphBody;
}
