import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse, delay } from "msw";
import { expect, waitFor, within } from "storybook/test";
import { ClubSettingsPage } from "@/app/settings/club/ClubSettingsPage";
import { swrKeys } from "@/swr/swr-keys";

/**
 * Container story for the club-settings screen. Unlike the presentational
 * `ClubSettingsForm` stories (which drive state through props), these render the
 * real SWR container with its network responses mocked by MSW, so the loading
 * and loaded states are exercised end-to-end.
 *
 * The `fetcher` unwraps a `{ result }` envelope, so handlers respond in that
 * shape.
 */
const meta: Meta<typeof ClubSettingsPage> = {
  title: "App/Settings/Club/ClubSettingsPage",
  component: ClubSettingsPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/settings/club" },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ClubSettingsPage>;

/** An existing club record is returned by the API and prefills the form. */
export const Loaded: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.club(), () =>
          HttpResponse.json({
            result: { club: { name: "Anytown Bridge Club", clubNumber: "12345" } },
          }),
        ),
      ],
    },
  },
  // Prove the mock is actually intercepting: the container must leave its
  // loading spinner and prefill the form from the mocked response.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() =>
      expect(canvas.getByLabelText("Club Name")).toHaveValue(
        "Anytown Bridge Club",
      ),
    );
    expect(canvas.getByLabelText("EBU Club Number")).toHaveValue("12345");
  },
};

/** No club configured yet: the API returns an empty record and the form is blank. */
export const Unconfigured: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.club(), () =>
          HttpResponse.json({ result: { club: null } }),
        ),
      ],
    },
  },
};

/** The club record is still loading: the container shows its spinner. */
export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(swrKeys.club(), async () => {
          // Never resolve within the story's lifetime, holding the loading state.
          await delay("infinite");
          return HttpResponse.json({ result: { club: null } });
        }),
      ],
    },
  },
};
