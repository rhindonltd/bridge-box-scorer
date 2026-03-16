import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import SessionPage from "@/components/director/events/session/SessionPage";

const meta: Meta<typeof SessionPage> = {
  title: "Director/Events/Session/SessionPage",
  component: SessionPage,
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

type Story = StoryObj<typeof SessionPage>;

export const Default: Story = {
  args: {
    event: {
      id: crypto.randomUUID(),
      eventName: "Monday AM Pairs",
      eventDate: new Date().toISOString(),
      director: "Jacqui Collier",
      eventType: "Pairs",
      createdAt: new Date().toISOString(),
    },
    sessions: [
      {
        id: crypto.randomUUID(),
        eventId: "Monday AM Pairs",
        sessionName: "Session 1",
      },
      {
        id: crypto.randomUUID(),
        eventId: "Monday AM Pairs",
        sessionName: "Session 2",
      },
    ],
  },
};
