/**
 * Empty the persisted Turtle file (prefix headers only) and, when possible,
 * clear the *running* API’s in-memory graph + timeline via DELETE /graph.
 * Loads repo root `.env` so `DPP_GRAPH_PATH`, `PORT`, and secrets are respected.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { clearPersistedGraph, graphFilePath } from "../src/graph";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

function isConnectionRefused(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "ECONNREFUSED" || err?.cause?.code === "ECONNREFUSED";
}

async function tryClearRunningApi(origin: string, secret: string): Promise<boolean> {
  const url = `${origin.replace(/\/$/, "")}/graph`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (res.ok) {
    console.log(`Cleared running API at ${url} (memory, persisted file, timeline, counters).`);
    return true;
  }
  const body = await res.text().catch(() => "");
  if (res.status === 404) {
    console.warn(
      `DELETE ${url} returned 404 (graph reset not enabled on this process). Clearing file only.`
    );
    console.warn(
      "Restart the API so it loads DPP_GRAPH_RESET_SECRET from .env, then run npm run clear:graph again (or stop the server and use npm run dev:clean)."
    );
  } else {
    console.warn(`DELETE ${url} returned ${res.status} ${body.trim()}. Clearing file only.`);
  }
  return false;
}

async function main() {
  const secret = process.env.DPP_GRAPH_RESET_SECRET?.trim();
  const port = process.env.PORT ?? "3001";
  const origin = (process.env.DPP_API_ORIGIN?.trim() || `http://127.0.0.1:${port}`).replace(
    /\/$/,
    ""
  );

  if (secret) {
    try {
      const ok = await tryClearRunningApi(origin, secret);
      if (ok) return;
    } catch (e: unknown) {
      if (isConnectionRefused(e)) {
        console.warn(`No API at ${origin} (connection refused). Clearing file only.`);
      } else {
        throw e;
      }
    }
  }

  clearPersistedGraph();
  console.log(`Cleared graph at ${graphFilePath()} (prefix headers only).`);
  if (!secret) {
    console.log("Restart the API process if it is running so in-memory state matches the file.");
    console.log(
      "Tip: set DPP_GRAPH_RESET_SECRET and rerun to clear a running server without restart."
    );
  } else {
    console.log("Restart the API process if it is running so in-memory state matches the file.");
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
