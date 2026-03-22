import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import express from "express";
import { wwwRedirectMiddleware } from "./wwwRedirect";

test("www redirect 301 to https apex with path and query", async () => {
  const app = express();
  app.use(wwwRedirectMiddleware("log.tabulas.eu"));
  app.get("/status", (_req, res) => res.json({ ok: true }));

  const res = await request(app)
    .get("/status?foo=1")
    .set("Host", "www.log.tabulas.eu")
    .redirects(0);

  assert.equal(res.status, 301);
  assert.equal(res.headers.location, "https://log.tabulas.eu/status?foo=1");
});

test("apex host is not redirected", async () => {
  const app = express();
  app.use(wwwRedirectMiddleware("log.tabulas.eu"));
  app.get("/status", (_req, res) => res.json({ ok: true }));

  const res = await request(app).get("/status").set("Host", "log.tabulas.eu");

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test("other www host is not redirected", async () => {
  const app = express();
  app.use(wwwRedirectMiddleware("log.tabulas.eu"));
  app.get("/", (_req, res) => res.send("ok"));

  const res = await request(app).get("/").set("Host", "www.other.example");

  assert.equal(res.status, 200);
  assert.equal(res.text, "ok");
});
