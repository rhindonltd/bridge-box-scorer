import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse, delay } from "msw";
import { expect, waitFor, within } from "storybook/test";
import { BridgewebsSettingsPage } from "@/app/settings/bridgewebs/BridgewebsSettingsPage";
import { swrKeys } from "@/swr/swr-keys";

/**
 * Container story for the BridgeWebs settings screen: renders the real SWR
 * container with its status response mocked by MSW, complementing the
 * prop-driven `BridgewebsSettingsForm` stories. The `fetcher` unwraps a
 * `{ result }` envelope, so handlers respond in that shape.
 */
const meta: Meta<typeof BridgewebsSettingsPage> = {
  title: "App/Settings/Bridgewebs/BridgewebsSettingsPage",
  component: BridgewebsSettingsPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/settings/bridgewebs" },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof BridgewebsSettingsPage>;

/** Already configured: the club code is prefilled and a password is stored. */
export const Configured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.bridgewebs(), () =>
          HttpResponse.json({ result: { configured: true, club: "anytownbc" } }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByLabelText("BridgeWebs Club Code")).toHaveValue(
        "anytownbc",
      ),
    );
    expect(canvas.getByText(/A password is saved/i)).toBeInTheDocument();
  },
};

/** Not configured yet: blank form, password required on first save. */
export const Unconfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.bridgewebs(), () =>
          HttpResponse.json({ result: { configured: false, club: null } }),
        ),
      ],
    },
  },
};

/** Status still loading: the container shows its spinner. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.bridgewebs(), async () => {
          await delay("infinite");
          return HttpResponse.json({ result: { configured: false, club: null } });
        }),
      ],
    },
  },
};
