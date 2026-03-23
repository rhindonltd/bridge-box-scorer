import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": path.resolve(__dirname, "src"),
};

export default defineConfig({
  resolve: { alias }, // root alias

  test: {
    projects: [
      // Node tests
      {
        resolve: { alias }, // important: apply alias per project
        test: {
          globals: true,
          environment: "node",
          include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
        },
      },

      // Storybook tests
      // {
      //   extends: true,
      //   plugins: [
      //     storybookTest({ configDir: path.join(dirname, ".storybook") }),
      //   ],
      //   resolve: { alias }, // also apply alias here if your storybook code uses it
      //   test: {
      //     browser: {
      //       enabled: true,
      //       headless: true,
      //       provider: playwright({}),
      //       instances: [{ browser: "chromium" }],
      //     },
      //     setupFiles: [".storybook/vitest.setup.ts"],
      //   },
      // },
    ],
  },
});
