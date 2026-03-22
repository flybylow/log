/**
 * Lightweight Turtle subset parser for dpp-event graph output (no n3 in browser).
 * Handles: @prefix, <uri>, prefixed names, string literals, ; continuation, a rdf:type lists.
 */

export type NodeKind = "event" | "product" | "location" | "actor" | "hash" | "other";

export type Triple = {
  subject: string;
  predicate: string; // full URI
  object: string; // URI or literal (with optional ^^type)
  objectKind: "uri" | "literal";
};

const PREFIXES: Record<string, string> = {
  dpp: "https://tabulas.eu/ontology/dpp/",
  epcis: "https://ref.gs1.org/cbv/",
  schema: "https://schema.org/",
  gs1: "https://id.gs1.org/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
};

const EVENT_TYPES = new Set([
  "https://tabulas.eu/ontology/dpp/LifecycleEvent",
  "https://tabulas.eu/ontology/dpp/ObjectEvent",
  "https://tabulas.eu/ontology/dpp/AggregationEvent",
  "https://tabulas.eu/ontology/dpp/TransactionEvent",
]);

export function expandPrefixedName(term: string): string {
  const t = term.trim();
  if (t.startsWith("<") && t.endsWith(">")) {
    return t.slice(1, -1);
  }
  const colon = t.indexOf(":");
  if (colon === -1) return t;
  const pfx = t.slice(0, colon);
  const rest = t.slice(colon + 1);
  const base = PREFIXES[pfx];
  if (!base) return t;
  return base + rest;
}

function stripPrefixes(ttl: string): string {
  return ttl
    .split(/\r?\n/)
    .filter((line) => !/^\s*@prefix\s/i.test(line.trim()))
    .join("\n");
}

/** Collect statement strings (content without trailing dot). */
function collectStatements(ttl: string): string[] {
  const lines = stripPrefixes(ttl).split(/\r?\n/);
  const out: string[] = [];
  let buf = "";
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    buf += (buf ? " " : "") + t;
    if (t.endsWith(".")) {
      out.push(buf.slice(0, -1).trim());
      buf = "";
    }
  }
  return out;
}

function parseStringLiteral(s: string, start: number): { end: number; value: string } {
  let i = start;
  if (s[i] !== '"') throw new Error("expected string");
  i++;
  let value = "";
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      i++;
      if (i < s.length) value += s[i];
      i++;
      continue;
    }
    if (c === '"') {
      return { end: i + 1, value };
    }
    value += c;
    i++;
  }
  throw new Error("unterminated string");
}

function parseObjectValue(objStr: string): { raw: string; kind: "uri" | "literal" } {
  const t = objStr.trim();
  if (t.startsWith("<")) {
    const end = t.indexOf(">");
    return { raw: t.slice(1, end), kind: "uri" };
  }
  if (t.startsWith('"')) {
    const lit = parseStringLiteral(t, 0);
    let tail = t.slice(lit.end).trimStart();
    let raw = `"${lit.value}"`;
    if (tail.startsWith("^^")) {
      tail = tail.slice(2).trimStart();
      if (tail.startsWith("<")) {
        const end = tail.indexOf(">");
        raw = `"${lit.value}"^^<${tail.slice(1, end)}>`;
      } else {
        const m = /^([a-zA-Z_][\w-]*:[\w-]+)/.exec(tail);
        if (m) raw = `"${lit.value}"^^${expandPrefixedName(m[1])}`;
      }
    }
    return { raw, kind: "literal" };
  }
  const m = /^([a-zA-Z_][\w-]*:[\w-]+)/.exec(t);
  if (m) return { raw: expandPrefixedName(m[1]), kind: "uri" };
  throw new Error(`cannot parse object: ${t.slice(0, 60)}`);
}

function splitTopLevelCommas(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let buf = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(") depth++;
    if (c === ")" && depth > 0) depth--;
    if (c === "," && depth === 0) {
      parts.push(buf.trim());
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function parseStatement(statement: string): Triple[] {
  const triples: Triple[] = [];
  const s = statement.trim();
  if (!s) return triples;

  const subjMatch = /^<([^>]+)>\s+/.exec(s);
  if (!subjMatch) return triples;
  const subject = subjMatch[1];
  const pos = subjMatch[0].length;

  const rest = s.slice(pos).trim();
  const parts = rest.split(/\s*;\s*/).map((p) => p.trim());

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("a ") || part === "a") {
      const afterA = part.startsWith("a ") ? part.slice(2).trim() : "";
      const types = splitTopLevelCommas(afterA);
      for (const t of types) {
        const uri = expandPrefixedName(t.trim());
        triples.push({
          subject,
          predicate: PREFIXES.rdf + "type",
          object: uri,
          objectKind: "uri",
        });
      }
      continue;
    }

    const predMatch = /^([a-zA-Z_][\w-]*:[\w-]+)\s+/.exec(part);
    if (!predMatch) continue;
    const predRaw = predMatch[1];
    const predicate = expandPrefixedName(predRaw);
    const idx = predMatch[0].length;
    const objPart = part.slice(idx).trim();

    // list of objects separated by comma (e.g. multiple types not here; products can repeat as separate lines)
    const objStrs = splitTopLevelCommas(objPart);
    for (const os of objStrs) {
      const trimmed = os.trim();
      const parsed = parseObjectValue(trimmed);
      triples.push({
        subject,
        predicate,
        object: parsed.raw,
        objectKind: parsed.kind,
      });
    }
  }

  return triples;
}

export function parseTurtle(ttl: string): Triple[] {
  const all: Triple[] = [];
  for (const stmt of collectStatements(ttl)) {
    all.push(...parseStatement(stmt));
  }
  return all;
}

function literalValue(raw: string): string {
  const m = /^"((?:[^"\\]|\\.)*)"/.exec(raw);
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : raw;
}

