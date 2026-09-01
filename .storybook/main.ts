import type { StorybookConfig } from "@storybook/nextjs-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: "@storybook/nextjs-vite",
  viteFinal: async (viteConfig) => {
    // Storybook renders components in a browser context, so the real
    // `server-only` package (imported transitively by server modules) would
    // throw. Alias it to a no-op stub, matching vite.config.ts.
    viteConfig.resolve ??= {};
    viteConfig.resolve.alias = {
      ...viteConfig.resolve.alias,
      "server-only": path.resolve(dirname, "../test/stubs/server-only.ts"),
    };
    return viteConfig;
  },
};
export default config;
