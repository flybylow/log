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
