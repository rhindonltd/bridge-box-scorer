import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
import { userEvent, within } from "storybook/test";
import { CreateGamePage } from "@/app/create/CreateGamePage";

// The BridgeWebs events endpoint takes a ?date= query; match on path so the
// handler applies regardless of the (today's-date) query string.
const BRIDGEWEBS_EVENTS = "/api/games/bridgewebs/events";

const meta: Meta<typeof CreateGamePage> = {
  title: "App/Create/CreateGamePage",
  component: CreateGamePage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/create",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof CreateGamePage>;

/**
 * BridgeWebs not configured (or unreachable): the form degrades gracefully to
 * a plain free-text Event Name with no BridgeWebs switch — the default
 * create-game experience.
 */
export const NoBridgewebs: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(BRIDGEWEBS_EVENTS, () =>
          HttpResponse.json({ result: { configured: false, events: [] } }),
        ),
      ],
    },
  },
};

/**
 * BridgeWebs configured with events for the day: a "Use BridgeWebs Event"
 * switch appears above the Event Name field. Turning it on swaps the Event Name
 * text field for a dropdown of the day's BridgeWebs events.
 */
export const WithBridgewebsEvents: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(BRIDGEWEBS_EVENTS, () =>
          HttpResponse.json({
            result: {
              configured: true,
              events: [
                { id: "1", title: "Monday Duplicate" },
                { id: "2", title: "Afternoon Teams" },
              ],
            },
          }),
        ),
      ],
    },
  },
};

/** Configured but no events for the chosen date: picker stays hidden. */
export const ConfiguredNoEvents: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(BRIDGEWEBS_EVENTS, () =>
          HttpResponse.json({ result: { configured: true, events: [] } }),
        ),
      ],
    },
  },
};

/**
 * The second step of the create flow: the "Next" button on step 1 advances to
 * the event type, scoring, and per-game toggles, with the primary action now
 * reading "Create Game". The play function clicks through from step 1.
 */
export const OptionsStep: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get(BRIDGEWEBS_EVENTS, () =>
          HttpResponse.json({ result: { configured: false, events: [] } }),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Next" }));
  },
};
