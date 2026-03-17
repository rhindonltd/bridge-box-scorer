import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import CreateSectionPage from "@/components/pages/director/CreateSectionPage";

const meta: Meta<typeof CreateSectionPage> = {
  title: "Pages/Director/Section/CreateSectionPage",
  component: CreateSectionPage,
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

type Story = StoryObj<typeof CreateSectionPage>;

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
