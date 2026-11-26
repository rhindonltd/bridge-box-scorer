import storybook from "eslint-plugin-storybook";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Packages the kernel and the pure modules must never import.
const IO_AND_FRAMEWORKS = [
  "react",
  "react-dom",
  "next",
  "next/*",
  "socket.io",
  "socket.io-client",
  "drizzle-orm",
  "drizzle-orm/*",
  "better-sqlite3",
  "fs",
  "fs/*",
  "node:*",
  "child_process",
  "server-only",
];

// Unit and integration tests, exempt from the module boundary rules.
const TEST_FILES = ["**/*.test.{ts,tsx}", "**/*.int.test.{ts,tsx}"];

/**
 * Boundary rule for one pure module (docs/design/modules.md §4): no framework
 * or I/O, and no imports beyond the kernel (`@/model`) and the module itself.
 * Inside a module, files import each other with `./` or `@/modules/<name>/…`,
 * never by climbing out with `../`.
 */
function moduleBlock(
  name,
  {
    allowTypesFrom = [],
    files = [`src/modules/${name}/**/*.{ts,tsx}`],
    ignores = [],
    io = false,
    allowPatterns = [],
    extraPatterns = [],
  } = {},
) {
  return {
    files,
    ignores: [...TEST_FILES, ...ignores],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          // A module listed here may be imported for its types only.
          paths: allowTypesFrom.map((other) => ({
            name: `@/modules/${other}`,
            allowTypeImports: true,
            message: `${name} may import only types from @/modules/${other}.`,
          })),
          patterns: [
            {
              group: ["../*"],
              message: `Inside ${name} use ./ or @/modules/${name}/…; never climb out with ../`,
            },
            ...(io
              ? []
              : [
                  {
                    group: IO_AND_FRAMEWORKS,
                    message: `${name} is pure: no framework or I/O imports.`,
                  },
                ]),
            {
              group: [
                "@/*",
                "!@/model",
                "!@/modules",
                "@/modules/*",
                `!@/modules/${name}`,
                ...allowTypesFrom.map((other) => `!@/modules/${other}`),
                ...allowPatterns,
              ],
              message: `${name} may import only the kernel (@/model) and itself${allowTypesFrom.length ? `, plus types from ${allowTypesFrom.map((o) => `@/modules/${o}`).join(", ")}` : ""}. See docs/design/modules.md.`,
            },
            // Re-including another module above also re-includes its internal
            // files, so block those separately: its entry only.
            ...allowTypesFrom.map((other) => ({
              group: [`@/modules/${other}/*`],
              message: `${name} may import ${other} only through its entry (@/modules/${other}).`,
            })),
            ...extraPatterns,
          ],
        },
      ],
    },
  };
}

// The core reaches a module only through its entry point.
const MODULE_ENTRY_ONLY = {
  group: [
    "@/modules/*/*",
    "!@/modules/movement-catalog/server",
    "!@/modules/interchange/usebio",
    "**/modules/*/*",
    "!**/modules/movement-catalog/server",
    "!**/modules/interchange/usebio",
  ],
  message:
    "Import a module through its entry point (@/modules/<name>, @/modules/movement-catalog/server or @/modules/interchange/usebio) only. See docs/design/modules.md.",
};

// Client code may use the database layer's types only.
const CLIENT_DB_TYPES_ONLY = {
  group: ["@/db", "@/db/*"],
  allowTypeImports: true,
  message:
    "Client code may import only types from @/db (use `import type`), so no database code reaches the browser.",
};

// services, lib and db sit below the socket layer and the UI.
const NO_UPWARD_IMPORTS = {
  group: [
    "@/socket/*",
    "!@/socket/socket-events",
    "!@/socket/socket-response",
    "@/hooks/*",
    "@/context/*",
    "@/components/*",
    "@/app/*",
  ],
  message:
    "services, lib and db may not import the socket layer, hooks, contexts, components or app code (only @/socket/socket-events and @/socket/socket-response). Take a callback from the caller instead.",
};

