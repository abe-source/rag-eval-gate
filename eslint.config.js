import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "src/index/**",
      ".deepeval/**",
      "dist/**",
      "allure-results/**",
      "allure-report/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.node } },
  prettier,
);
