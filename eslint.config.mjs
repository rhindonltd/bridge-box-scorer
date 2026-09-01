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
