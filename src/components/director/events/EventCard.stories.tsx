import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import EventCard from "./EventCard";
import { fn } from "storybook/test";

const meta: Meta<typeof EventCard> = {
  title: "Components/Director/Events/EventCard",
  component: EventCard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onClick: fn(),
  },
};

export default meta;

type Story = StoryObj<typeof EventCard>;

export const Default: Story = {
  args: {
    event: {
      eventName: "Monday AM Pairs",
      eventDate: new Date().toISOString(),
      director: "Jacqui Collier",
      eventType: "Pairs",
      createdAt: new Date().toISOString(),
    },
  },
};
