// Step 3: HASH
// SHA-256 of canonicalized JSON (sorted keys, no whitespace).
// This hash is what gets notarized on IOTA.

import { createHash } from "crypto";

export function hashEvent(event: any): string {
  const canonical = canonicalize(event);
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalize(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k]));
  return "{" + pairs.join(",") + "}";
}
