import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import SessionCard from "./SessionCard";
import { fn } from "storybook/test";

const meta: Meta<typeof SessionCard> = {
  title: "Director/Events/Session/SessionCard",
  component: SessionCard,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    onClick: fn(), // Logs clicks in Storybook Actions panel
  },
};

export default meta;

type Story = StoryObj<typeof SessionCard>;

export const Default: Story = {
  args: {
    session: {
      id: crypto.randomUUID(),
      eventId: "Monday AM Pairs",
      sessionName: "Session 1",
    },
  },
};
