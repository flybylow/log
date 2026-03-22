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
import { appendToGraph, clearPersistedGraph, getGraph } from "./graph";
import { pushTimelineEntry, getTimeline, resetTimelineForTests } from "./recentTimeline";
import { wwwRedirectMiddleware } from "./wwwRedirect";

export const app = express();

const canonicalHost = process.env.CANONICAL_HOST?.trim();
if (canonicalHost) {
  app.use(wwwRedirectMiddleware(canonicalHost));
}

app.use(cors({ origin: resolveCorsOrigin(process.env) }));
app.use(express.json({ limit: "1mb" }));

/** Dashboard and SPARQL clients must not cache graph/timeline/status — stale responses look like “browser memory.” */
app.use((req, res, next) => {
  if (
    req.method === "GET" &&
    (req.path === "/graph" || req.path === "/api/timeline" || req.path === "/status")
  ) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

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

    const { turtle, eventUri } = transform(event);
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
      eventUri,
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

/** Clear all RDF triples (memory + persisted file) and reset timeline / counters. Requires DPP_GRAPH_RESET_SECRET. */
app.delete("/graph", (req, res) => {
  const secret = process.env.DPP_GRAPH_RESET_SECRET?.trim();
  if (!secret) {
    res.status(404).json({ error: "Graph reset is not enabled (set DPP_GRAPH_RESET_SECRET)." });
    return;
  }
  const bearer =
    typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.slice(7).trim()
      : "";
  const headerToken =
    typeof req.headers["x-dpp-graph-reset"] === "string" ? req.headers["x-dpp-graph-reset"].trim() : "";
  if (bearer !== secret && headerToken !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    clearPersistedGraph();
    resetStatusForTests();
    res.status(200).json({ ok: true, cleared: true });
  } catch (err: any) {
    console.error("Graph reset failed:", err);
    res.status(500).json({ error: "Failed to clear graph", message: err.message });
  }
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
    /** True when DELETE /graph is available (DPP_GRAPH_RESET_SECRET set). */
    graphResetEnabled: Boolean(process.env.DPP_GRAPH_RESET_SECRET?.trim()),
  });
});

const frontendMissingMessage =
  "Frontend not built. From repo root: cd frontend && npm ci && npm run build && cd .. && npm run build";

/**
 * Combell and other hosts may run `node dist/server.js` with cwd != repo root, or only copy part of the tree.
 * Try paths relative to the compiled bundle and to process.cwd().
 */
function resolveFrontendDist(): string | null {
  const candidates = [
    path.join(__dirname, "..", "frontend", "dist"),
    path.join(process.cwd(), "frontend", "dist"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        return p;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

const frontendDist = resolveFrontendDist();
const indexHtmlPath = frontendDist ? path.join(frontendDist, "index.html") : null;

function sendDashboardIndex(res: express.Response) {
  if (indexHtmlPath && fs.existsSync(indexHtmlPath)) {
    res.sendFile(path.resolve(indexHtmlPath));
    return;
  }
  const hint = frontendDist
    ? `(directory exists but index.html missing at ${indexHtmlPath})`
    : `(no frontend/dist next to dist/ or under cwd: ${process.cwd()})`;
  res.status(503).type("text/plain").send(`${frontendMissingMessage}\n${hint}`);
}

/** Always register GET / so production never falls through to Express default "Cannot GET /". */
app.get("/", (_req, res) => {
  sendDashboardIndex(res);
});

if (frontendDist) {
  app.use(express.static(frontendDist, { index: false }));
}

/** SPA: client-side routes (e.g. /event/:hash) — API routes above are matched first. */
app.get("*", (req, res, next) => {
  if (req.method !== "GET") return next();
  if (req.path.startsWith("/api")) return next();
  if (req.path === "/graph" || req.path === "/status") return next();
  if (indexHtmlPath && fs.existsSync(indexHtmlPath)) {
    res.sendFile(path.resolve(indexHtmlPath));
  } else {
    next();
  }
});

/** For startup logs (Combell debugging). */
export function getResolvedFrontendDist(): string | null {
  return frontendDist;
}

export default app;
