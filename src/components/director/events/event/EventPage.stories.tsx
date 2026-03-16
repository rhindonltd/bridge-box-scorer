import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import EventPage from "./EventPage";
import { fn } from "storybook/test";

const meta: Meta<typeof EventPage> = {
  title: "Director/Events/Event/EventPage",
  component: EventPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onAdd: fn(),
    onClick: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof EventPage>;

export const Default: Story = {
  args: {
    events: [
      {
        id: crypto.randomUUID(),
        eventName: "Monday PM Pairs",
        eventDate: new Date().toISOString(),
        director: "Jacqui Collier",
        eventType: "Pairs",
        createdAt: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        eventName: "Tuesday PM Pairs",
        eventDate: new Date().toISOString(),
        director: "Jacqui Collier",
        eventType: "Pairs",
        createdAt: new Date().toISOString(),
      },
    ],
  },
};
