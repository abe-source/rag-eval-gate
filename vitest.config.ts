import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL("./src/", import.meta.url));
const evalsDir = fileURLToPath(new URL("./evals/", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@evals\//, replacement: evalsDir },
      { find: /^@\//, replacement: srcDir },
    ],
  },
  test: {
    env: { DEEPEVAL_TELEMETRY_OPT_OUT: "1" },
    slowTestThreshold: 60000,
    reporters: ["default", "allure-vitest/reporter"],
  },
});
