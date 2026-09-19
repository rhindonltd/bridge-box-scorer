import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { http, HttpResponse } from "msw";
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
