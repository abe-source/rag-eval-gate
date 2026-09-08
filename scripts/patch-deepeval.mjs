import { readFileSync, writeFileSync } from "node:fs";

// deepeval ships a stale dist/telemetry.js that shadows dist/telemetry/ and is
// missing captureCliCommand; forward it to the real implementation.
const target = "node_modules/deepeval/dist/telemetry.js";
const shim = 'module.exports = require("./telemetry/index.js");\n';
try {
  if (readFileSync(target, "utf8") !== shim) {
    writeFileSync(target, shim);
    console.log("patched deepeval dist/telemetry.js");
  }
} catch (err) {
  console.warn("could not patch deepeval telemetry.js:", err.message);
}
