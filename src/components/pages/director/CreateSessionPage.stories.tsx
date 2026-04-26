import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import CreateSessionPage from "@/components/pages/director/CreateSessionPage";

const meta: Meta<typeof CreateSessionPage> = {
  title: "Pages/Director/CreateSessionPage",
  component: CreateSessionPage,
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

type Story = StoryObj<typeof CreateSessionPage>;

export const Default: Story = {
  args: {
    event: {
      id: 1,
      eventName: "Monday AM Pairs",
      eventDate: new Date().toISOString(),
      director: "Jacqui Collier",
      eventType: "Pairs",
      createdAt: new Date().toISOString(),
    },
    sessions: [
      {
        id: 1,
        eventId: 1,
        sessionName: "Session 1",
      },
      {
        id: 2,
        eventId: 1,
        sessionName: "Session 2",
      },
    ],
  },
};
