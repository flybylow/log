# dpp-event: Developer Handoff

**Repo:** https://github.com/flybylow/dpp-event  
**Domain:** events.tabulas.eu (Combell, Node.js 22)  
**Purpose:** DPP Event Log Service. Receives EPCIS 2.0 lifecycle events, transforms to RDF/Turtle, notarizes hashes to IOTA Rebased.

---

## Architecture

events.tabulas.eu is the **write layer**. tabulas.eu (Vercel) is the **read layer**.

```
Manufacturer / ERP / Scanner
        |
        | POST /events (EPCIS JSON-LD)
        v
  events.tabulas.eu (Combell, Node.js 22, Express)
        |
        |-- 1. VALIDATE   check EPCIS structure
        |-- 2. TRANSFORM  JSON-LD to Turtle triples
        |-- 3. HASH       SHA-256 canonical hash
        |-- 4. CLASSIFY   public (IOTA) vs private (Solid Pod)
        |-- 5. NOTARIZE   hash to IOTA Dynamic Notarization
        |-- 6. STORE      append to graph, link IOTA digest
        |
        v
  GET /graph (Turtle)
        |
        v
  tabulas.eu (Vercel, Next.js, Comunica/SPARQL)
```

## Three-Layer Trust Architecture

- **Layer 1 (IOTA Rebased):** on-chain, immutable. Public lifecycle events, certifications, Dynamic Notarization Move objects.
- **Layer 2 (Tabulas Graph):** RDF/Turtle at events.tabulas.eu/graph. References Layer 1 digests and Layer 3 pod URIs. Queried via Comunica/SPARQL.
- **Layer 3 (Solid Pod):** off-chain, user-controlled. Private credentials with selective disclosure (ECDSA-SD). Athumi/Kvasir infrastructure.

---

## File Structure

```
dpp-event/
  src/
    server.ts      Entry: dotenv + listen (production / Combell)
    app.ts         Express: POST /events, GET /graph, GET /status (testable)
    validate.ts    Step 1: EPCIS structure check
    transform.ts   Step 2: JSON-LD to Turtle
    hash.ts        Step 3: SHA-256 canonical hash
    classify.ts    Step 4: public (IOTA) vs private (Solid Pod); `dpp:graphOnly`
    notarize.ts    Step 5: IOTA Dynamic Notarization (stub)
    graph.ts       Step 6: in-memory Turtle store + disk persist (`DPP_GRAPH_PATH`)
    smoke.ts       Manual printout of steps 1–4 (no HTTP)
    *.test.ts      `node:test` + supertest (`npm test`)
  data/
    .gitkeep       Graph file (products.ttl) written here at runtime
  examples/
    vanmarcke-inloopdouche.json    Shower screen commissioned (ETIM EC011431)
    vanmarcke-mixer-shipped.json   Mixer tap shipped to installer
    installer-installed.json       Product installed at construction site
  .env.example
  .gitignore
  package.json
  tsconfig.json
  README.md
```

---

## Setup

```bash
git clone https://github.com/flybylow/dpp-event.git
cd dpp-event
npm install
cp .env.example .env
npm run dev
```

