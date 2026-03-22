import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveCorsOrigin } from "./corsConfig";

test("unset env → *", () => {
  const o = resolveCorsOrigin({});
  assert.equal(o, "*");
});

test("single TABULAS_ORIGIN", () => {
  const o = resolveCorsOrigin({ TABULAS_ORIGIN: "https://tabulas.eu" });
  assert.equal(o, "https://tabulas.eu");
});

test("CORS_ORIGINS comma list uses callback that allows listed origins", async () => {
  const o = resolveCorsOrigin({
    CORS_ORIGINS: "https://aiactscan.eu, https://tabulas.eu",
  });
  assert.equal(typeof o, "function");
  const fn = o as (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;
  await new Promise<void>((resolve, reject) => {
    fn("https://aiactscan.eu", (err, allow) => {
      if (err) reject(err);
      else {
        assert.equal(allow, true);
        resolve();
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    fn("https://evil.example", (err, allow) => {
      if (err) reject(err);
      else {
        assert.equal(allow, false);
        resolve();
      }
    });
  });
});
