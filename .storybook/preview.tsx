import type { Preview } from "@storybook/nextjs-vite";
import { mswLoader } from "msw-storybook-addon/csf3";
import "../src/styles/globals.css";

const preview: Preview = {
  // MSW intercepts fetch() at the network layer (via the generated
  // public/mockServiceWorker.js) so SWR-backed containers can render their real
  // loaded states in stories instead of hanging on a spinner. Stories declare
  // their responses with `parameters.msw = { handlers: [...] }`. Requests with
  // no handler are bypassed, so stories that need no data are unaffected.
  loaders: [mswLoader()],

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Mount the Next.js App Router context for every story. Many components
    // render a shared header (HeaderBar / PageLayout / GamePageLayout /
    // GameHeaderBar) whose back button uses `useBackNavigation` -> `useRouter`,
    // which throws "invariant expected app router to be mounted" without this.
    // Stories can still override `nextjs.navigation` (e.g. a specific pathname)
    // at the component/story level.
    nextjs: {
      appDirectory: true,
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      //
      // a11y is ENFORCED globally: every story fails CI on accessibility
      // violations by default. A story may opt OUT with `parameters.a11y.test =
      // "off"` (or "todo") only with a documented rationale for a known,
      // out-of-scope issue.
      test: "error",
    },
  },

  decorators: [
    (Story) => (
      <div className="h-dvh bg-gray-100 overflow-hidden">
        <div className="mx-auto max-w-2xl h-full bg-white flex flex-col overflow-hidden">
          <Story />
        </div>
      </div>
    ),
  ],
};

export default preview;
