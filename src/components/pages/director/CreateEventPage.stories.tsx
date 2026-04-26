import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import CreateEventPage from "@/components/pages/director/CreateEventPage";

const meta: Meta<typeof CreateEventPage> = {
  title: "Pages/Director/CreateEventPage",
  component: CreateEventPage,
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

type Story = StoryObj<typeof CreateEventPage>;

export const Default: Story = {
  args: {
    events: [
      {
        id: 1,
        eventName: "Monday PM Pairs",
        eventDate: new Date().toISOString(),
        director: "Jacqui Collier",
        eventType: "Pairs",
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        eventName: "Tuesday PM Pairs",
        eventDate: new Date().toISOString(),
        director: "Jacqui Collier",
        eventType: "Pairs",
        createdAt: new Date().toISOString(),
      },
    ],
  },
};
