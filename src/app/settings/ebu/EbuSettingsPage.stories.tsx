import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw/utils/delay";
import { expect, waitFor, within } from "storybook/test";
import { EbuSettingsPage } from "@/app/settings/ebu/EbuSettingsPage";
import { swrKeys } from "@/swr/swr-keys";

/**
 * Container story for the EBU settings screen: renders the real SWR container
 * with its EBU-status and club-record responses mocked by MSW, complementing
 * the prop-driven `EbuSettingsForm` stories. The `fetcher` unwraps a
 * `{ result }` envelope, so handlers respond in that shape.
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

const clubHandler = (club: { name: string; clubNumber: string } | null) =>
  http.get(swrKeys.club(), () =>
    HttpResponse.json({ result: { club: club && { id: 1, ...club } } }),
  );

/** Configured: club details prefilled and a password is stored. */
export const Configured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.ebu(), () =>
          HttpResponse.json({
            result: { configured: true, ebuNumber: "1234567" },
          }),
        ),
        clubHandler({ name: "Anytown Bridge Club", clubNumber: "1234567" }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByLabelText("EBU Club Number")).toHaveValue("1234567"),
    );
    expect(canvas.getByLabelText("Club Name")).toHaveValue(
      "Anytown Bridge Club",
    );
    expect(canvas.getByText(/A password is saved/i)).toBeInTheDocument();
  },
};

/** Nothing set up yet: blank form; the password is optional. */
export const Unconfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.ebu(), () =>
          HttpResponse.json({ result: { configured: false, ebuNumber: null } }),
        ),
        clubHandler(null),
      ],
    },
  },
};

/** Still loading: the container shows its spinner. */
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
        clubHandler(null),
      ],
    },
  },
};
