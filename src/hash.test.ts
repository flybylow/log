import { test } from "node:test";
import assert from "node:assert/strict";
import { hashEvent } from "./hash";

test("hash is deterministic for same object", () => {
  const a = { type: "ObjectEvent", eventTime: "2025-01-01T00:00:00.000Z", epcList: ["urn:epc"] };
  assert.equal(hashEvent(a), hashEvent(a));
});

test("hash changes when keys differ", () => {
  const a = { type: "ObjectEvent", eventTime: "2025-01-01T00:00:00.000Z", epcList: ["urn:epc"] };
  const b = { ...a, bizStep: "shipping" };
  assert.notEqual(hashEvent(a), hashEvent(b));
});
