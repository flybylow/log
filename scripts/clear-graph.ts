/**
 * Rewrite the persisted Turtle file to prefix headers only (no data triples).
 * Loads repo root `.env` so `DPP_GRAPH_PATH` is respected.
 * Restart the API after running so in-memory graph matches the file.
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { clearPersistedGraph, graphFilePath } from "../src/graph";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

clearPersistedGraph();
console.log(`Cleared graph at ${graphFilePath()} (prefix headers only).`);
console.log("Restart the API process if it is running so in-memory state matches the file.");
