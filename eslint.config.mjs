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
    "playwright-report/**",
    "test-results/**",
    // Generated MSW worker script (vendored, "do NOT modify"): its bundled
    // eslint-disable directive would otherwise report as an unused directive.
    "public/mockServiceWorker.js",
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

  // Allow intentionally-unused identifiers when prefixed with an underscore.
  // This is the conventional way to signal "declared for API/contract reasons
  // but not consumed here" (e.g. destructured props, validated payload fields).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // Server-side code must log through the structured pino logger (`@/lib/log`),
  // never `console.*`. This keeps logs JSON/correlated and lets the appliance
  // ship them. Client components, CLI scripts, migrations and tests are
  // exempted in the overrides below.
  {
    rules: {
      "no-console": "error",
    },
  },

  // Client-side React components run in the browser, where pino is not
  // available and `console.warn`/`console.error` are the appropriate surface
  // for diagnostics. Allow those two levels in `.tsx` files (React components);
  // `console.log`/`debug`/`info` remain banned to discourage stray debug output.
  {
    files: ["**/*.tsx"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  // CLI / runtime scripts and DB migrations run outside the server bundle and
  // print progress directly to the terminal, so plain `console` is correct.
  {
    files: [
      "src/scripts/**/*.ts",
      "scripts/**/*.{ts,mjs,cjs}",
      "src/db/**/migrate.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },

  // Tests, stories, storybook config, test helpers and Playwright specs may use
  // console freely (assertions, debugging, fixtures).
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.int.test.{ts,tsx}",
      "**/*.stories.{ts,tsx}",
      ".storybook/**/*.{ts,tsx}",
      "src/socket/test/**/*.ts",
      "tests/**/*.ts",
    ],
    rules: {
      "no-console": "off",
    },
  },

  // CommonJS files (.cjs) legitimately use require(); these are Node preload
  // shims and scripts that cannot be ES modules.
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Playwright tests are not React components. The React Hooks rules misfire
  // here — most notably on Playwright's fixture `use()` callback, which the
  // rules-of-hooks rule mistakes for the React `use` hook.
  {
    files: ["tests/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },

  // Allow `any` in test files, mock factories, storybook decorators, and test helpers
  // where precise typing of mock returns adds no value.
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/*.int.test.{ts,tsx}",
      "**/*.stories.{ts,tsx}",
      ".storybook/**/*.{ts,tsx}",
      "src/socket/test/**/*.ts",
      // Playwright E2E / journey tests and their helpers.
      "tests/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
