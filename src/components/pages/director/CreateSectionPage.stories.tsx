import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { fn } from "storybook/test";
import CreateSectionPage from "@/components/pages/director/CreateSectionPage";

const meta: Meta<typeof CreateSectionPage> = {
  title: "Pages/Director/CreateSectionPage",
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
      id: 1,
      eventId: 1,
      sessionName: "Session 1",
    },
    sections: [
      {
        id: crypto.randomUUID(),
        sessionId: 1,
        sectionName: "Section A",
        gameDb: crypto.randomUUID(),
        status: 'CREATED'
      },
      {
        id: crypto.randomUUID(),
        sessionId: 1,
        sectionName: "Section B",
        gameDb: crypto.randomUUID(),
        status: "CREATED"
      },
    ],
  },
};
