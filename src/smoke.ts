// Manual smoke: validate → transform → hash → classify (prints to stdout)
import { validate } from "./validate";
import { transform } from "./transform";
import { hashEvent } from "./hash";
import { classify } from "./classify";
import fs from "fs";
import path from "path";

const exampleFile = path.join(__dirname, "../examples/vanmarcke-inloopdouche.json");
const event = JSON.parse(fs.readFileSync(exampleFile, "utf-8"));

console.log("=== STEP 1: VALIDATE ===");
const v = validate(event);
console.log(v.valid ? "PASS" : "FAIL", v.errors);

console.log("\n=== STEP 2: TRANSFORM ===");
const { turtle } = transform(event);
console.log(turtle);

console.log("\n=== STEP 3: HASH ===");
const hash = hashEvent(event);
console.log("SHA-256:", hash);

console.log("\n=== STEP 4: CLASSIFY ===");
const c = classify(event);
console.log(`Target: ${c.target} (${c.reason})`);

console.log("\n=== DONE ===");
