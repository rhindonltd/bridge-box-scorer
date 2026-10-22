import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { expect, waitFor, within } from "storybook/test";
import { EbuSettingsPage } from "@/app/settings/ebu/EbuSettingsPage";
import { swrKeys } from "@/swr/swr-keys";

/**
 * Container story for the EBU settings screen: renders the real SWR container
 * with its status response mocked by MSW, complementing the prop-driven
 * `EbuSettingsForm` stories. The `fetcher` unwraps a `{ result }` envelope, so
 * handlers respond in that shape.
 */
const meta: Meta<typeof EbuSettingsPage> = {
  title: "App/Settings/Ebu/EbuSettingsPage",
  component: EbuSettingsPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/settings/ebu" },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EbuSettingsPage>;

/** Already configured: the EBU number is prefilled and a password is stored. */
export const Configured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.ebu(), () =>
          HttpResponse.json({
            result: { configured: true, ebuNumber: "1234567" },
          }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByLabelText("EBU Club Number")).toHaveValue("1234567"),
    );
    expect(canvas.getByText(/A password is saved/i)).toBeInTheDocument();
  },
};

/** Not configured yet: blank form, password required on first save. */
export const Unconfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.ebu(), () =>
          HttpResponse.json({ result: { configured: false, ebuNumber: null } }),
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
        http.get(swrKeys.ebu(), async () => {
          await delay("infinite");
          return HttpResponse.json({
            result: { configured: false, ebuNumber: null },
          });
        }),
      ],
    },
  },
};
