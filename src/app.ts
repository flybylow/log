import path from "path";
import fs from "fs";
import express from "express";
import cors from "cors";
import { resolveCorsOrigin } from "./corsConfig";
import { validate } from "./validate";
import { transform } from "./transform";
import { hashEvent } from "./hash";
import { classify } from "./classify";
import { notarize } from "./notarize";
import { appendToGraph, getGraph } from "./graph";
import { pushTimelineEntry, getTimeline, resetTimelineForTests } from "./recentTimeline";

export const app = express();

app.use(cors({ origin: resolveCorsOrigin(process.env) }));
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
  resetTimelineForTests();
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

    const epcFirst =
      (Array.isArray(event.epcList) && event.epcList[0]) ||
      (Array.isArray(event.inputEPCList) && event.inputEPCList[0]) ||
      null;
    pushTimelineEntry({
      receivedAt: new Date().toISOString(),
      eventTime: String(event.eventTime),
      bizStep: typeof event.bizStep === "string" ? event.bizStep : null,
      type: String(event.type || "ObjectEvent"),
      hash,
      classification: classification.target,
      epcFirst: typeof epcFirst === "string" ? epcFirst : null,
      triplesAdded: stored.triplesAdded,
    });

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

app.get("/api/timeline", (_req, res) => {
  res.json({ events: getTimeline(), order: "oldest-first" });
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

const frontendDist = path.join(__dirname, "..", "frontend", "dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
} else {
  app.get("/", (_req, res) => {
    res
      .status(503)
      .type("text/plain")
      .send(
        "Frontend not built. From repo root: cd frontend && npm ci && npm run build && cd .. && npm run build"
      );
  });
}

export default app;
