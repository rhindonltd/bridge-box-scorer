import storybook from "eslint-plugin-storybook";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "storybook-static/**",
    "coverage/**",
    "dist/**",
  ]),

  ...nextVitals,
  ...nextTs,
  ...storybook.configs["flat/recommended"],

  // ✅ TEMP FIX for ESLint 10 + eslint-plugin-react crash
  {
    settings: {
      react: {
        version: "19", // or "detect" → but detect is what breaks
      },
    },
  },
]);

export default eslintConfig;
