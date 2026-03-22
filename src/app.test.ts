import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import fs from "fs";
import os from "os";
import path from "path";
import type { Express } from "express";

let app: Express;
let resetGraphForTests: (unlink?: boolean) => void;
let resetStatusForTests: () => void;
let tmpDir: string;

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dpp-app-test-"));
  process.env.DPP_GRAPH_PATH = path.join(tmpDir, "products.ttl");
  delete process.env.IOTA_RPC_URL;
  delete process.env.IOTA_PRIVATE_KEY;

  const appMod = await import("./app.js");
  const graphMod = await import("./graph.js");
  app = appMod.default;
  resetStatusForTests = appMod.resetStatusForTests;
  resetGraphForTests = graphMod.resetGraphForTests;
});

beforeEach(() => {
  resetGraphForTests(true);
  resetStatusForTests();
});

after(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

const validEvent = {
  type: "ObjectEvent",
  eventTime: "2025-01-15T10:00:00.000Z",
  bizStep: "commissioning",
  epcList: ["https://id.gs1.org/01/05412345000013"],
};

test("GET /status returns service metadata", async () => {
  const res = await request(app).get("/status").expect(200);
  assert.equal(res.body.service, "dpp-event");
  assert.equal(res.body.eventCount, 0);
});

test("GET / serves SPA when frontend is built", async () => {
  const res = await request(app).get("/");
  if (res.status === 503) {
    assert.match(res.text, /Frontend not built/);
    return;
  }
  assert.equal(res.status, 200);
  assert.equal(res.headers["content-type"]?.includes("text/html"), true);
  assert.match(
    res.text,
    /log\.tabulas\.eu|DPP Event Log|root|Send EPCIS|Event timeline/i
  );
});

test("GET /api/timeline lists events after POST (oldest-first)", async () => {
  await request(app).post("/events").send(validEvent).expect(201);
  const res = await request(app).get("/api/timeline").expect(200);
  assert.equal(res.body.order, "oldest-first");
  assert.equal(res.body.events.length, 1);
  assert.equal(res.body.events[0].hash.length, 64);
  assert.equal(res.body.events[0].classification, "iota");
});

test("POST /events rejects invalid payload", async () => {
  const res = await request(app)
    .post("/events")
    .send({ type: "ObjectEvent" })
    .expect(400);
  assert.ok(res.body.error);
});

test("POST /events accepts valid event and returns hash", async () => {
  const res = await request(app).post("/events").send(validEvent).expect(201);
  assert.ok(res.body.hash);
  assert.match(res.body.hash, /^[a-f0-9]{64}$/);
  assert.ok(res.body.triplesAdded > 0);
  assert.equal(res.body.classification, "iota");
});

test("GET /graph returns Turtle after POST", async () => {
  await request(app).post("/events").send(validEvent).expect(201);
  const res = await request(app).get("/graph").expect(200);
  assert.match(res.text, /@prefix dpp:/);
  assert.match(res.text, /dpp:sha256/);
});

test("graph-only skips on-chain field in response", async () => {
  const ev = {
    ...validEvent,
    bizStep: "commissioning",
    "dpp:graphOnly": true,
  };
  const res = await request(app).post("/events").send(ev).expect(201);
  assert.equal(res.body.classification, "graph-only");
  assert.equal(res.body.iotaDigest, null);
});