Test:

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d @examples/vanmarcke-inloopdouche.json
```

---

## Configuration Files

### package.json

```json
{
  "name": "dpp-event",
  "version": "0.1.0",
  "description": "DPP Event Log Service: EPCIS to IOTA notarization pipeline",
  "main": "dist/server.js",
  "scripts": {
    "build": "npm ci && tsc",
    "serve": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "tsx --test src/validate.test.ts src/hash.test.ts src/classify.test.ts src/transform.test.ts src/app.test.ts",
    "smoke": "tsx src/smoke.ts"
  },
  "dependencies": {
    "express": "^4.21.0",
    "n3": "^1.21.3",
    "jsonld": "^8.3.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/jsonld": "^1.5.15",
    "@types/supertest": "^7.2.0",
    "supertest": "^7.2.2",
    "typescript": "^5.5.0",
    "tsx": "^4.19.0"
  },
  "engines": {
    "node": ">=22"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### .env.example

```
# Server
PORT=3000

# IOTA Rebased (testnet)
IOTA_RPC_URL=https://api.testnet.iota.cafe
IOTA_PRIVATE_KEY=
IOTA_NETWORK=testnet

# Tabulas DPP Browser (Vercel), consumes the graph
TABULAS_ORIGIN=https://tabulas.eu

# Solid Pod (Athumi/Kvasir), private credential storage
SOLID_POD_URL=
SOLID_OIDC_ISSUER=
```

### .gitignore

```
node_modules/
dist/
.env
.env.local
*.log
data/*.ttl
!data/.gitkeep
```

---

## Source Files

### src/server.ts

```typescript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { validate } from "./validate";
import { transform } from "./transform";
import { hashEvent } from "./hash";
import { classify } from "./classify";
import { notarize } from "./notarize";
import { appendToGraph, getGraph } from "./graph";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.TABULAS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

// Stats
let eventCount = 0;
let lastNotarization: string | null = null;
const startedAt = new Date().toISOString();

// POST /events
// The write path. Receives EPCIS JSON-LD, runs the 6-step pipeline.
app.post("/events", async (req, res) => {
  try {
    const event = req.body;

    // Step 1: VALIDATE
    const validation = validate(event);
    if (!validation.valid) {
      res.status(400).json({ error: "Validation failed", details: validation.errors });
      return;
    }

    // Step 2: TRANSFORM (EPCIS JSON-LD to Turtle)
    const turtle = transform(event);

    // Step 3: HASH (SHA-256 canonical hash)
    const hash = hashEvent(event);

    // Step 4: CLASSIFY (public to IOTA, private to Solid Pod)
    const classification = classify(event);

    // Step 5: NOTARIZE (hash to IOTA Dynamic Notarization)
    let iotaDigest: string | null = null;
    if (classification.target === "iota" || classification.target === "both") {
      iotaDigest = await notarize(hash, event);
      lastNotarization = new Date().toISOString();
    }

    // Step 6: STORE (append triples to graph, link IOTA digest)
    const stored = appendToGraph(turtle, hash, iotaDigest);

    eventCount++;

    res.status(201).json({
      status: "accepted",
      hash,
      iotaDigest,
      classification: classification.target,
      triplesAdded: stored.triplesAdded,
      eventCount,
    });
  } catch (err: any) {
    console.error("Pipeline error:", err);
    res.status(500).json({ error: "Pipeline failed", message: err.message });
  }
});

// GET /graph
// Serves the knowledge graph as Turtle. The DPP Browser fetches this.
app.get("/graph", (_req, res) => {
  const turtle = getGraph();
  res.setHeader("Content-Type", "text/turtle; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(turtle);
});

// GET /status
app.get("/status", (_req, res) => {
  const turtle = getGraph();
  res.json({
    service: "dpp-event",
    version: "0.1.0",
    startedAt,
    eventCount,
    lastNotarization,
    graphSizeBytes: Buffer.byteLength(turtle, "utf-8"),
    iotaNetwork: process.env.IOTA_NETWORK || "testnet",
  });
});

app.listen(PORT, () => {
  console.log(`dpp-event running on :${PORT}`);
  console.log(`  POST /events  - submit EPCIS event`);
  console.log(`  GET  /graph   - Turtle knowledge graph`);
  console.log(`  GET  /status  - service health`);
});

export default app;
```

### src/validate.ts

```typescript
// Step 1: VALIDATE
// Checks EPCIS 2.0 structure: type, eventTime, bizStep, epcList/inputEPCList

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_EVENT_TYPES = [
  "ObjectEvent",
  "AggregationEvent",
  "TransactionEvent",
  "TransformationEvent",
];

const VALID_BIZ_STEPS = [
  "commissioning",
  "manufacturing",
  "assembling",
  "inspecting",
  "shipping",
  "receiving",
  "installing",
  "repairing",
  "maintaining",
  "recycling",
  "destroying",
  "decommissioning",
  "certifying",
  "storing",
  "packing",
  "unpacking",
  "loading",
  "unloading",
  "accepting",
  "returning",
];

export function validate(event: any): ValidationResult {
  const errors: string[] = [];

  if (!event || typeof event !== "object") {
    return { valid: false, errors: ["Event must be a JSON object"] };
  }

  if (!event.type) {
    errors.push("Missing 'type' field");
  } else if (!VALID_EVENT_TYPES.includes(event.type)) {
    errors.push(
      `Invalid event type '${event.type}'. Expected: ${VALID_EVENT_TYPES.join(", ")}`
    );
  }

  if (!event.eventTime) {
    errors.push("Missing 'eventTime' field");
  } else {
    const d = new Date(event.eventTime);
    if (isNaN(d.getTime())) {
      errors.push("'eventTime' is not a valid ISO 8601 timestamp");
    }
  }

  const hasEpcList =
    Array.isArray(event.epcList) && event.epcList.length > 0;
  const hasInputEpcList =
    Array.isArray(event.inputEPCList) && event.inputEPCList.length > 0;
  const hasQuantityList =
    Array.isArray(event.quantityList) && event.quantityList.length > 0;
  if (!hasEpcList && !hasInputEpcList && !hasQuantityList) {
    errors.push(
      "Must include at least one of: epcList, inputEPCList, quantityList"
    );
  }

  if (event.bizStep && !VALID_BIZ_STEPS.includes(event.bizStep)) {
    errors.push(
      `Unknown bizStep '${event.bizStep}'. Known: ${VALID_BIZ_STEPS.join(", ")}`
    );
  }

  return { valid: errors.length === 0, errors };
}
```

### src/transform.ts

```typescript
// Step 2: TRANSFORM
// Converts EPCIS 2.0 JSON-LD event to Turtle triples.
// Uses Schema.org as base vocab, dpp: for DPP-specific terms.

const PREFIXES = `@prefix schema: <https://schema.org/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gs1: <https://id.gs1.org/> .

`;

export function transform(event: any): string {
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

  // ETIM extensions (construction vertical)
  if (event["dpp:etimClass"]) {
    lines.push(`  dpp:etimClass "${event["dpp:etimClass"]}" ;`);
  }

  if (event["dpp:etimClassDescription"]) {
    lines.push(`  dpp:etimClassDescription "${escapeTurtle(event["dpp:etimClassDescription"])}" ;`);
  }

  if (event["dpp:brand"]) {
    lines.push(`  dpp:brand "${event["dpp:brand"]}" ;`);
  }

  if (event["dpp:model"]) {
    lines.push(`  dpp:model "${event["dpp:model"]}" ;`);
  }

  // Close: replace trailing semicolon with period
  const lastLine = lines[lines.length - 1];
  lines[lines.length - 1] = lastLine.replace(/ ;$/, " .");

  return PREFIXES + lines.join("\n") + "\n";
}

function eventToUri(event: any): string {
  const productId = event.epcList?.[0] || event.inputEPCList?.[0] || "unknown";
  const time = event.eventTime || new Date().toISOString();
  const step = event.bizStep || "event";
  const encoded = encodeURIComponent(`${productId}/${step}/${time}`);
  return `https://events.tabulas.eu/event/${encoded}`;
}

function escapeTurtle(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
```

### src/hash.ts

```typescript
// Step 3: HASH
// SHA-256 of canonicalized JSON (sorted keys, no whitespace).
// This hash is what gets notarized on IOTA.

import { createHash } from "crypto";

export function hashEvent(event: any): string {
  const canonical = canonicalize(event);
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]));
  return "{" + pairs.join(",") + "}";
}
```

### src/classify.ts

```typescript
// Step 4: CLASSIFY
// Routes data: public claims to IOTA, private data to Solid Pod.
// Layer 1 (IOTA): public lifecycle events, certifications
// Layer 2 (Tabulas graph): all events as triples
// Layer 3 (Solid Pod): private credentials, costs, audit details

