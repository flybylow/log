import type { CorsOptions } from "cors";

/**
 * CORS origin for the write API. Browsers send only scheme+host+port (no path),
 * so https://aiactscan.eu covers https://aiactscan.eu/log.
 *
 * - `CORS_ORIGINS` — comma-separated list (preferred for multiple frontends)
 * - `TABULAS_ORIGIN` — single origin (backward compatible)
 * - unset — `*` (allow any; fine for local dev, tighten in production)
 */
export function resolveCorsOrigin(env: typeof process.env): CorsOptions["origin"] {
  const raw = env.CORS_ORIGINS || env.TABULAS_ORIGIN;
  if (!raw || raw.trim() === "*") return "*";

  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return "*";
  if (list.length === 1) return list[0];

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (list.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  };
}
