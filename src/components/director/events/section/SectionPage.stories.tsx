import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import SectionPage from "./SectionPage";
import { fn } from "storybook/test";

const meta: Meta<typeof SectionPage> = {
  title: "Director/Events/Section/SectionPage",
  component: SectionPage,
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

type Story = StoryObj<typeof SectionPage>;

export const Default: Story = {
  args: {
    session: {
      id: crypto.randomUUID(),
      eventId: "Monday AM Pairs",
      sessionName: "Session 1",
    },
    sections: [
      {
        id: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        sectionName: "Section A",
        started: false,
        finished: false,
      },
      {
        id: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        sectionName: "Section B",
        started: false,
        finished: false,
      },
    ],
  },
};