function predicateLocalName(full: string): string {
  const hash = full.lastIndexOf("#");
  const slash = full.lastIndexOf("/");
  const i = Math.max(hash, slash);
  return i >= 0 ? full.slice(i + 1) : full;
}

export type ParsedGraphEntity = {
  id: string;
  kind: NodeKind;
  label: string;
  uri?: string;
  /** Extra literals keyed by predicate local name */
  literals: Record<string, string>;
};

export type ParsedGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

/** Build entities and edges for visualization from triples. */
export function triplesToGraph(triples: Triple[]): {
  entities: Map<string, ParsedGraphEntity>;
  edges: ParsedGraphEdge[];
  eventSubjects: string[];
} {
  const entities = new Map<string, ParsedGraphEntity>();
  const edges: ParsedGraphEdge[] = [];
  const eventSubjects = new Set<string>();

  function ensureEntity(id: string, kind: NodeKind, label: string, uri?: string): ParsedGraphEntity {
    let e = entities.get(id);
    if (!e) {
      e = { id, kind, label, uri, literals: {} };
      entities.set(id, e);
    } else {
      if (kind !== "other" && e.kind === "other") e.kind = kind;
      if (label && e.label === "…") e.label = label;
    }
    return e;
  }

  for (const t of triples) {
    const pred = t.predicate;
    const pl = predicateLocalName(pred);

    if (pred === PREFIXES.rdf + "type" && t.objectKind === "uri") {
      if (EVENT_TYPES.has(t.object)) {
        eventSubjects.add(t.subject);
        ensureEntity(t.subject, "event", "Event", t.subject).kind = "event";
      }
    }

    if (pl === "eventTime" && t.objectKind === "literal") {
      const lit = literalValue(t.object);
      const e = ensureEntity(t.subject, "event", "Event", t.subject);
      e.literals.eventTime = lit;
    }
    if (pl === "bizStep" && t.objectKind === "uri") {
      const e = ensureEntity(t.subject, "event", "Event", t.subject);
      e.literals.bizStep = predicateLocalName(t.object);
    }
    if (pl === "sha256" && t.objectKind === "literal") {
      const full = literalValue(t.object);
      const id = `hash:${t.subject}`;
      const he = ensureEntity(id, "hash", full.slice(0, 8), undefined);
      he.literals.sha256 = full;
      edges.push({
        id: `e-${t.subject}-sha256`,
        source: t.subject,
        target: id,
        label: "sha256",
      });
    }
    if (pl === "iotaDigest" && t.objectKind === "literal") {
      const v = literalValue(t.object);
      const id = `literal:iota:${t.subject}`;
      ensureEntity(id, "other", v, undefined);
      edges.push({
        id: `e-${t.subject}-iota`,
        source: t.subject,
        target: id,
        label: "iotaDigest",
      });
    }

    const linkPredicates: { key: string; targetKind: NodeKind }[] = [
      { key: "product", targetKind: "product" },
      { key: "inputProduct", targetKind: "product" },
      { key: "outputProduct", targetKind: "product" },
      { key: "readPoint", targetKind: "location" },
      { key: "bizLocation", targetKind: "location" },
    ];

    for (const { key, targetKind } of linkPredicates) {
      if (pl === key && t.objectKind === "uri") {
        const uri = t.object;
        const label = lastUriSegment(uri);
        ensureEntity(uri, targetKind, label, uri);
        edges.push({
          id: `e-${t.subject}-${key}-${uri}`,
          source: t.subject,
          target: uri,
          label: key,
        });
      }
    }

    if (pl === "actor" && t.objectKind === "literal") {
      const val = literalValue(t.object);
      const id = `actor:${hashStr(val)}`;
      ensureEntity(id, "actor", val, undefined);
      edges.push({
        id: `e-${t.subject}-actor-${id}`,
        source: id,
        target: t.subject,
        label: "actor",
      });
    }

    // Other `dpp:*` string literals on the event (inspector / labels); sha256 handled above
    if (
      pred.startsWith(PREFIXES.dpp) &&
      t.objectKind === "literal" &&
      pl !== "sha256"
    ) {
      const e = entities.get(t.subject);
      if (e) e.literals[pl] = literalValue(t.object);
    }
  }

  // Label events: bizStep + short time
  for (const uri of eventSubjects) {
    const e = entities.get(uri);
    if (!e) continue;
    const step = e.literals.bizStep || "event";
    const time = e.literals.eventTime
      ? formatTime(e.literals.eventTime)
      : "";
    e.label = time ? `${step} · ${time}` : step;
    e.kind = "event";
  }

  // Drop orphan "other" nodes without edges? keep for now

  return {
    entities,
    edges,
    eventSubjects: [...eventSubjects].sort((a, b) => {
      const ta = entities.get(a)?.literals.eventTime || "";
      const tb = entities.get(b)?.literals.eventTime || "";
      return ta.localeCompare(tb);
    }),
  };
}

function hashStr(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function lastUriSegment(uri: string): string {
  const last = uri.split("/").filter(Boolean).pop() || uri;
  return last.length > 48 ? last.slice(0, 20) + "…" : last;
}

function formatTime(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso.slice(0, 16);
  return new Date(d).toISOString().replace("T", " ").slice(0, 16) + "Z";
}

export function parseTurtleToGraph(ttl: string) {
  const triples = parseTurtle(ttl);
  return triplesToGraph(triples);
}
