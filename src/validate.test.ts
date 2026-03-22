import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./validate";

test("validate accepts minimal valid ObjectEvent", () => {
  const event = {
    type: "ObjectEvent",
    eventTime: "2025-01-15T10:00:00.000Z",
    epcList: ["https://id.gs1.org/01/05412345000013"],
  };
  const r = validate(event);
  assert.equal(r.valid, true);
  assert.equal(r.errors.length, 0);
});

test("validate rejects missing type", () => {
  const r = validate({ eventTime: "2025-01-15T10:00:00.000Z", epcList: ["x"] });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes("type")));
});

test("validate rejects bad eventTime", () => {
  const r = validate({
    type: "ObjectEvent",
    eventTime: "not-a-date",
    epcList: ["x"],
  });
  assert.equal(r.valid, false);
});

test("validate requires epcList, inputEPCList, or quantityList", () => {
  const r = validate({
    type: "ObjectEvent",
    eventTime: "2025-01-15T10:00:00.000Z",
  });
  assert.equal(r.valid, false);
});