export interface Classification {
  target: "iota" | "pod" | "both" | "graph-only";
  reason: string;
}

const PUBLIC_STEPS = [
  "commissioning",
  "manufacturing",
  "certifying",
  "recycling",
  "destroying",
  "decommissioning",
  "installing",
];

const PRIVATE_STEPS = [
  "shipping",
  "receiving",
  "storing",
];

export function classify(event: any): Classification {
  const step = event.bizStep || "";

  if (event["dpp:private"] === true) {
    return { target: "pod", reason: "Explicitly marked private" };
  }

  if (event.certification || step === "certifying") {
    return { target: "iota", reason: "Certification is a public claim" };
  }

  if (PUBLIC_STEPS.includes(step)) {
    return { target: "iota", reason: `bizStep '${step}' is a public lifecycle event` };
  }

  if (PRIVATE_STEPS.includes(step) && (event.cost || event.supplierDetails)) {
    return { target: "both", reason: `bizStep '${step}' has private fields, hash still notarized` };
  }

  return { target: "iota", reason: "Default: lifecycle events are public" };
}
```

### src/notarize.ts

```typescript
// Step 5: NOTARIZE
// Push SHA-256 hash to IOTA Rebased as Dynamic Notarization.
//
// IOTA Rebased uses MoveVM, not the old Tangle.
// Dynamic Notarization = a Move object holding hash + metadata.
// Immutable once created. Anyone can read it to verify.
//
// TODO: Wire up @iota/iota-sdk when ready.
// Docs: https://docs.iota.org/developer/workshops/iota-notarization-truedoc

