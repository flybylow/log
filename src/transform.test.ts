import { test } from "node:test";
import assert from "node:assert/strict";
import { transform } from "./transform";

test("transform emits Turtle with event URI and prefixes", () => {
  const event = {
    type: "ObjectEvent",
    eventTime: "2025-01-15T10:00:00.000Z",
    bizStep: "commissioning",
    epcList: ["https://id.gs1.org/01/05412345000013"],
  };
  const ttl = transform(event);
  assert.match(ttl, /@prefix dpp:/);
  assert.match(ttl, /dpp:LifecycleEvent/);
  assert.match(ttl, /dpp:eventTime/);
  assert.match(ttl, /epcis:commissioning/);
});