const eslintConfig = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "storybook-static/**",
    "coverage/**",
    // Vitest's HTML reporter output (`npm run coverage`).
    ".vitest/**",
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
      "src/modules/movement-catalog/storage/db/migrate.ts",
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

  // Module boundaries (docs/design/modules.md §4). The shared kernel
  // (src/model) is plain types and pure helpers that every module and the core
  // depend on, so it must depend on nothing but itself: no framework, no I/O,
  // and no other part of the app. Tests may use the app's generators as
  // fixtures, so they are exempt.
  {
    files: ["src/model/**/*.{ts,tsx}"],
    ignores: ["src/model/**/*.test.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: IO_AND_FRAMEWORKS,
              message:
                "The kernel (src/model) is pure: no framework or I/O imports.",
            },
            {
              group: ["@/*", "!@/model", "../*"],
              message:
                "The kernel (src/model) may import only itself. See docs/design/modules.md.",
            },
          ],
        },
      ],
    },
  },

  // Each pure module may import only the kernel and itself.
  moduleBlock("swiss"),
  moduleBlock("rulings"),
  moduleBlock("scoring"),
  moduleBlock("timer"),
  // The player's schedule, play position, result confirmation and screen flow.
  moduleBlock("play-flow"),

  // Whether the seated pairs let a game start: seat check, format rules.
  moduleBlock("seating"),
  // File formats (USEBIO, PBN): lays out results it is given, scores nothing.
  moduleBlock("interchange"),
  // Results views lay out scoring's numbers, so they read scoring's types.
  moduleBlock("results-views", { allowTypesFrom: ["scoring"] }),
  // The movement catalog's pure side (its main entry and everything outside
  // server.ts and storage/) is browser-safe, so it must not reach the stored
  // catalogue either.
  moduleBlock("movement-catalog", {
    ignores: [
      "src/modules/movement-catalog/server.ts",
      "src/modules/movement-catalog/storage/**",
    ],
    extraPatterns: [
      {
        group: [
          "./server",
          "./storage/*",
          "@/modules/movement-catalog/server",
          "@/modules/movement-catalog/storage/*",
        ],
        message:
          "The movement catalog's pure side may not import server.ts or storage/ (movements.db, the movement files).",
      },
    ],
  }),
  // The catalog's server side owns movements.db and the movement files, so it
  // may use I/O and open its database.
  moduleBlock("movement-catalog", {
    files: [
      "src/modules/movement-catalog/server.ts",
      "src/modules/movement-catalog/storage/**/*.{ts,tsx}",
    ],
    io: true,
    // Re-include @/db, block the rest of it, then re-include the one file
    // (a negation cannot reach inside an excluded folder).
    allowPatterns: ["!@/db", "@/db/*", "!@/db/open-database"],
  }),

  // The core reaches a module only through its entry point
  // (`@/modules/<name>`), never its internal files. Tests may reach internals
  // to drive a unit directly, so they are exempt.
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts", ".storybook/**/*.{ts,tsx}"],
    ignores: ["src/modules/**", "src/model/**", ...TEST_FILES],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [MODULE_ENTRY_ONLY],
        },
      ],
    },
  },
  // Client code (components, contexts, hooks, SWR helpers, and app/ outside
  // its server components and route handlers) may use the database layer's
  // TYPES only, so no database code can reach the browser. Server components
  // (page.tsx, layout.tsx) and route handlers read the database directly, so
  // they are excluded.
  {
    files: [
      "src/components/**/*.{ts,tsx}",
      "src/context/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/swr/**/*.{ts,tsx}",
      "src/app/**/*.{ts,tsx}",
    ],
    ignores: [
      ...TEST_FILES,
      "src/app/api/**",
      "src/app/**/route.ts",
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [MODULE_ENTRY_ONLY, CLIENT_DB_TYPES_ONLY],
        },
      ],
    },
  },
  // The lower core layers (services, lib, db) are called by routes, socket
  // handlers and the UI, never the other way round, so they must not import
  // the socket layer, hooks, contexts, components or app code. A service that
  // needs to broadcast takes a callback from its caller (e.g. sign-in-guard's
  // `raiseAlert`). The shared event names and the socket response type are the
  // exceptions: the client wrappers in lib/ emit and read them.
  {
    files: [
      "src/services/**/*.{ts,tsx}",
      "src/lib/api/**/*.{ts,tsx}",
      "src/db/**/*.{ts,tsx}",
    ],
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [MODULE_ENTRY_ONLY, NO_UPWARD_IMPORTS] },
      ],
    },
  },
  // The rest of lib/ is shared with the browser, so it also takes the
  // client rule: database types only. Server code that reads the database
  // belongs in services/, db/ or lib/api/.
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    ignores: [...TEST_FILES, "src/lib/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            MODULE_ENTRY_ONLY,
            NO_UPWARD_IMPORTS,
            CLIENT_DB_TYPES_ONLY,
          ],
        },
      ],
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