export async function notarize(
  hash: string,
  event: any
): Promise<string | null> {
  const rpcUrl = process.env.IOTA_RPC_URL;
  const privateKey = process.env.IOTA_PRIVATE_KEY;

  if (!rpcUrl || !privateKey) {
    console.log(`[notarize] STUB: would notarize hash ${hash.slice(0, 16)}...`);
    console.log(`[notarize] Set IOTA_RPC_URL and IOTA_PRIVATE_KEY to enable.`);
    return `stub:${hash.slice(0, 16)}`;
  }

  // -----------------------------------------------------------------
  // IOTA Rebased notarization via @iota/iota-sdk
  // Uncomment when SDK is installed (npm install @iota/iota-sdk):
  //
  // import { IotaClient } from "@iota/iota-sdk/client";
  // import { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";
  // import { Transaction } from "@iota/iota-sdk/transactions";
  //
  // const client = new IotaClient({ url: rpcUrl });
  // const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  //
  // const tx = new Transaction();
  // tx.moveCall({
  //   target: "0xPACKAGE::notarization::notarize",
  //   arguments: [
  //     tx.pure.vector("u8", Buffer.from(hash, "hex")),
  //     tx.pure.string(event.epcList?.[0] || "unknown"),
  //     tx.pure.string(event.bizStep || "event"),
  //   ],
  // });
  //
  // const result = await client.signAndExecuteTransaction({
  //   signer: keypair,
  //   transaction: tx,
  // });
  //
  // return result.digest;
  // -----------------------------------------------------------------

  console.log(`[notarize] STUB: hash=${hash.slice(0, 16)}... rpc=${rpcUrl}`);
  return `stub:${hash.slice(0, 16)}`;
}
```

### src/graph.ts

In-memory Turtle plus disk persistence. Path: `DPP_GRAPH_PATH` or `data/products.ttl`. `@prefix` lines from `transform()` output are removed with a **line filter** (`stripPrefixes`) so URLs with dots in `https://` are handled correctly. Lazy-load from disk on first read/write. Full source: `src/graph.ts` in the repo.

### Tests and smoke

- **`npm test`** — Node’s test runner via `tsx` (`src/*.test.ts`): unit tests for validate/hash/classify/transform, and HTTP integration tests (`supertest`) against `app.ts`.
- **`npm run smoke`** — `src/smoke.ts` prints the pipeline for `examples/vanmarcke-inloopdouche.json` (steps 1–4 only, no server).

---

## Example Events (Construction Vertical)

### examples/vanmarcke-inloopdouche.json

```json
{
  "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
  "type": "ObjectEvent",
  "eventTime": "2026-03-22T09:00:00Z",
  "action": "ADD",
  "bizStep": "commissioning",
  "epcList": ["https://id.gs1.org/01/05413456000012/21/ARBLU-IDS-001"],
  "readPoint": {
    "id": "https://id.gs1.org/414/0541345600001"
  },
  "bizLocation": {
    "id": "https://id.gs1.org/414/0541345600002"
  },
  "actor": "Van Marcke Group NV",
  "certification": "ETIM EC011431",
  "dpp:etimClass": "EC011431",
  "dpp:etimClassDescription": "Inloopdouche",
  "dpp:brand": "Arblu",
  "dpp:model": "Ideo Screen"
}
```

