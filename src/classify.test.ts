import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "./classify";

test("graph-only when dpp:graphOnly", () => {
  const c = classify({
    type: "ObjectEvent",
    eventTime: "2025-01-01T00:00:00.000Z",
    epcList: ["x"],
    "dpp:graphOnly": true,
  });
  assert.equal(c.target, "graph-only");
});

test("pod when dpp:private", () => {
  const c = classify({
    type: "ObjectEvent",
    eventTime: "2025-01-01T00:00:00.000Z",
    epcList: ["x"],
    "dpp:private": true,
  });
  assert.equal(c.target, "pod");
});

test("iota for commissioning", () => {
  const c = classify({
    type: "ObjectEvent",
    eventTime: "2025-01-01T00:00:00.000Z",
    epcList: ["x"],
    bizStep: "commissioning",
  });
  assert.equal(c.target, "iota");
});
