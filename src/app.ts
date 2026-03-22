import express from "express";
import cors from "cors";
import { validate } from "./validate";
import { transform } from "./transform";
import { hashEvent } from "./hash";
import { classify } from "./classify";
import { notarize } from "./notarize";
import { appendToGraph, getGraph } from "./graph";

export const app = express();

app.use(cors({ origin: process.env.TABULAS_ORIGIN || "*" }));
app.use(express.json({ limit: "1mb" }));

// Stats (module state for /status)
let eventCount = 0;
let lastNotarization: string | null = null;
const startedAt = new Date().toISOString();

export function getStatusSnapshot() {
  return { eventCount, lastNotarization, startedAt };
}

export function resetStatusForTests() {
  eventCount = 0;
  lastNotarization = null;
}

// POST /events
app.post("/events", async (req, res) => {
  try {
    const event = req.body;

    const validation = validate(event);
    if (!validation.valid) {
      res.status(400).json({ error: "Validation failed", details: validation.errors });
      return;
    }

    const turtle = transform(event);
    const hash = hashEvent(event);
    const classification = classify(event);

    let iotaDigest: string | null = null;
    if (classification.target === "iota" || classification.target === "both") {
      iotaDigest = await notarize(hash, event);
      lastNotarization = new Date().toISOString();
    }

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

app.get("/graph", (_req, res) => {
  const turtle = getGraph();
  res.setHeader("Content-Type", "text/turtle; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.send(turtle);
});

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

export default app;