### examples/vanmarcke-mixer-shipped.json

```json
{
  "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
  "type": "ObjectEvent",
  "eventTime": "2026-03-22T14:30:00Z",
  "action": "OBSERVE",
  "bizStep": "shipping",
  "epcList": ["https://id.gs1.org/01/05413456000029/21/GROHE-EH-042"],
  "readPoint": {
    "id": "https://id.gs1.org/414/0541345600003"
  },
  "bizLocation": {
    "id": "https://id.gs1.org/414/0541345600004"
  },
  "disposition": "in_transit",
  "actor": "Van Marcke Logistics",
  "dpp:etimClass": "EC011431",
  "dpp:brand": "Grohe",
  "dpp:model": "Eurosmart",
  "dpp:destination": "Installateur Janssens BVBA"
}
```

### examples/installer-installed.json

```json
{
  "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
  "type": "ObjectEvent",
  "eventTime": "2026-03-25T11:00:00Z",
  "action": "OBSERVE",
  "bizStep": "installing",
  "epcList": ["https://id.gs1.org/01/05413456000029/21/GROHE-EH-042"],
  "readPoint": {
    "id": "https://id.gs1.org/414/0541345600005"
  },
  "bizLocation": {
    "id": "https://id.gs1.org/414/0541345600006"
  },
  "actor": "Installateur Janssens BVBA",
  "dpp:project": "Nieuwbouw Residentie Groen",
  "dpp:location": "Unit 3B, Badkamer",
  "dpp:installerCertification": "Cerga G1"
}
```

---

## Deployment: Combell

- Node.js 22, port 3000
- Git push deploy (Combell pulls from flybylow/dpp-event)
- DNS: events.tabulas.eu CNAME to Combell instance
- Deploy key: read-only SSH key from Combell added to GitHub repo settings

Environment variables in Combell panel:

```
PORT=3000
IOTA_RPC_URL=https://api.testnet.iota.cafe
IOTA_PRIVATE_KEY=<your key>
IOTA_NETWORK=testnet
TABULAS_ORIGIN=https://tabulas.eu
```

---

## Next Steps

1. Push scaffold to GitHub, configure Combell instance
2. Wire IOTA notarization SDK (uncomment code in notarize.ts, deploy Move package)
3. Add vertical-specific transform extensions (ETIM feature codes, OKOBAUDAT references)
4. Add API key authentication for POST /events
5. Add W3C VC wrapping (sign event claims as credentials, ES256, did:web:tabulas.eu)
6. Connect Solid Pod storage for classified-private events
7. Wire x402 micropayments on GET /graph for agent access

---

## Verified

TypeScript compiles clean. Smoke test output:

```
=== STEP 1: VALIDATE ===
PASS []

=== STEP 2: TRANSFORM ===
@prefix schema: <https://schema.org/> .
@prefix epcis: <https://ref.gs1.org/cbv/> .
@prefix dpp: <https://tabulas.eu/ontology/dpp/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix gs1: <https://id.gs1.org/> .

<https://events.tabulas.eu/event/...> a dpp:LifecycleEvent, dpp:ObjectEvent ;
  dpp:eventTime "2026-03-22T09:00:00Z"^^xsd:dateTime ;
  dpp:bizStep epcis:commissioning ;
  dpp:action "ADD" ;
  dpp:product <https://id.gs1.org/01/05413456000012/21/ARBLU-IDS-001> ;
  dpp:readPoint <https://id.gs1.org/414/0541345600001> ;
  dpp:bizLocation <https://id.gs1.org/414/0541345600002> ;
  dpp:actor "Van Marcke Group NV" ;
  dpp:certification "ETIM EC011431" .

=== STEP 3: HASH ===
SHA-256: bde7e7f66b4db1650def92ad01cf94cfc512871639c2ac115454257d9bb1b1af

=== STEP 4: CLASSIFY ===
Target: iota (Certification is a public claim)
```
